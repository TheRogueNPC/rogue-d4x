#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# DARK CLUES — ONE-CLICK LAUNCHER (macOS/Linux)
# ═══════════════════════════════════════════════════════════════════
#
# This script:
# 1. Starts a web server on port 8000
# 2. Automatically opens the game in your browser
# 3. Keeps the server running until you close this window
#
# To stop: Press Ctrl+C in this terminal
# ═══════════════════════════════════════════════════════════════════

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║         DARK CLUES — Starting Game Server              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Launching: http://localhost:8000/launch.html"
echo ""

# Get the directory this script is in
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Try Python 3 first
if command -v python3 &> /dev/null; then
    echo "✓ Starting web server..."
    python3 -m http.server 8000 &
    SERVER_PID=$!
    sleep 2

    # Open in browser
    if command -v open &> /dev/null; then
        # macOS
        open "http://localhost:8000/launch.html"
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open "http://localhost:8000/launch.html"
    fi

    echo "✓ Server running on http://localhost:8000"
    echo "✓ Press Ctrl+C to stop the server"
    wait $SERVER_PID
    exit 0
fi

# Fall back to Python 2
if command -v python &> /dev/null; then
    echo "✓ Starting web server..."
    python -m SimpleHTTPServer 8000 &
    SERVER_PID=$!
    sleep 2

    if command -v open &> /dev/null; then
        open "http://localhost:8000/launch.html"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8000/launch.html"
    fi

    echo "✓ Server running on http://localhost:8000"
    echo "✓ Press Ctrl+C to stop the server"
    wait $SERVER_PID
    exit 0
fi

# Try Node.js
if command -v node &> /dev/null; then
    echo "✓ Starting web server..."
    node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{const file=path.join('.',req.url==='/'?'launch.html':req.url);try{const content=fs.readFileSync(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':'text/html'});res.end(content);}catch(e){res.writeHead(404);res.end('404')}}).listen(8000);console.log('✓ Server on http://localhost:8000');console.log('Press Ctrl+C to stop');" &
    SERVER_PID=$!
    sleep 2

    if command -v open &> /dev/null; then
        open "http://localhost:8000/launch.html"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8000/launch.html"
    fi

    wait $SERVER_PID
    exit 0
fi

# Nothing worked
echo ""
echo "✗ ERROR: No web server found"
echo ""
echo "Please install one of:"
echo "  • Python 3: https://www.python.org/downloads/"
echo "  • Node.js: https://nodejs.org/"
echo ""
exit 1
