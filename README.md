# Maison des Pagnes

Une boutique de pagnes en français, avec une visite en 3D et une galerie classique. Cette première version se concentre sur le rendu et les interactions. Elle utilise les douze pagnes et soixante photos uniques des deux ZIP fournis.

## Démarrer

Node.js 22.18 ou plus récent et pnpm 11.25 sont requis.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir l’adresse locale affichée par Vite. Les images, composants et icônes sont locaux ; aucun CDN n’est nécessaire.

```sh
pnpm test
pnpm check
pnpm build
```

Le build de production se trouve dans `dist/`. Aucune publication automatique n’est configurée.

## Le rendu

- Salon en 3D avec douze compartiments, éclairage, déplacement à la souris, au clavier et au doigt.
- Visite guidée des produits affichés, approche directe d’un pagne et plein écran.
- Recherche par mots et filtre couleur : les résultats sont réorganisés dans la boutique et la galerie.
- Fiches avec plusieurs photos, zoom de 100 à 400 %, déplacement de la photo et pincement tactile.
- Galerie disponible directement et utilisée automatiquement si WebGL est indisponible.
- Sélection des pagnes avec quantités, conservée sur l’appareil et partageable sous forme de texte.

Les photos sont présentées dans un espace 3D ; elles ne sont pas des modèles volumétriques du tissu. Le nom de la boutique et les noms descriptifs sont provisoires. Chaque pagne coûte 12 000 CFA (XOF), selon le prix fourni. Aucun matériau, longueur ou stock n’est inventé.

## Ajouter de nouveaux pagnes

Placer les photos dans `public/pagnes/`, avec la convention :

```text
pagne3-1.png
pagne3-2.png
pagne3-3.png
pagne3-4.png
pagne3-5.png
...
pagne12-5.png
```

PNG, JPG, JPEG et WebP sont acceptés. Le premier nombre identifie le pagne ; le second identifie la vue. Les fichiers `- Copy` sont ignorés. L’ordre est numérique : le pagne 2 passe avant le pagne 10. Une vue présente avec deux extensions différentes est signalée.

Le catalogue est régénéré au démarrage et au build. On peut également importer un dossier déjà décompressé :

```sh
pnpm import:photos /chemin/vers/mes-photos
```

L’import inspecte également les sous-dossiers et refuse les remplacements silencieux. Les soixante photos sont optimisées en WebP, avec des aperçus légers, tout en conservant le nom de chaque vue.

Renseigner les noms, couleurs, descriptions et futurs prix dans `config/pagnes.json`. Les pagnes sans métadonnées reçoivent un nom de référence et restent visibles avec « Prix sur demande ». Voir [le guide des photos](docs/PHOTOS.md).

## Personnaliser la boutique

`config/boutique.json` contient le nom, la signature et le futur numéro WhatsApp. `currency` doit contenir une devise ISO lorsque des prix sont ajoutés : par exemple `XOF`, `GHS` ou `EUR`, selon la devise réelle de la boutique. Le numéro WhatsApp, s’il est renseigné, doit inclure l’indicatif international. Aucun numéro n’est configuré par défaut.

Les couleurs et la mise en page sont dans `src/styles.css`. La pièce et les lumières sont dans `src/components/ShopScene.tsx`. La vue numéro 1 est l’image principale dans les compartiments, la galerie et la sélection. Les autres vues ne sont accessibles qu’après ouverture de la fiche du pagne.

## Aperçu autonome

Le fichier HTML livré avec le projet inclut tout le code et toutes les photos. Il peut être ouvert directement dans un navigateur moderne, sans installation ni serveur. Les restrictions du navigateur peuvent empêcher la copie automatique depuis un fichier local ; le texte de la sélection reste accessible manuellement.

Pour reconstruire cet aperçu après des modifications :

```sh
pnpm catalogue
node scripts/make-apercu.mjs /chemin/maison-des-pagnes-apercu.html
```

## GitHub et suite du projet

Voir [le guide GitHub](docs/GITHUB.md). Ce projet est préparé pour un dépôt personnel, sans dépendance à l’hébergement de la première démonstration.

Cette version n’enregistre ni commande ni paiement. La sélection est locale au navigateur. Le catalogue provient de fichiers ; il n’y a pas encore de base de données, d’administration, de gestion des stocks ou d’authentification. Ces éléments seront ajoutés une fois le rendu validé, puis le déploiement sera choisi.

## Vérification de cette livraison

Les contrôles TypeScript, les tests du catalogue/recherche/sélection et le build de production ont été exécutés. Les tests couvrent également une collection de douze pagnes à cinq vues. Les dépendances utilisées pour les contrôles étaient déjà installées dans l’environnement aux versions du projet ; une installation neuve n’a pas pu être vérifiée dans cet environnement.

La navigation WebGL et le comportement tactile n’ont pas été vérifiés visuellement dans un navigateur ici. L’aperçu autonome permet cette revue sur les appareils qui serviront à la boutique.

### Images et performances

Les originaux dans `public/pagnes` restent disponibles pour le zoom et les PDF.
La boutique utilise des variantes WebP adaptées : miniature 200 px, galerie/3D
650 px, fiche produit 1 000 px. Après une importation ou un remplacement,
exécuter `python scripts/optimize-images.py` (Pillow requis), puis `pnpm build`.
Le script génère `src/image-manifest.json` et les fichiers `public/media` avec
une empreinte dans leur nom. Ces fichiers peuvent être mis en cache un an sans
risquer d'afficher une ancienne photo après une mise à jour.

Les fiches affichent un aperçu pendant le chargement, anticipent seulement les
vues voisines et chargent l'original lorsque le visiteur zoome. L'anticipation
est désactivée si le navigateur annonce une économie de données ou un réseau
2G. La scène conserve ses textures lors des filtres et ne se redessine que si
la caméra ou son contenu change. Les bons de commande restent hors du cache.

Un service worker conserve localement jusqu'à 96 variantes versionnées déjà
consultées. Il évite leur revalidation réseau dans les aperçus dont l'hébergement
impose un cache court. Il exclut les PDF, les commandes, les pages HTML, les
réponses d'authentification et les erreurs. Si le navigateur refuse ce cache,
le chargement normal reste disponible. La première visite nécessite toujours
le téléchargement des images ; les visites suivantes bénéficient du cache.
