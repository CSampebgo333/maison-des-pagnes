import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] || resolve(root, '../maison-des-pagnes-apercu.html'));
const result = await build({
  root, configFile: false, plugins: [react()], base: './', logLevel: 'warn',
  define: { 'import.meta.env.BASE_URL': JSON.stringify('./'), 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    write: false, cssCodeSplit: false, minify: true,
    lib: { entry: resolve(root, 'src/main.tsx'), name: 'MaisonDesPagnes', formats: ['iife'], fileName: 'app' },
    rolldownOptions: { output: { inlineDynamicImports: true } },
  },
});
const outputs = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
const js = outputs.filter((item) => item.type === 'chunk').map((item) => item.code).join('\n');
const css = outputs.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css')).map((item) => item.source).join('\n');
const products = JSON.parse(await readFile(resolve(root, 'src/catalogue.json'), 'utf8'));
const paths = new Set(products.flatMap((product) => product.photos.flatMap((photo) => [photo.src, photo.thumbnail])));
const images = {};
for (const path of paths) {
  const bytes = await readFile(resolve(root, 'public', path));
  const mime = path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : 'image/jpeg';
  images[path] = `data:${mime};base64,${bytes.toString('base64')}`;
}
const favicon = (await readFile(resolve(root, 'public/favicon.svg'))).toString('base64');
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#553747"><title>Maison des Pagnes — Aperçu</title><link rel="icon" href="data:image/svg+xml;base64,${favicon}"><style>${css.replaceAll('</style', '<\\/style')}</style></head><body><div id="root"></div><script>window.__PAGNE_ASSETS__=${JSON.stringify(images).replaceAll('<', '\\u003c')};</script><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
await writeFile(output, html);
console.log(`Aperçu autonome : ${output} (${(Buffer.byteLength(html)/1024/1024).toFixed(1)} Mo). Aucune connexion nécessaire.`);
