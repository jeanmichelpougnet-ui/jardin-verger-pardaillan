@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Mise a jour iNaturalist ===
python outils\mettre-a-jour-inat.py %*
if errorlevel 1 (
  echo.
  echo Python est requis. Installez Python 3 puis relancez.
  pause
  exit /b 1
)
echo.
echo Reconstruction du HTML unique...
python outils\construire-html-unique.py
echo.
echo Termine. Relancez demarrer.bat puis Ctrl+F5.
pause
