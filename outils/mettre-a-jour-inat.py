#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mettre à jour le site Jardin-Verger de Pardaillan avec les nouvelles
observations iNaturalist du projet.

Usage :
  python3 outils/mettre-a-jour-inat.py
  python3 outils/mettre-a-jour-inat.py --projet 296270
  python3 outils/mettre-a-jour-inat.py --dry-run

Ce script :
  1. Télécharge les observations du projet iNaturalist
  2. Met à jour compteurs, photos, observations récentes, stats
  3. Conserve vos fiches enrichies (rôles, calendriers, statuts…)
  4. Crée une fiche de base pour chaque NOUVELLE espèce
  5. Réécrit js/data-slim.json (sauvegarde .bak automatique)

Puis relancez demarrer.bat / demarrer.sh et Ctrl+F5 dans le navigateur.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ── Config projet ──────────────────────────────────────────────
DEFAULT_PROJECT_ID = 296270  # Jardin-Verger-de-Pardaillan
DEFAULT_PLACE_ID = 6753      # France (preferred_place for common names)
USER_LOGIN_PREF = "jean_michel_pougnet"  # photos prioritaires
API = "https://api.inaturalist.org/v1"
LOCALE = "fr"
USER_AGENT = "JardinVergerPardaillan/1.0 (site local; +iNaturalist project update)"

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "js" / "data-slim.json"

# ── HTTP ───────────────────────────────────────────────────────
def api_get(path: str, params: dict | None = None, retries: int = 3):
    params = dict(params or {})
    url = f"{API}/{path.lstrip('/')}?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"API error {url}: {last_err}")

def paged_results(path: str, params: dict, max_pages: int = 50, per_page: int = 200):
    page = 1
    while page <= max_pages:
        data = api_get(path, {**params, "page": page, "per_page": per_page})
        results = data.get("results") or []
        total = data.get("total_results", 0)
        yield from results
        if page * per_page >= total or not results:
            break
        page += 1
        time.sleep(0.35)  # rester poli avec l'API

# ── Helpers taxon / photos ─────────────────────────────────────
def fr_name(taxon: dict) -> str:
    if not taxon:
        return ""
    pref = taxon.get("preferred_common_name") or ""
    # sometimes english slips in — keep latin fallback
    return pref or taxon.get("name") or ""

def photo_urls(photo: dict | None) -> dict | None:
    if not photo:
        return None
    # open-data or attribution URL patterns
    url = photo.get("url") or ""
    if not url:
        return None
    # iNat square URLs: replace size token
    s = url
    m = url.replace("/square.", "/medium.").replace("square", "medium")
    if "/square" in url:
        m = url.replace("/square", "/medium")
    return {"s": s, "m": m}

def conservation_default(iconic: str) -> dict:
    if iconic in ("Insecta", "Arachnida", "Fungi"):
        return {
            "code": "NE", "label": "Non évaluée", "color": "#94a3b8",
            "authority": "Pas de statut UICN établi pour ce niveau",
            "place": "—", "status_name": "NE",
        }
    return {
        "code": "LC", "label": "Préoccupation mineure (indicatif)", "color": "#22c55e",
        "authority": "à confirmer (INPN / UICN)", "place": "France métropolitaine",
        "status_name": "LC", "url": "https://inpn.mnhn.fr",
    }

def statut_default(iconic: str, common: str, name: str) -> dict:
    if iconic == "Plantae":
        return {
            "label": "Présence locale",
            "detail": "Nouvelle plante du projet — préciser indigène / introduite / envahissante dans js/fiches-personnelles.json ou après relecture.",
            "source": "Nouvelle observation iNaturalist",
            "category": "local",
            "color": "#64748b",
        }
    if iconic == "Aves":
        return {
            "label": "Espèce protégée",
            "detail": "Oiseau : la plupart des espèces sont protégées en France (sauf gibier réglementé).",
            "source": "Protection des oiseaux",
            "category": "protegee",
            "color": "#7c3aed",
        }
    if iconic == "Amphibia":
        return {
            "label": "Espèce protégée",
            "detail": "Amphibien : espèces protégées en France.",
            "source": "Code de l'environnement",
            "category": "protegee",
            "color": "#7c3aed",
        }
    return {
        "label": "Présence locale",
        "detail": f"{common or name} observé(e) au Jardin-Verger de Pardaillan.",
        "source": "Inventaire local iNaturalist",
        "category": "local",
        "color": "#64748b",
    }

