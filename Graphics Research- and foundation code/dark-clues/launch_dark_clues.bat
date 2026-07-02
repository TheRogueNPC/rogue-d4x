@echo off
echo ========================================
echo Dark Clues Launcher - Local HTTP Server
echo ========================================
echo.

set "PROJECT_DIR=J:\BKU\New folder\dark-clues"

echo Checking project directory: %PROJECT_DIR%
if not exist "%PROJECT_DIR%" (
    echo ERROR: Directory not found: %PROJECT_DIR%
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"

:: Try multiple ports
for %%P in (8000 8001 8002 8080 8888 3000 5000) do (
    set "PORT=%%P"
    netstat -an | findstr ":%%P " >nul
    if errorlevel 1 (
        echo Found available port: %%P
        goto :start_server
    )
)

echo All common ports in use, using 8000 anyway...
set "PORT=8000"

:start_server
echo.
echo Checking for Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Found Python! Starting HTTP server on port %PORT%...
    echo.
    echo Opening browser at http://localhost:%PORT%
    echo Press Ctrl+C to stop the server
    echo.
    
    start "" "http://localhost:%PORT%/?t=%RANDOM%"
    python -m http.server %PORT%
    goto :eof
)

echo.
echo Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Found Node.js!
    echo Checking for http-server...
    npx http-server --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Starting http-server on port %PORT%...
        start "" "http://localhost:%PORT%/?t=%RANDOM%"
        npx http-server -p %PORT%
        goto :eof
    ) else (
        echo Installing http-server globally...
        npm install -g http-server
        if %errorlevel% equ 0 (
            echo Starting http-server on port %PORT%...
            start "" "http://localhost:%PORT%/?t=%RANDOM%"
            npx http-server -p %PORT%
            goto :eof
        )
    )
)

echo.
echo Checking for PHP...
php --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Found PHP! Starting built-in server on port %PORT%...
    start "" "http://localhost:%PORT%/?t=%RANDOM%"
    php -S localhost:%PORT%
    goto :eof
)

echo.
echo ========================================
echo No suitable HTTP server found!
echo ========================================
echo.
echo Please install ONE of the following:
echo.
echo 1. Python (recommended): https://python.org/downloads/
echo    - Check "Add Python to PATH" during install
echo.
echo 2. Node.js: https://nodejs.org/
echo    - Then run: npm install -g http-server
echo.
echo 3. PHP: https://windows.php.net/download/
echo.
echo Or manually run in this folder:
echo   python -m http.server 8000
echo   # then open http://localhost:8000
echo.
pause
