# Maison du Faso Dan Fani — identité « L’atelier »

Le logo retenu est la proposition nº 2, choisie par le propriétaire le 5 novembre 2026 : une arche abritant un métier à tisser. Le dessin vectoriel adapté aux petites tailles est partagé entre la navigation et le rendu des bons PDF.

## Fichiers

- `public/brand/atelier-original.png` : proposition approuvée, conservée comme référence.
- `public/brand/atelier-logo.svg` et `atelier-logo-light.svg` : signatures complètes sur fond transparent (violet / blanc).
- `public/brand/atelier-emblem.svg` et `atelier-emblem-light.svg` : emblème seul.
- `public/brand/atelier-favicon.svg` : onglet du navigateur.
- `public/icons/atelier-*.png` : icônes 192 et 512 px, version maskable et icône Apple.
- `src/lib/brand-mark.ts` : dessin vectoriel commun à l’interface et aux bons PDF.

La navigation conserve le nom de la maison en texte accessible et l’emblème décoratif est masqué aux lecteurs d’écran. Sa couleur suit celle de la navigation, blanche sur le hero sombre et violette sur fond clair. Le pictogramme reste visible sur les écrans compacts. Les icônes maskable gardent le symbole dans leur zone centrale protégée ; leurs nouvelles adresses évitent de réutiliser les anciennes images en cache.

Pour régénérer les fichiers à partir du dessin commun : `node --experimental-strip-types scripts/prepare-brand.mjs`. La conversion des SVG en PNG nécessite Python 3 et les bibliothèques système librsvg/Cairo. Les fichiers PNG sont versionnés ; ces outils ne sont pas nécessaires au build ou à l’exécution de la boutique.

Les bons PDF déjà téléchargés ne sont pas modifiés ; les nouveaux bons adoptent le nouvel emblème. Les paramètres WhatsApp et le catalogue restent indépendants de cette identité visuelle.
