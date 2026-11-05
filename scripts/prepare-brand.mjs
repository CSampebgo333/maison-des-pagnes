// Rebuild the approved logo derivatives from one small vector master.
// System librsvg/Cairo are only needed to regenerate the committed PNG icons.
import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {brandMarkSvg,LOOM_MARKUP} from '../src/lib/brand-mark.ts';
await mkdir('public/brand',{recursive:true});
await writeFile('public/brand/atelier-emblem.svg',brandMarkSvg());
await writeFile('public/brand/atelier-emblem-light.svg',brandMarkSvg('#ffffff'));
const icon=(size,maskable=false)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" rx="${maskable?0:22}" fill="#faf6fc"/><g color="#654074" transform="translate(23 19) scale(.675)">${LOOM_MARKUP}</g></svg>`;
await writeFile('public/brand/atelier-favicon.svg',icon(64));
// Keep the previous favicon address working for browsers with a cached link.
await writeFile('public/favicon.svg',icon(64));
for(const [file,size,maskable] of [['atelier-app-192',192,false],['atelier-app-512',512,false],['atelier-app-maskable-512',512,true],['atelier-apple-touch-icon',180,true]]) {
 execFileSync('python3',['scripts/render-brand-svg.py',`public/icons/${file}.png`,String(size)],{input:icon(size,maskable)});
}
const lockup=(color)=>`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="180" viewBox="0 0 720 180" role="img" aria-label="Maison du Faso Dan Fani"><g color="${color}" transform="translate(14 14) scale(1.65)">${LOOM_MARKUP}</g><g fill="${color}" font-family="Georgia,serif"><text x="178" y="67" font-size="31">Maison du</text><text x="176" y="128" font-size="55">Faso Dan Fani</text></g></svg>`;
await writeFile('public/brand/atelier-logo.svg',lockup('#654074'));
await writeFile('public/brand/atelier-logo-light.svg',lockup('#ffffff'));
