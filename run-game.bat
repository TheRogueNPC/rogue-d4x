@echo off
REM Rogue D4X Windows launcher.
REM Usage:
REM   run-game.bat              - playable terminal/dev mode
REM   run-game.bat terminal     - playable terminal/dev mode
REM   run-game.bat browser      - browser/server mode
REM   run-game.bat build        - build TypeScript then run dist/index.js

setlocal
set "mode=%~1"

if "%mode%"=="" set "mode=terminal"

if /I "%mode%"=="terminal" (
  echo Starting Rogue D4X in playable terminal mode...
  call npm run dev
  exit /b %ERRORLEVEL%
)

if /I "%mode%"=="browser" (
  echo Starting Rogue D4X browser/server mode...
  call npm run dev:browser
  exit /b %ERRORLEVEL%
)

if /I "%mode%"=="build" (
  echo Building Rogue D4X and starting compiled terminal mode...
  call npm run build
  if ERRORLEVEL 1 exit /b %ERRORLEVEL%
  call npm start
  exit /b %ERRORLEVEL%
)

echo Unknown mode: %mode%
echo.
echo Usage:
echo   run-game.bat
echo   run-game.bat terminal
echo   run-game.bat browser
echo   run-game.bat build
exit /b 1
