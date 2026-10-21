// Режим разработки: пересборка при каждом изменении и сервер на http://localhost:5173
import { context } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { esbuildOptions, renderHtml } from './build.mjs';
import { serve } from './serve.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, 'assets'), { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });

const ctx = await context(
  esbuildOptions({
    minify: false,
    sourcemap: 'inline',
    entryNames: 'app',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'html',
        setup(b) {
          b.onEnd(async (r) => {
            if (r.errors.length) return;
            await writeFile(join(dist, 'index.html'), await renderHtml(r.metafile));
            console.log(`[${new Date().toLocaleTimeString('ru-RU')}] пересобрано`);
          });
        },
      },
    ],
  }),
);
await ctx.watch();
await serve(dist, 5173);
console.log('Разработка: http://localhost:5173');
