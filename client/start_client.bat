@echo off
title Athas VTT — Client
echo ============================================
echo   Athas VTT Client — Starting...
echo   Opening browser to http://localhost:3001
echo ============================================
cd /d "%~dp0"
start "" http://localhost:3001
npm run dev
pause
