@echo off
REM Delete all the extra files that were added
REM This restores the project to its original state

cd /d "%~dp0"

echo Deleting extra files...

del /F /Q FIXES.md 2>nul
del /F /Q LAUNCH_GUIDE.md 2>nul
del /F /Q README_LAUNCH.md 2>nul
del /F /Q SETUP_GUIDE.md 2>nul
del /F /Q QUICK_RULES.md 2>nul
del /F /Q PROJECT_STRUCTURE.md 2>nul
del /F /Q RECOVERY.md 2>nul
del /F /Q SUMMARY.md 2>nul
del /F /Q WORKFLOW.md 2>nul
del /F /Q START_HERE.md 2>nul
del /F /Q WINDOWS_LAUNCH.md 2>nul
del /F /Q START.bat 2>nul
del /F /Q launch.html 2>nul
del /F /Q .PROJECT_RULES.md 2>nul

echo Deleting extra folders...

rmdir /S /Q entry-points 2>nul
rmdir /S /Q .workflows 2>nul
rmdir /S /Q .strict 2>nul
rmdir /S /Q .dependencies 2>nul

echo Done. Project restored to original state.
echo SevenDRL.js is fixed.
pause
