const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8', '.js': 'application/javascript;charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json;charset=utf-8', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
    res.end('404 Not Found: ' + p);
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fp).pipe(res);
}).listen(8765, () => console.log('Beaver 原型本地服务已启动: http://localhost:8765'));
