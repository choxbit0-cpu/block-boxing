// Tiny static server for Block Boxing: node serve.mjs  ->  http://localhost:8130
// Also keeps your progress in save.json next to this file (GET/POST /api/save).
import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 8130;
const saveFile = join(root, 'save.json');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

async function handleSave(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await readFile(saveFile);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(data);
    } catch { res.writeHead(404); return res.end('{}'); }
  }
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 500_000) { res.writeHead(413); return res.end(); } }
    try {
      const parsed = JSON.parse(body);
      // only keep the newer save
      try { const cur = JSON.parse(await readFile(saveFile, 'utf8')); if ((cur.savedAt || 0) > (parsed.savedAt || 0)) { res.writeHead(409); return res.end('older'); } } catch {}
      await writeFile(saveFile + '.tmp', JSON.stringify(parsed, null, 1));
      await rename(saveFile + '.tmp', saveFile);
      res.writeHead(204); return res.end();
    } catch { res.writeHead(400); return res.end('bad save'); }
  }
  res.writeHead(405); res.end();
}

http.createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/api/save') return handleSave(req, res);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(normalize(root)) || file === saveFile) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, () => console.log(`Block Boxing running at http://localhost:${port}`));
