@echo off
rem Starts the local PostgreSQL + the shop. Close this window to stop the shop; the database keeps running in its own window.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
start "Jamrex local database" /min node .localdb\start.mjs
echo Waiting for the database...
timeout /t 12 /nobreak >nul
call npm run dev
