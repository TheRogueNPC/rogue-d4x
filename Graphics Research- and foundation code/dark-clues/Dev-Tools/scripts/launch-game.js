import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = 3000;

function killPort(host, port) {
  try {
    const cmd =
      process.platform === 'win32'
        ? 'netstat -ano | findstr LISTENING | findstr ":' + port + ' "'
        : 'lsof -nP -iTCP:' + port + ' -sTCP:LISTEN';
    const p = spawn('cmd', ['/c', cmd], { windowsHide: true });
    let out = '';
    p.stdout.on('data', d => (out += d.toString()));
    p.stderr.on('data', () => {});
    p.on('close', () => {
      const lines = (out || '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        if (process.platform === 'win32') {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) pids.add(pid);
        }
      }
      pids.forEach(pid => {
        try {
          spawn('cmd', ['/c', 'taskkill /PID ' + pid + ' /F'], { windowsHide: true });
        } catch {}
      });
      startServer();
    });
    p.on('error', startServer);
  } catch { startServer(); }
}

function startServer() {
  let ready = false;
  const server = http.createServer((request, response) => {
    let reqUrl = decodeURIComponent(request.url || '/');
    reqUrl = reqUrl.split('?')[0].split('#')[0];
    if (!path.extname(reqUrl) || reqUrl.endsWith('/')) reqUrl = '/index.html';
    reqUrl = path.normalize(reqUrl);
    if (reqUrl.startsWith('\\')) reqUrl = reqUrl.slice(1);
    const fp = path.join(root, reqUrl);
    let stream;
    try {
      stream = fs.createReadStream(fp);
    } catch (err) {
      response.statusCode = 404;
      response.end('bad path: ' + fp);
      return;
    }
    response.writeHead(200);
    stream.pipe(response);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      try { server.close(); } catch {}
      setTimeout(() => {
        try {
          try { server.listen(port, host, { reusePort: true }); } catch {}
          try { if (!('listening' in server)) server.listen(port, host); } catch {}
        } catch {}
      }, 100);
      return;
    }
    if (err) console.error('server error', err);
  });
  server.on('listening', () => {
    if (!ready) {
      ready = true;
      console.log('listening http://' + host + ':' + port);
    }
  });
  try {
    try { server.listen(port, host, { reusePort: true }); } catch {}
    try { if (!('listening' in server)) server.listen(port, host); } catch {}
  } catch {}
}

function runWithPidTracker() {
  const pid = process.pid;
  console.log('[PID=' + pid + '] server starting');
  try {
    startServer();
  } catch (err) {
    console.error('[PID=' + pid + '] startServer failed:', err);
  }
}

if (process.pid) runWithPidTracker(); else startServer();

killPort(host, port);
