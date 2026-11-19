#!/bin/bash
cd "$(dirname "$0")"
echo "Site: http://localhost:8080"
(sleep 1; open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null || true) &
python3 -m http.server 8080