def pheno_default(iconic: str) -> list:
    if iconic == "Plantae":
        return [
            {"label": "Feuillaison", "start": 3, "end": 10, "color": "#84cc16"},
            {"label": "Floraison", "start": 5, "end": 8, "color": "#5c820d"},
            {"label": "Fructification", "start": 7, "end": 10, "color": "#b45309"},
        ]
    if iconic == "Fungi":
        return [{"label": "Fructification (carpophores)", "start": 8, "end": 11, "color": "#a16207"}]
    if iconic == "Aves":
        return [
            {"label": "Présence", "start": 1, "end": 12, "color": "#0284c7"},
            {"label": "Nidification", "start": 4, "end": 7, "color": "#a16207"},
        ]
    if iconic in ("Insecta", "Arachnida"):
        return [{"label": "Adultes visibles", "start": 4, "end": 10, "color": "#5c820d"}]
    return [{"label": "Période d'observation", "start": 3, "end": 10, "color": "#5c820d"}]

def empty_fiche(taxon_id, name, common, iconic) -> dict:
    return {
        "taxon_id": int(taxon_id),
        "name": name,
        "common": common or name,
        "iconic": iconic or "",
        "intro": f"{common or name} ({name}) est une espèce recensée dans le Jardin-Verger de Pardaillan.",
        "description": "Description à compléter (fiches-personnelles.json ou prochaine enrichment).",
        "milieu_de_vie": "Milieu de vie à préciser.",
        "ecologie": "Rôle dans la nature à préciser.",
        "habitat_court": "",
        "role_source": None,
        "statut_local": statut_default(iconic or "", common or "", name or ""),
        "conservation": conservation_default(iconic or ""),
        "phenologie": pheno_default(iconic or ""),
        "ranks": [],
        "premiere_obs": None,
        "derniere_obs": None,
        "periode_obs": None,
        "count": 0,
        "photos": [],
    }

# ── Main update ────────────────────────────────────────────────
def fetch_project_observations(project_id: int):
    print(f"→ Téléchargement des observations du projet {project_id}…")
    obs = list(paged_results(
        "observations",
        {
            "project_id": project_id,
            "locale": LOCALE,
            "preferred_place_id": DEFAULT_PLACE_ID,
            "order_by": "observed_on",
            "order": "desc",
            "quality_grade": "any",
        },
    ))
    print(f"  {len(obs)} observation(s)")
    return obs

def fetch_species_counts(project_id: int):
    print("→ Comptages par espèce (species_counts)…")
    # species_counts is on observations endpoint
    data = api_get("observations/species_counts", {
        "project_id": project_id,
        "locale": LOCALE,
        "preferred_place_id": DEFAULT_PLACE_ID,
        "per_page": 500,
    })
    results = data.get("results") or []
    print(f"  {len(results)} taxon(s)")
    return results

