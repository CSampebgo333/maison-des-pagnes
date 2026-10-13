import { basename } from 'node:path';

export const labels = { 1: 'Vue d’ensemble', 2: 'Pagne plié', 3: 'Pagne drapé', 4: 'Détail du motif', 5: 'Autre vue' };

export function groupPhotos(files) {
  const groups = new Map();
  const seen = new Set();
  for (const file of files) {
    const name = basename(file);
    const match = /^pagne([1-9]\d*)-([1-9]\d*)\.(png|jpe?g|webp)$/i.exec(name);
    if (!match) continue; // Les fichiers « - Copy » et les aperçus sont ignorés.
    const number = Number(match[1]), view = Number(match[2]);
    const key = `${number}-${view}`;
    if (seen.has(key)) throw new Error(`Deux fichiers représentent la même vue ${key}. Gardez une seule extension.`);
    seen.add(key);
    if (!groups.has(number)) groups.set(number, []);
    groups.get(number).push({ file: name, view, label: labels[view] ?? `Vue ${view}` });
  }
  return [...groups].sort(([a], [b]) => a - b).map(([number, photos]) => ({ number, photos: photos.sort((a, b) => a.view - b.view) }));
}

export function makeCatalogue(groups, metadata) {
  return groups.map(({ number, photos }) => {
    const id = `pagne${number}`, details = metadata[id] ?? {};
    if (details.price != null && (typeof details.price !== 'number' || !Number.isFinite(details.price) || details.price < 0)) {
      throw new Error(`Prix invalide pour ${id}. Utilisez un nombre positif ou null.`);
    }
    return {
      id, number, name: details.name || `Pagne ${String(number).padStart(2, '0')}`,
      description: details.description || 'Explorez les différentes vues de ce pagne pour découvrir son motif et son tombé.',
      colors: details.colors ?? [], pattern: details.pattern ?? '', accent: details.accent || '#9c7e8c',
      price: details.price ?? null, unit: details.unit ?? '', composition: details.composition ?? '', dimensions: details.dimensions ?? '',
      photos: photos.map(({ file, view, label }) => ({ src: `pagnes/${file}`, thumbnail: `pagnes/${file}`, view, label })),
    };
  });
}
