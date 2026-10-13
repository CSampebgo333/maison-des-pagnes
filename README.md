# Maison du Faso Dan Fani

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

Les photos sont présentées dans un espace 3D ; elles ne sont pas des modèles volumétriques du tissu. Les noms des pagnes décrivent les motifs visibles sur leurs photos. Chaque pagne coûte 12 000 CFA (XOF), selon le prix fourni. Aucun matériau, longueur ou stock n’est inventé.

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

`config/boutique.json` contient le nom, la signature et le futur numéro WhatsApp. `currency` doit contenir une devise ISO lorsque des prix sont ajoutés : par exemple `XOF`, `GHS` ou `EUR`, selon la devise réelle de la boutique. Le numéro WhatsApp, s’il est renseigné, doit inclure l’indicatif international. Le numéro WhatsApp de la boutique est configuré dans ce fichier.

Les couleurs et la mise en page sont dans `src/styles.css`. La pièce et les lumières sont dans `src/components/ShopScene.tsx`. La vue numéro 1 est l’image principale dans les compartiments, la galerie et la sélection. Les autres vues ne sont accessibles qu’après ouverture de la fiche du pagne.

## Aperçu autonome

L’ancien fichier HTML autonome inclut le code et les photos de sa version de démonstration. Il ne propose pas la gestion serveur du catalogue ni les actualisations de cette version hébergée. Il peut être ouvert directement dans un navigateur moderne, sans installation ni serveur. Les restrictions du navigateur peuvent empêcher la copie automatique depuis un fichier local ; le texte de la sélection reste accessible manuellement.

Pour reconstruire cet aperçu après des modifications :

```sh
pnpm catalogue
node scripts/make-apercu.mjs /chemin/maison-des-pagnes-apercu.html
```

## GitHub et suite du projet

Voir [le guide GitHub](docs/GITHUB.md). Ce projet est préparé pour un dépôt personnel, sans dépendance à l’hébergement de la première démonstration.

Cette version n’enregistre ni commande ni paiement. La sélection est locale au navigateur. Le catalogue initial provient de fichiers. Une gestion protégée permet désormais de modifier les pagnes et leur disponibilité dans le stockage de l’hébergement. Voir la section Gestion du catalogue, favoris et livraison ci-dessous.

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

### Demander un pagne hors galerie

Le bouton « Demander ce pagne » permet de préparer une demande avec une photo,
une quantité et des précisions, sans sélectionner un produit du catalogue.
Le formulaire d'une commande classique peut également ajouter cette demande.
Le prix et la disponibilité sont à confirmer par la boutique ; le sous-total
ne comprend que les articles de la galerie. Aucun achat n'est confirmé avant
accord sur le prix.

Les photos JPEG/PNG sont limitées à 6 Mo et 24 mégapixels. Le PDF contient une
page photo complète : le JPEG est incorporé sans réencodage, et le PNG sans
réduction de résolution ni compression avec perte. L'orientation EXIF est
appliquée à l'affichage, sans modifier la photo. Le bon est créé localement.
Le lien WhatsApp conserve le même fonctionnement et expire après sept jours.
La limite du PDF partagé par lien est de 24 Mo ; le téléchargement et le partage
direct restent disponibles pour un document plus volumineux. Les photos des
clients ne sont pas enregistrées dans le catalogue ni dans son cache local.

## Gestion du catalogue, favoris et livraison

L’espace **Gérer la boutique** (en pied de page) ou `/?gestion=1` permet d’ajouter et modifier les pagnes : prix en CFA hors livraison, disponibilité, description, dimensions, contenu de l’achat, couleurs, occasions et de 1 à 8 photos. La première photo est toujours l’image principale. Un pagne peut être masqué puis réaffiché sans suppression de ses données.

La gestion vérifie côté serveur l’identité ChatGPT transmise par Sites et la variable secrète `CATALOGUE_ADMIN_EMAIL`. Elle reste interdite aux autres comptes et aux visiteurs anonymes, y compris après une future publication publique. Le compte propriétaire actuel est configuré. Pour l’usage autonome de la maman, configurer son compte autorisé et l’accès au site lors de la mise en production ; ne jamais mettre un mot de passe ou cette configuration dans le code client. Sur un autre hébergement, remplacer cette vérification par une authentification serveur fiable : les en-têtes d’identité doivent provenir d’un proxy de confiance.

Les changements sont stockés durablement dans R2 sous `catalogue/current.json`, séparément des PDF de commande. Chaque sauvegarde conserve une version précédente sous `catalogue/history/`. La révision et l’ETag empêchent d’écraser une modification concurrente : si un conflit apparaît, recharger la gestion avant de réessayer. Les fichiers retirés d’une fiche sont conservés pour les versions précédentes. Les uploads abandonnés ne sont pas automatiquement purgés dans cette version.

Chaque upload JPEG/PNG (6 Mo, 24 mégapixels maximum) conserve son original et produit automatiquement trois WebP : miniature 200 px / 100 Ko maximum, boutique 3D 650 px / 300 Ko, galerie 1000 px / 600 Ko. Le traitement est séquentiel sur l’appareil et l’envoi est validé côté serveur. Les variantes portent une empreinte de contenu et bénéficient du cache d’images existant ; le zoom et les PDF utilisent l’original. Les nouvelles photos rejoignent tous les parcours existants. La galerie comprend toute la collection ; la 3D propose des salons de 12 articles. La limite actuelle est de 200 pagnes.

Le catalogue source JSON demeure le catalogue initial et de secours. Les mises à jour effectuées dans la gestion ne nécessitent ni GitHub ni nouveau déploiement et prennent priorité sur ce catalogue. Elles sont sauvegardées dans le stockage de l’hébergement, pas dans Git. Le code ne considère pas le catalogue de secours comme une preuve de disponibilité : les prix et disponibilités sont revérifiés avant création d’un bon PDF.

Les favoris sont multiples et mémorisés sur l’appareil (`maison-faso-favoris-v1`), distincts du choix À la une et du panier. Une vue Favoris et un filtre par occasion sont disponibles dans la collection ; les occasions initiales viennent des descriptions existantes et restent éditables dans la gestion. Ces suggestions n’excluent pas les autres usages d’un pagne.

Livraison proposée à Ouagadougou et Bobo-Dioulasso. Les autres villes du Burkina Faso sont étudiées selon la situation générale. Les prix affichés concernent les pagnes hors livraison ; les frais et délais doivent être convenus avec la boutique avant accord. Retrait à Bobo-Dioulasso, lieu et heure à convenir. La disponibilité initiale est « À confirmer », faute de stock réel renseigné. « Disponible en stock », « Sur commande » et « Indisponible pour le moment » se règlent par produit. Un modèle indisponible reste consultable et peut être favori, mais ne peut être ajouté ou validé dans une commande.