def build_update(project_id: int, existing: dict) -> dict:
    obs = fetch_project_observations(project_id)
    counts = fetch_species_counts(project_id)

    # Index existing
    old_fiches = existing.get("fiches") or {}
    old_species_by_id = {str(s["taxon_id"]): s for s in existing.get("species") or []}

    # Aggregate per taxon from observations
    by_taxon = defaultdict(lambda: {
        "count": 0,
        "obs_ids": [],
        "dates": [],
        "photos": [],  # list of {s,m,obs_id,user}
        "iconic": "",
        "name": "",
        "common": "",
        "taxon": None,
    })

    for o in obs:
        taxon = o.get("taxon") or {}
        tid = taxon.get("id")
        if not tid:
            continue
        # Ignorer les IDs trop grossiers (règne / classe / ordre / famille)
        # rank_level iNat : 70=kingdom … 10=genus, 5=species
        rank_level = taxon.get("rank_level")
        rank = (taxon.get("rank") or "").lower()
        if rank_level is not None and rank_level > 10 and rank not in ("genus", "species", "subspecies", "variety", "form", "hybrid"):
            # garder seulement genre et plus fin
            if rank_level > 20:  # family=30, order=40, etc.
                continue
        tid = str(tid)
        entry = by_taxon[tid]
        entry["count"] += 1
        entry["obs_ids"].append(o.get("id"))
        entry["taxon"] = taxon
        entry["name"] = taxon.get("name") or entry["name"]
        entry["common"] = fr_name(taxon) or entry["common"]
        entry["iconic"] = taxon.get("iconic_taxon_name") or entry["iconic"]
        d = o.get("observed_on") or o.get("time_observed_at") or ""
        if d:
            entry["dates"].append(d[:10])
        user = (o.get("user") or {}).get("login") or ""
        for ph in (o.get("photos") or [])[:3]:
            urls = photo_urls(ph)
            if urls:
                entry["photos"].append({
                    **urls,
                    "obs_id": o.get("id"),
                    "user": user,
                    "from_owner": user == USER_LOGIN_PREF,
                })

    # Prefer species_counts for official count when available
    count_map = {}
    for row in counts:
        t = row.get("taxon") or {}
        if t.get("id"):
            count_map[str(t["id"])] = {
                "count": row.get("count") or 0,
                "taxon": t,
            }

    # Build species list
    species = []
    new_taxa = []
    all_tids = set(by_taxon.keys()) | set(count_map.keys()) | set(old_fiches.keys())

    def too_coarse(taxon, tid):
        if tid in old_fiches:
            return False  # garder l'existant
        rl = taxon.get("rank_level")
        if rl is None:
            return False
        return rl > 20  # au-dessus du genre

    for tid in sorted(all_tids, key=lambda x: -int((count_map.get(x) or {}).get("count") or by_taxon[x]["count"] or 0)):
        agg = by_taxon.get(tid)
        cm = count_map.get(tid)
        taxon = (cm or {}).get("taxon") or (agg or {}).get("taxon") or {}
        if too_coarse(taxon, tid) and tid not in by_taxon:
            continue
        if too_coarse(taxon, tid) and not (agg or {}).get("count"):
            continue
        if too_coarse(taxon, tid):
            # skip brand-new family-level "species"
            if tid not in old_fiches:
                continue
        name = taxon.get("name") or (agg or {}).get("name") or (old_fiches.get(tid) or {}).get("name") or ""
        common = fr_name(taxon) or (agg or {}).get("common") or (old_fiches.get(tid) or {}).get("common") or name
        iconic = taxon.get("iconic_taxon_name") or (agg or {}).get("iconic") or (old_fiches.get(tid) or {}).get("iconic") or ""
        count = (cm or {}).get("count") or (agg or {}).get("count") or 0
        if count == 0 and tid not in by_taxon:
            # keep old count if still in fiches from previous export
            count = (old_species_by_id.get(tid) or {}).get("count") or (old_fiches.get(tid) or {}).get("count") or 0

        # Choose best photo: prefer owner, then any
        photos = (agg or {}).get("photos") or []
        owner_photos = [p for p in photos if p.get("from_owner")]
        pick = (owner_photos or photos or [None])[0]
        photo = None
        photo_from_owner = False
        obs_id = None
        if pick:
            photo = {"s": pick["s"], "m": pick["m"]}
            photo_from_owner = bool(pick.get("from_owner"))
            obs_id = pick.get("obs_id")
        elif tid in old_species_by_id and old_species_by_id[tid].get("photo"):
            photo = old_species_by_id[tid]["photo"]
            photo_from_owner = old_species_by_id[tid].get("photo_from_owner", False)
            obs_id = old_species_by_id[tid].get("obs_id")

        # skip empty ghosts with no obs and no old fiche
        if count == 0 and tid not in old_fiches and tid not in by_taxon:
            continue

        species.append({
            "taxon_id": int(tid),
            "name": name,
            "common": common,
            "iconic": iconic,
            "count": int(count),
            "photo_from_owner": photo_from_owner,
            "obs_id": obs_id,
            "photo": photo,
        })

    # Recent observations (20)
    recent = []
    for o in obs[:20]:
        taxon = o.get("taxon") or {}
        ph = (o.get("photos") or [None])[0]
        urls = photo_urls(ph) if ph else None
        recent.append({
            "id": o.get("id"),
            "taxon_id": taxon.get("id"),
            "name": taxon.get("name"),
            "common": fr_name(taxon),
            "observed_on": (o.get("observed_on") or "")[:10],
            "photo": urls,
            "user": (o.get("user") or {}).get("login"),
            "url": f"https://www.inaturalist.org/observations/{o.get('id')}",
        })

    # Stats
    observers = Counter()
    iconic_counts = Counter()
    for o in obs:
        login = (o.get("user") or {}).get("login")
        if login:
            observers[login] += 1
        t = o.get("taxon") or {}
        ic = t.get("iconic_taxon_name")
        if ic:
            iconic_counts[ic] += 1

    stats = {
        "observations": len(obs),
        "species": len(species),
        "observers": len(observers),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "project_id": project_id,
        "project_url": f"https://www.inaturalist.org/projects/{project_id}",
    }

    iconic = [{"name": k, "count": v} for k, v in iconic_counts.most_common()]

    # Fiches : conserver l'enrichissement, actualiser dates/counts/photos
    fiches = {}
    for sp in species:
        tid = str(sp["taxon_id"])
        old = old_fiches.get(tid)
        agg = by_taxon.get(tid) or {}
        dates = sorted(agg.get("dates") or [])
        premiere = dates[0] if dates else (old or {}).get("premiere_obs")
        derniere = dates[-1] if dates else (old or {}).get("derniere_obs")
        periode = None
        if premiere and derniere:
            try:
                m1 = int(premiere[5:7]); m2 = int(derniere[5:7])
                months = ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
                if premiere[:4] == derniere[:4] and m1 == m2:
                    periode = f"{months[m1]} {premiere[:4]}"
                else:
                    periode = f"{months[m1]} → {months[m2]}"
            except Exception:
                periode = f"{premiere} → {derniere}"

        if old:
            f = copy.deepcopy(old)
            # refresh live fields only
            f["name"] = sp["name"] or f.get("name")
            f["common"] = sp["common"] or f.get("common")
            f["iconic"] = sp["iconic"] or f.get("iconic")
            f["count"] = sp["count"]
            f["premiere_obs"] = premiere
            f["derniere_obs"] = derniere
            f["periode_obs"] = periode or f.get("periode_obs")
            # gallery: merge new photos (max 12)
            old_photos = f.get("photos") or []
            new_photos = []
            seen = set()
            for p in (agg.get("photos") or []) + old_photos:
                key = (p.get("m") or p.get("s") or "")
                if not key or key in seen:
                    continue
                seen.add(key)
                new_photos.append({"s": p.get("s"), "m": p.get("m"), "obs_id": p.get("obs_id"), "user": p.get("user")})
                if len(new_photos) >= 12:
                    break
            if new_photos:
                f["photos"] = new_photos
            fiches[tid] = f
        else:
            f = empty_fiche(tid, sp["name"], sp["common"], sp["iconic"])
            f["count"] = sp["count"]
            f["premiere_obs"] = premiere
            f["derniere_obs"] = derniere
            f["periode_obs"] = periode
            f["photos"] = [
                {"s": p.get("s"), "m": p.get("m"), "obs_id": p.get("obs_id"), "user": p.get("user")}
                for p in (agg.get("photos") or [])[:8]
            ]
            fiches[tid] = f
            new_taxa.append(f"{f['common']} ({f['name']})")

    # Map unchanged
    out = {
        "map": existing.get("map") or {
            "lat": 45.3381, "lon": 5.9506,
            "label": "Jardin-Verger de Pardaillan — Le Touvet",
        },
        "stats": stats,
        "iconic": iconic,
        "recent": recent,
        "species": species,
        "fiches": fiches,
        "credits": existing.get("credits") or {
            "jessica": "https://jessica-joachim.com/",
            "inat": f"https://www.inaturalist.org/projects/{project_id}",
        },
    }
    return out, new_taxa

