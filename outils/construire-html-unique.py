#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regénère Jardin-Verger-Pardaillan.html (tout-en-un) après une mise à jour."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / "Jardin-Verger-Pardaillan.html"
if not OUT.parent.exists():
    OUT = ROOT / "Jardin-Verger-Pardaillan.html"

css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
index = (ROOT / "index.html").read_text(encoding="utf-8")
m = re.search(r"<style>([\s\S]*?)</style>", index)
fiche_css = m.group(1) if m else ""
slim = (ROOT / "js" / "data-slim.json").read_text(encoding="utf-8")
js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="Cache-Control" content="no-cache"/>
<title>Jardin-Verger de Pardaillan</title>
<style>
{css}
{fiche_css}
</style>
</head>
<body>
<div id="app-header"></div>
<div id="app-main" class="container"><div class="loading"><div class="spinner"></div>Chargement…</div></div>
<div id="app-footer"></div>
<script>window.__SLIM_DATA__={slim};</script>
<script>
{js}
</script>
</body>
</html>
"""
OUT.write_text(html, encoding="utf-8")
print(f"✓ {OUT} ({OUT.stat().st_size//1024} Ko)")
