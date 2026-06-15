#!/usr/bin/env node
/**
 * Minimal static server for the project dashboard (zero dependencies).
 * Serves the repo root so the dashboard can fetch any docs/*.md and embed SVGs.
 *
 *   npm run dashboard:serve
 * then open the printed URL.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const PORT = process.env.DASHBOARD_PORT || 4178;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { urlPath = req.url; }
  if (urlPath === '/') urlPath = '/docs/dashboard/index.html';
  const abs = path.join(REPO, urlPath);
  if (!abs.startsWith(REPO)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found: ' + urlPath); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(abs).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });
});
server.listen(PORT, () => {
  console.log(`Dashboard server running.`);
  console.log(`  Open:  http://localhost:${PORT}/docs/dashboard/index.html`);
  console.log(`  (Ctrl+C to stop.)`);
});
