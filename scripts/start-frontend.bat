@echo off
cd /d "%~dp0..\frontend"
echo Starting frontend on http://localhost:5173
npm run dev
pause
