$port = 8080

Write-Host "Opening http://localhost:$port in browser..." -ForegroundColor Green

# Try Python first, then npx serve
if (Get-Command python -ErrorAction SilentlyContinue) {
    Start-Process "http://localhost:$port"
    python -m http.server $port
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    Start-Process "http://localhost:$port"
    npx serve -l $port
} else {
    Write-Host "ERROR: Install Python or Node.js to run a local server." -ForegroundColor Red
    Write-Host "  Python: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
