@echo off
title TEAstream - Stop Hub
color 0C
cls
echo ==============================================================
echo   TEAstream - Stopping Server and Background Relays (Windows)
echo ==============================================================
echo.

echo [+] Sending graceful shutdown signal...
powershell -Command "try { Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/server/shutdown' -Method Post -TimeoutSec 2 | Out-Null } catch {}" >nul 2>&1

timeout /t 1 /nobreak >nul

echo [+] Terminating FFmpeg background relay processes...
taskkill /F /IM ffmpeg.exe 2>nul

echo [+] Terminating TEAstream Node.js processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :1935 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo ==============================================================
echo   [OK] TEAstream has been COMPLETELY STOPPED.
echo   [OK] All background relays terminated.
echo   [OK] Ports 3000 and 1935 are now free.
echo ==============================================================
echo.
timeout /t 3
exit
