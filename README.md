# Jardin-Verger de Pardaillan

Site de suivi de la biodiversité du jardin-verger au Touvet (Isère).

## Structure

- `index.html` — Page principale
- `espece/` — Pages statiques par espèce (référencement)
- `css/style.css` — Styles
- `js/app.js` — Application
- `js/data-slim.json` — Données des espèces
- `js/fiches-personnelles.json` — Fiches personnalisées
- `outils/` — Scripts de mise à jour
- `CNAME` — Domaine
- `LICENSE` — Licence MIT
- `og.jpg` — Image Open Graph (1200×630, à ajouter)

## Mise à jour des observations iNaturalist

```bash
# Linux / Mac
./mettre-a-jour.sh

# Windows
mettre-a-jour.bat
```

Ou directement :
```bash
python3 outils/mettre-a-jour-inat.py
```

## Enrichir les fiches

```bash
# Linux / Mac
./enrichir-fiches.sh

# Windows
enrichir-fiches.bat
```

Ou :
```bash
python3 outils/enrichir-fiches.py
```

## Déploiement

1. Uploadez tous les fichiers à la racine du dépôt GitHub
2. Activez GitHub Pages (branche main, dossier racine)
3. Le domaine est configuré via CNAME

## Accessibilité

- Labels ARIA
- Textes alternatifs
- Titres de page dynamiques
- Pages statiques par espèce
- Support noscript
