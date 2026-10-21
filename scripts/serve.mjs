// Простой статический сервер для предпросмотра сборки: node scripts/serve.mjs dist 4173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export function serve(dir, port, { base = '/' } = {}) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (base !== '/' && path.startsWith(base)) path = '/' + path.slice(base.length);
      let file = normalize(join(dir, path));
      if (!file.startsWith(normalize(dir))) throw new Error('outside');
      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = join(file, 'index.html');
      else if (!info) file = join(dir, 'index.html');
      const body = await readFile(file);
      const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' };
      if (file.endsWith('mockServiceWorker.js')) headers['Service-Worker-Allowed'] = '/';
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? 'dist';
  const port = Number(process.argv[3] ?? 4173);
  const base = process.argv[4] ?? '/';
  await serve(dir, port, { base });
  console.log(`Предпросмотр: http://localhost:${port}${base}`);
}
