#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrichir les fiches d'espèces (nouvelles ou incomplètes).

Usage :
  python3 outils/enrichir-fiches.py
  python3 outils/enrichir-fiches.py --seulement-nouvelles
  python3 outils/enrichir-fiches.py --taxon 56002
  python3 outils/enrichir-fiches.py --dry-run
  python3 outils/enrichir-fiches.py --sans-web

Sources (dans l'ordre) :
  1. js/fiches-personnelles.json  (vos textes manuels — toujours prioritaires)
  2. Pages Jessica Joachim         (si une page fiable existe)
  3. Résumé Wikipédia FR           (intro / description courte)
  4. Règles locales                (statut plantes, phénologie type, conservation)

N'écrase JAMAIS un champ déjà rempli et non générique, sauf avec --force.
"""

from __future__ import annotations

import argparse
import html as htmllib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "js" / "data-slim.json"
PERSO = ROOT / "js" / "fiches-personnelles.json"
UA = "JardinVergerPardaillan/1.0 (enrichissement fiches; usage personnel)"

GENERIC_MARKERS = (
    "à compléter",
    "à préciser",
    "rôle dans la nature à préciser",
    "milieu de vie à préciser",
    "description à compléter",
    "consultez inaturalist",
    "espèce recensée dans le jardin-verger",
    "statut d'indigénat à préciser",
    "présence locale",
    "nouvelle plante du projet",
)

# ── HTTP ───────────────────────────────────────────────────────
def get_json(url: str, timeout: int = 25):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", errors="replace"))

def get_text(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")

def is_generic(text: str | None) -> bool:
    if not text or not str(text).strip():
        return True
    t = str(text).strip().lower()
    if len(t) < 40:
        return True
    return any(m in t for m in GENERIC_MARKERS)

def clean_html(s: str) -> str:
    s = re.sub(r"(?is)<script.*?>.*?</script>", " ", s)
    s = re.sub(r"(?is)<style.*?>.*?</style>", " ", s)
    s = re.sub(r"(?is)<[^>]+>", " ", s)
    s = htmllib.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def first_sentences(text: str, max_chars: int = 420) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    # finir sur un point si possible
    for sep in (". ", "… ", "! ", "? "):
        i = cut.rfind(sep)
        if i > 120:
            return cut[: i + 1].strip()
    return cut.rsplit(" ", 1)[0] + "…"

# ── Wikipédia FR ───────────────────────────────────────────────
def wiki_summary(latin: str) -> dict | None:
    if not latin:
        return None
    title = latin.replace(" ", "_")
    url = f"https://fr.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    try:
        data = get_json(url)
    except Exception:
        # essai recherche
        try:
            q = urllib.parse.quote(latin)
            search = get_json(
                f"https://fr.wikipedia.org/w/api.php?action=opensearch&search={q}&limit=1&namespace=0&format=json"
            )
            if len(search) > 1 and search[1]:
                title = search[1][0].replace(" ", "_")
                data = get_json(
                    f"https://fr.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
                )
            else:
                return None
        except Exception:
            return None
    if data.get("type") == "disambiguation":
        return None
    extract = (data.get("extract") or "").strip()
    if not extract or len(extract) < 40:
        return None
    return {
        "title": data.get("title"),
        "extract": extract,
        "url": (data.get("content_urls") or {}).get("desktop", {}).get("page")
        or f"https://fr.wikipedia.org/wiki/{title}",
    }

# ── Jessica Joachim (best-effort slug match) ───────────────────
def slugify_latin(name: str) -> str:
    s = name.lower().strip()
    s = (s.replace("é", "e").replace("è", "e").replace("ê", "e")
           .replace("à", "a").replace("â", "a").replace("ù", "u")
           .replace("ô", "o").replace("î", "i").replace("ç", "c"))
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def jessica_candidates(latin: str, common: str) -> list[str]:
    lat = slugify_latin(latin)
    parts = lat.split("-")
    cands = []
    if len(parts) >= 2:
        # euonymus-europaeus style
        cands.append(f"{parts[0]}-{parts[1]}")
        cands.append(f"{'-'.join(parts)}")
    if common:
        c = slugify_latin(common)
        cands.append(c)
        cands.append(f"{c}-{lat}")
        if len(parts) >= 2:
            cands.append(f"{c}-{parts[0]}-{parts[1]}")
    # known map for frequent garden species (extend over time)
    KNOWN = {
        "euonymus europaeus": "especes_vegetaux_feuillus-plantes-a-fleurs_celastraceae_fusain-deurope-euonymus-europaeus",
        "dipsacus fullonum": "especes_vegetaux_herbecees_dipsacaceae_cardere-sauvage-dipsacus-fullonum",
        "cetonia aurata": "insectes_coleopteres_scarabaeidae_cetoine-doree-cetonia-aurata",
        "rana temporaria": "amphibiens_grenouille-rousse-rana-temporaria",
        "maniola jurtina": "insectes_lepidopteres_nymphalidae_myrtil-maniola-jurtina",
        "pararge aegeria": "insectes_lepidopteres_nymphalidae_tircis",
        "vanessa cardui": "insectes_lepidopteres_nymphalidae_belle-dame",
        "pyronia tithonus": "insectes_lepidopteres_nymphalidae_amaryllis",
        "zoropsis spinimana": "araignees_zoropsis-spinimana",
        "erinaceus europaeus": "mammiferes_herisson-deurope-erinaceus-europaeus",
        "apis mellifera": "insectes_hymenopteres_apidae_abeille-domestique-apis-mellifera",
        "coreus marginatus": "insectes_heteropteres_coreidae_coree-margine-coreus-marginatus",
        "graphosoma italicum": "insectes_heteropteres_pentatomidae_graphosome-ditalie-graphosoma-italicum",
    }
    key = (latin or "").lower().strip()
    if key in KNOWN:
        cands.insert(0, KNOWN[key])
    # unique preserve order
    seen, out = set(), []
    for c in cands:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out

def fetch_jessica(latin: str, common: str) -> dict | None:
    base = "https://jessica-joachim.com/"
    for slug in jessica_candidates(latin, common)[:8]:
        for path in (slug, f"identification/{slug}", f"especes/{slug}"):
            url = base + path.strip("/") + "/"
            try:
                raw = get_text(url)
            except Exception:
                continue
            if "Page non trouvée" in raw or "404" in raw[:200]:
                continue
            # extract entry-content-ish
            m = re.search(r'(?is)<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>(.*?)</div>\s*(?:<footer|<!--)', raw)
            body = m.group(1) if m else raw
            text = clean_html(body)
            if len(text) < 200:
                continue
            # sections
            habitat = ""
            for lab in ("Habitat", "Milieu", "Biotope"):
                mm = re.search(lab + r"\s*[:|]\s*(.{40,400}?)(?:\s{2,}|Répartition|Biologie|Régime|$)", text)
                if mm:
                    habitat = mm.group(1).strip()
                    break
            role = ""
            for lab in ("Réseau trophique", "Rôle", "Régime", "Biologie"):
                mm = re.search(lab + r"\s*[:|]\s*(.{40,500}?)(?:\s{2,}|Habitat|Répartition|Sources|$)", text)
                if mm:
                    role = mm.group(1).strip()
                    break
            if not habitat and not role:
                # fallback: take a middle chunk
                role = first_sentences(text[200:900], 380)
            return {
                "url": url,
                "habitat": first_sentences(habitat, 320) if habitat else "",
                "role": first_sentences(role, 380) if role else "",
                "raw_len": len(text),
            }
        time.sleep(0.2)
    return None

# ── Règles locales (statut / phénologie) ───────────────────────
C = {
    "floraison": "#5c820d", "fructif": "#b45309", "feuilles": "#84cc16",
    "vol": "#5c820d", "presence": "#0284c7", "nidif": "#a16207",
    "champi": "#a16207", "active": "#2563eb", "hiver": "#64748b",
}

PLANT_ORIGIN = {
    # indigène
    "euonymus europaeus": "indigene", "dipsacus fullonum": "indigene",
    "rosa canina": "indigene", "viburnum opulus": "indigene", "viburnum lantana": "indigene",
    "filipendula ulmaria": "indigene", "eupatorium cannabinum": "indigene",
    "symphytum officinale": "indigene", "hypericum perforatum": "indigene",
    "ajuga reptans": "indigene", "lythrum salicaria": "indigene",
    "malva sylvestris": "indigene", "clematis vitalba": "indigene",
    "rubus caesius": "indigene", "equisetum arvense": "indigene",
    "equisetum telmateia": "indigene", "carex pendula": "indigene",
    "cirsium arvense": "indigene", "arctium minus": "indigene",
    "tanacetum vulgare": "indigene", "verbena officinalis": "indigene",
    "agrimonia eupatoria": "indigene", "agrimonia procera": "indigene",
    "holcus lanatus": "indigene", "medicago lupulina": "indigene",
    "persicaria maculosa": "indigene", "pulicaria dysenterica": "indigene",
    "mentha suaveolens": "indigene", "epilobium parviflorum": "indigene",
    "lysimachia arvensis": "indigene", "utricularia australis": "indigene",
    "quercus": "indigene",
    # envahissante
    "solidago gigantea": "envahissante", "sorghum halepense": "envahissante",
    # introduite
    "paulownia tomentosa": "introduite", "ficus carica": "introduite",
    "aronia arbutifolia": "introduite", "oenothera villosa": "introduite",
    "oenothera": "introduite",
    "symphyotrichum novi-belgii": "introduite", "symphyotrichum puniceum": "introduite",
    "pyrus": "introduite",
}

def statut_from_origin(kind: str, common: str, name: str) -> dict:
    if kind == "indigene":
        return {
            "label": "Indigène",
            "detail": f"{common or name} : espèce naturellement présente en France métropolitaine.",
            "source": "Flore de France (indicatif)",
            "category": "indigene",
            "color": "#16a34a",
        }
    if kind == "envahissante":
        return {
            "label": "Envahissante",
            "detail": f"{common or name} : espèce exotique pouvant s’étendre au détriment des milieux locaux.",
            "source": "Espèces exotiques envahissantes (indicatif)",
            "category": "envahissante",
            "color": "#dc2626",
        }
    if kind == "introduite":
        return {
            "label": "Introduite / importée",
            "detail": f"{common or name} : origine étrangère, plantée, cultivée ou naturalisée en France.",
            "source": "Statut d’indigénat (indicatif)",
            "category": "introduite",
            "color": "#d97706",
        }
    return {
        "label": "Présence locale",
        "detail": "Observé au Jardin-Verger de Pardaillan — statut d’indigénat à confirmer.",
        "source": "Inventaire local",
        "category": "local",
        "color": "#64748b",
    }

def pheno_for(iconic: str, name: str) -> list:
    n = (name or "").lower()
    if iconic == "Plantae":
        return [
            {"label": "Feuillaison", "start": 3, "end": 10, "color": C["feuilles"]},
            {"label": "Floraison", "start": 5, "end": 8, "color": C["floraison"]},
            {"label": "Fructification", "start": 7, "end": 10, "color": C["fructif"]},
        ]
    if iconic == "Fungi":
        return [{"label": "Fructification (carpophores)", "start": 8, "end": 11, "color": C["champi"]}]
    if iconic == "Aves":
        return [
            {"label": "Présence", "start": 1, "end": 12, "color": C["presence"]},
            {"label": "Nidification", "start": 4, "end": 7, "color": C["nidif"]},
        ]
    if iconic == "Mammalia" and "erinaceus" in n:
        return [
            {"label": "Actif", "start": 3, "end": 10, "color": C["active"]},
            {"label": "Hibernation", "start": 11, "end": 12, "color": C["hiver"]},
            {"label": "Hibernation", "start": 1, "end": 2, "color": C["hiver"]},
        ]
    if iconic in ("Insecta", "Arachnida"):
        return [{"label": "Adultes visibles", "start": 4, "end": 10, "color": C["vol"]}]
    if iconic == "Amphibia":
        return [
            {"label": "Actifs / observables", "start": 2, "end": 11, "color": C["active"]},
            {"label": "Reproduction", "start": 2, "end": 4, "color": C["nidif"]},
        ]
    return [{"label": "Période d'observation", "start": 3, "end": 10, "color": C["vol"]}]

def conservation_for(iconic: str, statut_cat: str | None) -> dict:
    if statut_cat in ("envahissante", "introduite") and iconic == "Plantae":
        return {
            "code": "NA", "label": "Hors liste rouge des espèces indigènes",
            "color": "#64748b", "authority": "Espèce non indigène",
            "place": "France métropolitaine", "status_name": "NA",
        }
    if iconic in ("Insecta", "Arachnida", "Fungi"):
        return {
            "code": "NE", "label": "Non évaluée", "color": "#94a3b8",
            "authority": "Pas de statut UICN établi pour ce niveau",
            "place": "—", "status_name": "NE",
        }
    return {
        "code": "LC", "label": "Préoccupation mineure (indicatif)", "color": "#22c55e",
        "authority": "à confirmer (INPN / UICN)", "place": "France métropolitaine",
        "status_name": "LC",
    }

def guild_role(iconic: str, name: str, common: str) -> str:
    n = (name or "").lower()
    c = (common or "").lower()
    if iconic == "Plantae":
        return (
            f"{common or name} produit nectar, pollen et/ou graines utiles aux insectes et oiseaux du jardin. "
            "Elle participe à la structure du milieu (couvert, racines, litière)."
        )
    if iconic == "Aves":
        return f"{common or name} participe à la régulation des insectes et/ou à la dispersion des graines selon son régime."
    if iconic == "Mammalia":
        return f"{common or name} contribue à l’équilibre du jardin (proies, seed bank, limaces selon l’espèce)."
    if iconic == "Amphibia":
        return f"{common or name} se nourrit d’invertébrés ; indicateur de mares et de zones humides de qualité."
    if iconic == "Fungi":
        return f"{common or name} décompose la matière organique ou vit en symbiose ; maillon clé du sol et du bois mort."
    if iconic == "Arachnida":
        return f"{common or name} prédatrice d’insectes ; utile à la régulation naturelle dans haies et lisières."
    # insects
    if any(x in n for x in ("apis", "bombus", "halictus", "andrena", "anthophila")):
        return f"{common or name} : pollinisateur important des fleurs du jardin et des cultures proches."
    if any(x in n for x in ("coccin", "psyllobora", "Harmonia".lower())) or "coccinelle" in c:
        return f"{common or name} : auxiliaire qui limite pucerons et parfois champignons sur les feuilles."
    if any(x in n for x in ("syrph", "episyrphus", "sphaerophoria")):
        return f"{common or name} : adulte pollinisateur ; larves souvent prédatrices de pucerons."
    if any(x in n for x in ("vanessa", "maniola", "pararge", "pyronia", "coenonympha", "lycaena", "pieris")):
        return f"{common or name} : papillon pollinisateur ; chenilles liées à des plantes hôtes précises."
    if any(x in n for x in ("graphosoma", "coreus", "nezara", "eurydema", "carpocoris")):
        return f"{common or name} : punaise phytophage, maillon du réseau trophique des friches et haies."
    if any(x in n for x in ("aeshna", "libellula", "orthetrum", "crocothemis")):
        return f"{common or name} : libellule prédatrice (adultes aériens, larves aquatiques) — signe d’eau de qualité."
    if "cetonia" in n:
        return f"{common or name} : adulte floricole ; larves décomposent bois mort / terreau (recyclage)."
    return (
        f"{common or name} fait partie de la faune locale du verger-jardin : proie ou prédateur selon le stade, "
        "indicateur de diversité des micro-habitats (haies, friches, sol nu, fleurs)."
    )

def guild_milieu(iconic: str) -> str:
    return {
        "Plantae": "Haies, lisières, prairies, friches ou zones cultivées selon l’espèce — à affiner localement.",
        "Insecta": "Fleurs, haies, lisières, bois mort, sol nu ou zones humides selon le groupe.",
        "Arachnida": "Haies, feuillage, murs, litière ou abris selon l’espèce.",
        "Aves": "Haies, arbres fruitiers, lisières et jardins avec abri et nourriture.",
        "Mammalia": "Haies, tas de feuilles, lisières, jardins peu traités.",
        "Amphibia": "Mares, ornières, zones humides et abords forestiers.",
        "Fungi": "Bois mort, litière, sol humide ou racines selon le mode de vie.",
    }.get(iconic or "", "Milieux du Jardin-Verger de Pardaillan (à préciser).")

# ── Merge helpers ──────────────────────────────────────────────
def fill_if(f: dict, key: str, value, force: bool = False):
    if value is None or value == "":
        return False
    cur = f.get(key)
    if force or is_generic(cur if isinstance(cur, str) else None) or cur in (None, "", [], {}):
        # for dict fields (statut, conservation)
        if isinstance(value, (dict, list)):
            if force or not cur or (isinstance(cur, dict) and is_generic(cur.get("detail") or cur.get("label") or "")):
                f[key] = value
                return True
            return False
        f[key] = value
        return True
    return False

def apply_perso(f: dict, perso: dict) -> int:
    n = 0
    mapping = {
        "intro": "intro",
        "description": "description",
        "milieu_de_vie": "milieu_de_vie",
        "role_dans_la_nature": "ecologie",
        "ecologie": "ecologie",
        "habitat_court": "habitat_court",
    }
    for pk, fk in mapping.items():
        if pk in perso and perso[pk]:
            f[fk] = perso[pk]
            n += 1
    if "statut_local" in perso and perso["statut_local"]:
        f["statut_local"] = perso["statut_local"]
        n += 1
    if "conservation" in perso and perso["conservation"]:
        f["conservation"] = perso["conservation"]
        n += 1
    if "phenologie" in perso and perso["phenologie"]:
        f["phenologie"] = perso["phenologie"]
        n += 1
    if "role_source" in perso:
        f["role_source"] = perso["role_source"]
        n += 1
    return n

def enrich_one(f: dict, perso_all: dict, use_web: bool, force: bool) -> list[str]:
    actions = []
    tid = str(f.get("taxon_id") or "")
    name = f.get("name") or ""
    common = f.get("common") or name
    iconic = f.get("iconic") or ""
    key_latin = name.lower().strip()

    # 1) personnel
    perso = perso_all.get(tid) or perso_all.get(name) or perso_all.get(common) or {}
    if isinstance(perso, dict) and perso:
        n = apply_perso(f, perso)
        if n:
            actions.append(f"perso×{n}")

    # 2) Jessica
    if use_web and (force or is_generic(f.get("ecologie")) or is_generic(f.get("milieu_de_vie"))):
        try:
            jj = fetch_jessica(name, common)
        except Exception:
            jj = None
        if jj:
            if jj.get("habitat") and fill_if(f, "milieu_de_vie", jj["habitat"], force):
                actions.append("jessica:milieu")
            if jj.get("role") and fill_if(f, "ecologie", jj["role"], force):
                actions.append("jessica:role")
                f["role_source"] = {
                    "label": "Jessica Joachim — Les carnets nature de Jessica",
                    "url": jj["url"],
                    "note": "avec autorisation",
                }
            time.sleep(0.25)

    # 3) Wikipédia
    if use_web and (force or is_generic(f.get("intro")) or is_generic(f.get("description"))):
        try:
            w = wiki_summary(name)
        except Exception:
            w = None
        if w:
            intro = first_sentences(w["extract"], 320)
            if fill_if(f, "intro", intro, force):
                actions.append("wiki:intro")
            if fill_if(f, "description", first_sentences(w["extract"], 480), force):
                actions.append("wiki:desc")
            f.setdefault("sources", [])
            if isinstance(f["sources"], list) and w["url"] not in f["sources"]:
                f["sources"].append(w["url"])
            time.sleep(0.15)

    # 4) Rôle / milieu de secours (guilde)
    if force or is_generic(f.get("ecologie")):
        if fill_if(f, "ecologie", guild_role(iconic, name, common), force=True):
            actions.append("guilde:role")
    if force or is_generic(f.get("milieu_de_vie")):
        if fill_if(f, "milieu_de_vie", guild_milieu(iconic), force=True):
            actions.append("guilde:milieu")
    if force or is_generic(f.get("intro")):
        intro = f"{common} ({name}) est présent(e) dans le Jardin-Verger de Pardaillan."
        if fill_if(f, "intro", intro, force=True):
            actions.append("intro:base")

    # 5) Statut plantes
    if iconic == "Plantae":
        origin = PLANT_ORIGIN.get(key_latin)
        if not origin:
            # genus
            genus = key_latin.split()[0] if key_latin else ""
            origin = PLANT_ORIGIN.get(genus)
        st = f.get("statut_local") or {}
        if force or is_generic(st.get("detail")) or st.get("label") in ("Présence locale", None, ""):
            if origin:
                f["statut_local"] = statut_from_origin(origin, common, name)
                actions.append(f"statut:{origin}")
            elif force or not st:
                f["statut_local"] = statut_from_origin("local", common, name)
                actions.append("statut:local")

    # 6) Conservation if weak
    cons = f.get("conservation") or {}
    if force or not cons or cons.get("authority", "").startswith("à confirmer") or cons.get("code") in (None, ""):
        cat = (f.get("statut_local") or {}).get("category")
        f["conservation"] = conservation_for(iconic, cat)
        actions.append("cons")

    # 7) Phénologie si absente / trop générique unique bar without label variety
    ph = f.get("phenologie")
    if force or not ph:
        f["phenologie"] = pheno_for(iconic, name)
        actions.append("pheno")

    return actions

def main():
    ap = argparse.ArgumentParser(description="Enrichir les fiches d'espèces")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="Réécrire même les champs déjà remplis")
    ap.add_argument("--sans-web", action="store_true", help="Pas Jessica / Wikipédia (hors ligne)")
    ap.add_argument("--seulement-nouvelles", action="store_true",
                    help="Uniquement fiches encore génériques")
    ap.add_argument("--taxon", type=str, help="Un taxon_id seulement")
    ap.add_argument("--limit", type=int, default=0, help="Max fiches à traiter (0 = toutes)")
    args = ap.parse_args()

    if not DATA.exists():
        print(f"Introuvable: {DATA}", file=sys.stderr)
        sys.exit(1)

    data = json.loads(DATA.read_text(encoding="utf-8"))
    perso_all = {}
    if PERSO.exists():
        try:
            perso_all = json.loads(PERSO.read_text(encoding="utf-8"))
            # allow {"fiches": {...}} wrapper
            if isinstance(perso_all.get("fiches"), dict):
                perso_all = perso_all["fiches"]
        except Exception as e:
            print("Attention fiches-personnelles.json:", e)
            perso_all = {}

    fiches = data.get("fiches") or {}
    targets = []
    for tid, f in fiches.items():
        if args.taxon and str(tid) != str(args.taxon) and str(f.get("taxon_id")) != str(args.taxon):
            continue
        if args.seulement_nouvelles:
            if not (is_generic(f.get("ecologie")) or is_generic(f.get("intro")) or is_generic(f.get("milieu_de_vie"))):
                continue
        targets.append((tid, f))

    if args.limit:
        targets = targets[: args.limit]

    print(f"Fiches à examiner : {len(targets)} / {len(fiches)}")
    use_web = not args.sans_web
    changed = 0
    report = []

    for tid, f in targets:
        acts = enrich_one(f, perso_all, use_web=use_web, force=args.force)
        if acts:
            changed += 1
            label = f.get("common") or f.get("name") or tid
            report.append(f"  • {label}: {', '.join(acts)}")
            print(f"✓ {label} ← {', '.join(acts)}")
        else:
            print(f"· {f.get('common') or tid} (déjà complet)")

    print()
    print(f"Enrichies : {changed}")
    if args.dry_run:
        print("(dry-run) rien d’écrit")
        return

    bak = DATA.with_suffix(".json.bak")
    bak.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")  # prettier bak optional
    # write compact for site
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"✓ {DATA.relative_to(ROOT)}")
    print(f"✓ sauvegarde {bak.name}")
    print()
    print("Ensuite :")
    print("  python3 outils/construire-html-unique.py")
    print("  puis Ctrl+F5 sur le site")

if __name__ == "__main__":
    main()
