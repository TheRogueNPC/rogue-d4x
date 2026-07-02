@echo off
cd /d "%~dp0"
title WebDwarfs

echo.
echo === WebDwarfs Launcher ===
echo.

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo npm install failed. Make sure Node.js is installed.
        pause
        exit /b 1
    )
    echo.
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    $psi = New-Object System.Diagnostics.ProcessStartInfo; ^
    $psi.FileName = 'node'; ^
    $psi.Arguments = 'server/app.js'; ^
    $psi.UseShellExecute = $false; ^
    $psi.RedirectStandardOutput = $true; ^
    $psi.RedirectStandardError = $true; ^
    $p = [System.Diagnostics.Process]::Start($psi); ^
    $browserOpened = $false; ^
    while (-not $p.StandardOutput.EndOfStream) { ^
        $line = $p.StandardOutput.ReadLine(); ^
        Write-Host $line; ^
        if (-not $browserOpened -and $line -match 'port (\d+)') { ^
            $port = $matches[1]; ^
            $browserOpened = $true; ^
            Start-Process "http://localhost:$port/game"; ^
            Write-Host "`nBrowser opened to http://localhost:$port/game"; ^
            Write-Host "Close this window to stop the server.`n"; ^
        } ^
    }; ^
    $p.WaitForExit()
