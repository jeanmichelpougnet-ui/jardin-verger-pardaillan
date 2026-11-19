#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "=== Mise à jour iNaturalist ==="
python3 outils/mettre-a-jour-inat.py "$@"
echo
echo "Reconstruction du HTML unique..."
python3 outils/construire-html-unique.py || true
echo
echo "Terminé. Relancez ./demarrer.sh puis Ctrl+F5."
