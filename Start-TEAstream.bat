@echo off
title TEAstream — Multistream Relay Hub
color 0A
cls
echo ==============================================================
echo   🍵 TEAstream - Multistream Relay Hub (Windows)
echo ==============================================================
echo.

cd /d "%~dp0"

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [-] Node.js is not found on your Windows PC!
    echo     Please install Node.js (v18 or v20 LTS) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check dependencies
if not exist "node_modules" (
    echo [+] First-time run: Installing dependencies...
    call npm install
    echo.
)

:: 3. Check FFmpeg
where ffmpeg >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if not exist "bin\ffmpeg.exe" (
        echo [!] Notice: FFmpeg was not found in PATH.
        echo     Download FFmpeg from https://ffmpeg.org/ and place ffmpeg.exe in a 'bin' folder.
        echo.
    )
)

:: 4. Check if already running or launch Electron desktop app
if exist "node_modules\.bin\electron.cmd" (
    echo [✓] Launching native TEAstream Desktop Application...
    start "" "node_modules\.bin\electron.cmd" desktop\main.js
    exit /b 0
)

netstat -ano | findstr :3000 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [✓] TEAstream is already running on this PC!
    goto LaunchApp
)

:: 5. Start Server in background
echo [+] Starting TEAstream Engine...
start /b "" node server/index.js
timeout /t 2 /nobreak >nul

:LaunchApp
echo [✓] Opening TEAstream Desktop Window...

:: Try launching in Edge or Chrome App mode (standalone window with no URL bar)
where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start msedge --app=http://localhost:3000
    exit /b 0
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start chrome --app=http://localhost:3000
    exit /b 0
)

:: Fallback to default browser
start http://localhost:3000
exit /b 0
