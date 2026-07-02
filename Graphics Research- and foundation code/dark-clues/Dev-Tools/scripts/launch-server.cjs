const http = require('http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const server = http.createServer((request, response) => {
  let url = decodeURIComponent(request.url || '/');
  if (!path.extname(url)) url = '/index.html';
  const fp = path.join(root, url);
  let stream;
  try { stream = fs.createReadStream(fp); } catch (err) { response.statusCode = 404; return response.end('not found'); }
  response.writeHead(200);
  stream.pipe(response);
});

const host = '127.0.0.1';
const port = 3000;
server.on('listening', () => console.log('listening', `http://${host}:${port}`));
server.listen(port, host, () => {});
