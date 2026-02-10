@echo off
REM Bol.com Seller Intelligence Platform - Quick Start Script for Windows

echo ========================================
echo Bol.com Seller Intelligence Platform
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Find available port (try 3000-3005)
set PORT=3000
:LOOP
netstat -an | findstr ":%PORT%.*LISTEN" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set /a PORT+=1
    if %PORT% GTR 3005 (
        echo Error: No available port found (tried 3000-3005)
        echo Please kill a process or specify a port: set PORT=3006 ^&^& node src/server.js
        pause
        exit /b 1
    )
    goto LOOP
)

echo Starting platform on port %PORT%...
echo.
echo Dashboard: http://localhost:%PORT%
echo API: http://localhost:%PORT%/api/stats
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
set PORT=%PORT%
node src/server.js

pause
