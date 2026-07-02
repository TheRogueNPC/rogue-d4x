@echo off
REM ═══════════════════════════════════════════════════════════════
REM Dark Clues Dev Tools — One-Click Launcher
REM Starts the server and opens the browser automatically.
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo   [Dark Clues Dev Tools]
echo   ──────────────────────
echo.

REM Find a free port
set PORT=8080
:checkport
netstat -an 2>nul | find ":%PORT%" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set /a PORT=PORT+1
    if %PORT% gtr 8090 (
        echo   ERROR: No free port found.
        pause
        exit /b 1
    )
    goto checkport
)

echo   Server: http://localhost:%PORT%
echo   Open:   http://localhost:%PORT%/Dev-Tools/index.html
echo   Root:   %CD%
echo.

REM Open browser
start http://localhost:%PORT%/Dev-Tools/index.html

REM Start server
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    npx --yes http-server . -p %PORT% -c-1 --cors
    goto :end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python -m http.server %PORT%
    goto :end
)

echo   ERROR: Install Node.js from https://nodejs.org
pause

:end