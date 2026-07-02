@echo off
REM Launch Rogue D4X game via terminal or browser
REM Usage: run-game [browser|terminal]
SET "mode=%1"

IF /I "%mode%"=="browser" (
  echo Starting Rogue D4X in browser UI...
  call npm run dev
) ELSE (
  echo Starting Rogue D4X in terminal...
  call npm start
)
