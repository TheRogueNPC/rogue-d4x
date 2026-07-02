@echo off
REM ── Dark Clues Dev Server ────────────────────────────────────
REM Uses the dark-clues/ directory as the HTTP root so that
REM baked-in asset paths (assets/*.ogg, assets/clues.json) resolve
REM correctly from Dev-Tools/index.html.
REM ─────────────────────────────────────────────────────────────

cd /d "%~dp0.."

echo.
echo   Dark Clues Dev Tools
echo   ──────────────────────
echo   Serving from: %CD%
echo.
echo   Open: http://localhost:8080/Dev-Tools/index.html
echo   Press Ctrl+C to stop.
echo.

REM Try Node.js http-server first
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    npx --yes http-server . -p 8080 -c-1 --cors
    goto :end
)

REM Fallback: Python
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python -m http.server 8080
    goto :end
)

echo   ERROR: Neither Node.js nor Python found.
echo   Install Node.js from https://nodejs.org
echo.

:end
pause