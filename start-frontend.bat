@echo off
cd /d "%~dp0frontend"
if not exist node_modules (call npm install)
if not exist .env copy /Y .env.example .env >nul
call npm run dev
pause