def main():
    ap = argparse.ArgumentParser(description="Mise à jour iNaturalist → data-slim.json")
    ap.add_argument("--projet", type=int, default=DEFAULT_PROJECT_ID, help="ID projet iNaturalist")
    ap.add_argument("--dry-run", action="store_true", help="Affiche le résumé sans écrire")
    ap.add_argument("--data", type=Path, default=DATA_PATH, help="Chemin data-slim.json")
    args = ap.parse_args()

    if not args.data.exists():
        print(f"Fichier introuvable : {args.data}", file=sys.stderr)
        sys.exit(1)

    existing = json.loads(args.data.read_text(encoding="utf-8"))
    old_n = len(existing.get("species") or [])
    old_obs = (existing.get("stats") or {}).get("observations")

    print(f"Données actuelles : {old_n} espèces, {old_obs} obs.")
    updated, new_taxa = build_update(args.projet, existing)

    print()
    print("═══ Résumé ═══")
    print(f"  Observations : {old_obs} → {updated['stats']['observations']}")
    print(f"  Espèces      : {old_n} → {updated['stats']['species']}")
    print(f"  Observateurs : {updated['stats']['observers']}")
    print(f"  Nouvelles espèces : {len(new_taxa)}")
    for t in new_taxa[:30]:
        print(f"    + {t}")
    if len(new_taxa) > 30:
        print(f"    … et {len(new_taxa)-30} autres")

    if args.dry_run:
        print("\n(dry-run) Aucun fichier écrit.")
        return

    bak = args.data.with_suffix(".json.bak")
    bak.write_text(args.data.read_text(encoding="utf-8"), encoding="utf-8")
    args.data.write_text(
        json.dumps(updated, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"\n✓ Sauvegarde : {bak.name}")
    print(f"✓ Écrit      : {args.data.relative_to(ROOT)}")
    print()
    print("Prochaines étapes :")
    print("  1. Relancer demarrer.bat / demarrer.sh")
    print("  2. Ctrl+F5 dans le navigateur")
    print("  3. Pour les NOUVELLES espèces : compléter rôle / statut / calendrier")
    print("     dans js/fiches-personnelles.json (voir MODIFIER-LES-FICHES.txt)")
    print()
    print("Optionnel — régénérer le HTML unique :")
    print("  python3 outils/construire-html-unique.py")

if __name__ == "__main__":
    main()
