// Serves dist/ like the Worker's static assets do: /library/<slug>/ → index.html, unknown
// paths → /library/404.html with a 404. Usage: node scripts/serve.mjs [--port 4391]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const i = process.argv.indexOf('--port');
const PORT = Number(i > -1 ? process.argv[i + 1] : process.env.PORT) || 4391;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };

createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') { res.writeHead(302, { location: '/library/' }); return res.end(); }
  let file = path.join(DIST, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(307, { location: p + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  const found = file.startsWith(DIST) && existsSync(file);
  if (!found) file = path.join(DIST, 'library', '404.html');
  res.writeHead(found ? 200 : 404, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`library preview → http://localhost:${PORT}/library/`));
