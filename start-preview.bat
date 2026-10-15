@echo off
cd /d "%~dp0"
echo Life OS Standalone Preview
start "" "http://localhost:4173/preview/"
py -m http.server 4173
pause
