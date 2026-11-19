@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Enrichissement des fiches ===
python outils\enrichir-fiches.py %*
if errorlevel 1 (
  echo Python 3 requis.
  pause
  exit /b 1
)
echo.
python outils\construire-html-unique.py
echo.
echo Termine. Ctrl+F5 dans le navigateur.
pause
