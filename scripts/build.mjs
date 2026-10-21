// Сборка прототипа: один бандл на esbuild, без конфигов.
// Все пути относительные (./assets/...), поэтому сайт работает и в корне домена,
// и в подпапке GitHub Pages (https://<user>.github.io/supplier-scout/).
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');

export const esbuildOptions = (overrides = {}) => ({
  entryPoints: [join(root, 'src/app/main.tsx')],
  bundle: true,
  format: 'esm',
  target: ['es2022', 'chrome111', 'safari16.4', 'firefox113'],
  outdir: join(dist, 'assets'),
  entryNames: 'app-[hash]',
  assetNames: '[name]-[hash]',
  loader: { '.woff2': 'file', '.woff': 'file', '.svg': 'file' },
  jsx: 'automatic',
  metafile: true,
  sourcemap: false,
  minify: true,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
  ...overrides,
});

export async function renderHtml(meta) {
  const template = await readFile(join(root, 'src/index.html'), 'utf8');
  const outputs = Object.keys(meta.outputs).map((p) => p.split('/assets/')[1]).filter(Boolean);
  const js = outputs.find((f) => f.startsWith('app-') && f.endsWith('.js'));
  const css = outputs.find((f) => f.startsWith('app-') && f.endsWith('.css'));
  return template
    .replace('%CSS%', css ? `<link rel="stylesheet" href="./assets/${css}" />` : '')
    .replace('%JS%', `<script type="module" src="./assets/${js}"></script>`);
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  const result = await build(esbuildOptions());
  await cp(join(root, 'public'), dist, { recursive: true });
  const html = await renderHtml(result.metafile);
  await writeFile(join(dist, 'index.html'), html);
  // GitHub Pages: 404.html = та же страница (на случай прямой ссылки без #)
  await writeFile(join(dist, '404.html'), html);
  await writeFile(join(dist, '.nojekyll'), '');

  const files = await readdir(join(dist, 'assets'));
  const sizes = Object.entries(result.metafile.outputs)
    .filter(([p]) => p.endsWith('.js') || p.endsWith('.css'))
    .map(([p, o]) => `${p.split('/').pop()} ${(o.bytes / 1024).toFixed(0)} КБ`);
  console.log(`Готово: dist/ (${files.length} файлов в assets)\n  ${sizes.join('\n  ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
