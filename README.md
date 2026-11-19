# Jardin-Verger de Pardaillan

Site de suivi de la biodiversité du jardin-verger au Touvet (Isère).

## Où modifier quoi

| Je veux changer…              | Je modifie…                    |
|-------------------------------|--------------------------------|
| La mise en page, les couleurs | `css/style.css`                |
| Le fonctionnement du site     | `js/app.js`                    |
| Le titre, la description, l'aperçu de partage | `index.html` |
| Mes textes sur les espèces    | `js/fiches-personnelles.json`  |

**`index.html` est volontairement minuscule** : il charge `css/style.css` et `js/app.js`.
Ne jamais y recopier du CSS, du JavaScript ou des données.

## Structure

- `index.html` — Page principale (léger)
- `css/style.css` — Styles (**seul endroit pour la mise en page**)
- `js/app.js` — Application
- `js/data-slim.json` — Données des espèces (générées depuis iNaturalist)
- `js/fiches-personnelles.json` — Fiches personnalisées
- `espece/` — Pages statiques par espèce (référencement)
- `outils/` — Scripts de mise à jour
- `og.jpg` — Image d'aperçu pour le partage (1200×630)
- `CNAME`, `LICENSE`

## Voir le site en local

```bash
./demarrer.sh        # Linux / Mac   (ou demarrer.bat sous Windows)
```
Puis ouvrir http://localhost:8080 et faire Ctrl+F5 après chaque modification.

## Mise à jour des observations iNaturalist

```bash
./mettre-a-jour.sh   # ou mettre-a-jour.bat sous Windows
```

## Version « fichier unique » (hors ligne)

`mettre-a-jour` génère aussi `dist/Jardin-Verger-Pardaillan.html`
(tout est intégré dans un seul fichier, ouvrable par double-clic).
Ce fichier est **généré** et n'est pas publié sur GitHub (`dist/` est ignoré).
Ne pas le téléverser à la place de `index.html`.

## Déploiement

GitHub Pages (branche `main`, dossier racine). Le domaine vient de `CNAME`.
Après une modification de `css/style.css` ou `js/app.js`, augmenter le numéro
`?v=` dans `index.html` (ex. `?v=4`) pour forcer les navigateurs à recharger.
