# Jardin-Verger de Pardaillan — site

## Installation rapide (recommandé)

1. Téléchargez **jardin-verger-pardaillan.zip** (~87 Ko)
2. Décompressez le dossier
3. **Windows** : double-clic sur `demarrer.bat`
   **Mac/Linux** : `./demarrer.sh` ou :
   ```bash
   cd jardin-verger-pardaillan
   python3 -m http.server 8080
   ```
4. Ouvrez http://localhost:8080

> Ne pas ouvrir index.html en double-clic (le navigateur bloque parfois le chargement des données).

## Fichiers

- `index.html` — page principale (léger)
- `css/style.css` — styles
- `js/app.js` — application
- `js/data-slim.json` — espèces, photos, fiches

## Fiche test

http://localhost:8080/#espece/55847  (Fusain d'Europe)

## Crédits naturalistes
Les rôles écologiques et milieux de vie des fiches s'appuient, lorsque des pages existent, sur les contenus de **Jessica Joachim — Les carnets nature de Jessica** (https://jessica-joachim.com/), utilisés **avec son autorisation**, adaptés en français accessible pour le Jardin-Verger de Pardaillan.
Chaque fiche concernée affiche le lien vers la source.


## Modifier les fiches à la main (très simple)

1. Ouvrez le fichier **`js/fiches-personnelles.json`**
2. Cherchez l’espèce (Ctrl+F) : nom français ou latin
3. Modifiez les textes :
   - `intro` — présentation
   - `description` — comment la reconnaître
   - `milieu_de_vie` — où elle vit
   - `role_dans_la_nature` — son rôle dans le jardin
   - `habitat_court` — pastille courte (1 ligne)
4. Enregistrez (encodage **UTF-8**)
5. Rechargez la page du site (F5)

**Important :** ne modifiez pas `taxon_id` ni `nom_latin`.  
Ce fichier **écrase** les textes automatiques : c’est vous qui avez le dernier mot.

Astuce : gardez une copie de secours de `fiches-personnelles.json` avant de grandes modifications.


## Mettre à jour avec de nouvelles observations iNaturalist

Le site ne se synchronise **pas tout seul**. Après de nouvelles observations :

1. Identifiez-les sur le [projet iNaturalist](https://www.inaturalist.org/projects/296270)
2. Lancez **`mettre-a-jour.bat`** (Windows) ou **`./mettre-a-jour.sh`** (Mac/Linux)
3. Rechargez le site (Ctrl+F5)

Détails : voir **METTRE-A-JOUR-INAT.txt**

Les fiches déjà enrichies (textes, calendriers, statuts) sont **conservées**.
Seules les nouvelles espèces reçoivent une fiche de base à compléter.


## Enrichir les fiches (textes, statuts, calendriers)

Après une synchro iNat, lancez **`enrichir-fiches.bat`** (ou `./enrichir-fiches.sh`) :

1. Applique vos textes dans `js/fiches-personnelles.json`
2. Cherche une page Jessica Joachim (si disponible)
3. Complète avec Wikipédia FR
4. Remplit le reste avec des règles locales (guilde écologique, indigénat plantes…)

Voir **ENRICHIR-FICHES.txt**. Les champs déjà soignés ne sont pas écrasés.
