@echo off
setlocal enabledelayedexpansion
title Trading Journal Institutional EMA + MACD Bot Launcher

echo.
echo ================================
echo   Trading Journal Institutional EMA + MACD Bot Launcher
echo ================================
echo.

REM Always run from the folder where this BAT file is placed
cd /d "%~dp0"

REM Check Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not added to PATH.
    echo Install Node.js LTS from https://nodejs.org/
    echo Then run this file again.
    echo.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm is not installed or not added to PATH.
    echo Reinstall Node.js LTS and make sure npm is included.
    echo.
    pause
    exit /b 1
)

REM Check project files
if not exist "package.json" (
    echo ERROR: package.json not found.
    echo Put this Start_Delta_Bot.bat file INSIDE the extracted bot folder.
    echo Example: inside the extracted institutional_ema_macd_mtf_bot folder.
    echo.
    pause
    exit /b 1
)

REM Install dependencies only if missing
if not exist "node_modules" (
    echo Installing dependencies. This may take a few minutes the first time...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed.
        echo Check internet connection and Node.js installation.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo Starting Trading Journal Institutional EMA + MACD dashboard...
echo Keep this window open while the bot is running.
echo.

REM Open browser after a short delay
start "" cmd /c "timeout /t 3 >nul && start http://localhost:8080"

REM Start app
call npm start
if errorlevel 1 (
    echo.
    echo npm start failed. Trying node server.js...
    node server.js
)

echo.
echo Bot stopped.
pause
