// The production picture, locally: one origin where /library* goes to this Worker and
// everything else to the personal site, the way the Cloudflare routes split
// mutaafaziz.com. Both run under `wrangler dev`, so asset handling and 404s are the real
// thing. Usage: npm run stack [-- --site ../mutaafaziz-site --port 8790]
import { spawn } from 'node:child_process';
import { request, createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const SITE = path.resolve(ROOT, arg('--site', '../mutaafaziz-site'));
const PORT = Number(arg('--port', 8790));
const UP = { site: PORT + 1, library: PORT + 2 };

const kids = [];
function run(name, cwd, args) {
  const p = spawn('npx', ['--yes', 'wrangler@4', 'dev', '--ip', '127.0.0.1', ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = (d) => String(d).split('\n').filter((l) => /Ready|ERROR|error/i.test(l)).forEach((l) => console.log(`[${name}] ${l.trim()}`));
  p.stdout.on('data', tag); p.stderr.on('data', tag);
  p.on('exit', (c) => { console.log(`[${name}] exited ${c}`); shutdown(1); });
  kids.push(p);
}
function shutdown(code) { kids.forEach((k) => k.kill('SIGTERM')); process.exit(code); }
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('site', SITE, ['--port', String(UP.site), '--inspector-port', String(PORT + 11)]);
run('library', ROOT, ['--port', String(UP.library), '--inspector-port', String(PORT + 12)]);

createServer((req, res) => {
  const port = /^\/library(\/|$|\?)/.test(req.url) ? UP.library : UP.site;
  const up = request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  up.on('error', () => { res.writeHead(502, { 'content-type': 'text/plain' }); res.end('starting… reload in a moment\n'); });
  req.pipe(up);
}).listen(PORT, '0.0.0.0', () => console.log(`mutaafaziz.com, locally → http://127.0.0.1:${PORT}/  (library at /library/)`));
