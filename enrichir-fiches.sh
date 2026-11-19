#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "=== Enrichissement des fiches ==="
python3 outils/enrichir-fiches.py "$@"
python3 outils/construire-html-unique.py || true
echo "Terminé. Ctrl+F5 dans le navigateur."
