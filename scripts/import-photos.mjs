import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { groupPhotos } from './catalogue-core.mjs';

const input = process.argv[2];
if (!input) {
  console.error('Usage : pnpm import:photos /chemin/du/dossier-decompresse');
  process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(root, 'public/pagnes');
async function walk(dir) {
  const list = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) list.push(...await walk(resolve(dir, entry.name)));
    else if (entry.isFile()) list.push(resolve(dir, entry.name));
  }
  return list;
}
const files = (await walk(resolve(input))).filter((file) => /^pagne[1-9]\d*-[1-9]\d*\.(png|jpe?g|webp)$/i.test(basename(file)));
const hash = (data) => createHash('sha256').update(data).digest('hex');
const unique = new Map();
for (const file of files) {
  const key = basename(file).toLowerCase();
  if (unique.has(key) && hash(await readFile(file)) !== hash(await readFile(unique.get(key)))) {
    throw new Error(`Deux fichiers différents portent le nom ${key}. Import annulé.`);
  }
  unique.set(key, file);
}
groupPhotos([...unique.values()]); // Vérification avant toute copie.
await mkdir(target, { recursive: true });
const existing = await readdir(target);
const writes = [];
for (const file of unique.values()) {
  const name = basename(file).toLowerCase();
  const prefix = name.replace(/\.[^.]+$/, '.');
  const competing = existing.find((old) => old.toLowerCase().startsWith(prefix) && old.toLowerCase() !== name);
  if (competing) throw new Error(`${competing} existe déjà. Retirez cette ancienne vue avant d’importer ${name}.`);
  const dest = resolve(target, name), bytes = await readFile(file);
  try {
    await access(dest);
    if (hash(await readFile(dest)) !== hash(bytes)) throw new Error(`${name} existe avec un contenu différent. Import annulé pour éviter un remplacement silencieux.`);
  } catch (error) {
    if (error.code === 'ENOENT') writes.push([dest, bytes]);
    else throw error;
  }
}
for (const [dest, bytes] of writes) await writeFile(dest, bytes);
console.log(`${writes.length} nouvelles photos importées. Les copies « - Copy » sont ignorées.`);
await import('./prepare-catalogue.mjs');
