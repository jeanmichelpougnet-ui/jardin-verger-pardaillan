#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construit une version « fichier unique » du site (utile hors ligne, en double-clic).

Le fichier produit est  dist/Jardin-Verger-Pardaillan.html .
Il est GÉNÉRÉ à partir de index.html + css/style.css + js/*.js + les JSON :
NE LE MODIFIEZ JAMAIS À LA MAIN, et ne le renommez pas en index.html.
Pour changer la mise en page, éditez css/style.css (puis relancez ce script
si vous voulez régénérer la version hors ligne).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "Jardin-Verger-Pardaillan.html"

css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
slim = (ROOT / "js" / "data-slim.json").read_text(encoding="utf-8").strip()
fiches_path = ROOT / "js" / "fiches-personnelles.json"
fiches = fiches_path.read_text(encoding="utf-8").strip() if fiches_path.exists() else "{}"
html = (ROOT / "index.html").read_text(encoding="utf-8")

# La balise </script> ne doit pas apparaître dans un script inline
def safe(s):
    return s.replace("</script", "<\\/script")

html = re.sub(r'<link rel="stylesheet" href="css/style\.css[^"]*"\s*/?>',
              lambda m: "<style>\n" + css + "\n</style>", html)
html = re.sub(r'<script src="js/app\.js[^"]*"></script>',
              lambda m: ("<script>window.__SLIM_DATA__=" + safe(slim) + ";</script>\n"
                         "<script>window.__FICHES_PERSONNELLES__=" + safe(fiches) + ";</script>\n"
                         "<script>\n" + safe(js) + "\n</script>"), html)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"✓ {OUT} ({OUT.stat().st_size // 1024} Ko)")
