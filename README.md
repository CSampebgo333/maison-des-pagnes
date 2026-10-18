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

Les commandes et les encaissements saisis manuellement sont désormais enregistrés dans D1. La sélection avant envoi reste locale au navigateur. Le catalogue initial provient de fichiers. Une gestion protégée permet désormais de modifier les pagnes et leur disponibilité dans le stockage de l’hébergement. Voir la section Gestion du catalogue, favoris et livraison ci-dessous.

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

La gestion vérifie côté serveur l’identité ChatGPT transmise par Sites et la variable secrète `CATALOGUE_ADMIN_EMAIL`. Elle reste interdite aux autres comptes et aux visiteurs anonymes, y compris après une future publication publique. Le compte propriétaire actuel est configuré. Le propriétaire gère seul la boutique ; configurer son compte autorisé et l’accès au site lors de la mise en production ; ne jamais mettre un mot de passe ou cette configuration dans le code client. Sur un autre hébergement, remplacer cette vérification par une authentification serveur fiable : les en-têtes d’identité doivent provenir d’un proxy de confiance.

Les changements sont stockés durablement dans R2 sous `catalogue/current.json`, séparément des PDF de commande. Chaque sauvegarde conserve une version précédente sous `catalogue/history/`. La révision et l’ETag empêchent d’écraser une modification concurrente : si un conflit apparaît, recharger la gestion avant de réessayer. Les fichiers retirés d’une fiche sont conservés pour les versions précédentes. Les uploads abandonnés ne sont pas automatiquement purgés dans cette version.

Chaque upload JPEG/PNG (6 Mo, 24 mégapixels maximum) conserve son original et produit automatiquement trois WebP : miniature 200 px / 100 Ko maximum, boutique 3D 650 px / 300 Ko, galerie 1000 px / 600 Ko. Le traitement est séquentiel sur l’appareil et l’envoi est validé côté serveur. Les variantes portent une empreinte de contenu et bénéficient du cache d’images existant ; le zoom et les PDF utilisent l’original. Les nouvelles photos rejoignent tous les parcours existants. La galerie comprend toute la collection ; la 3D propose des salons de 12 articles. La limite actuelle est de 200 pagnes.

Le catalogue source JSON demeure le catalogue initial et de secours. Les mises à jour effectuées dans la gestion ne nécessitent ni GitHub ni nouveau déploiement et prennent priorité sur ce catalogue. Elles sont sauvegardées dans le stockage de l’hébergement, pas dans Git. Le code ne considère pas le catalogue de secours comme une preuve de disponibilité : les prix et disponibilités sont revérifiés avant création d’un bon PDF.

Les favoris sont multiples et mémorisés sur l’appareil (`maison-faso-favoris-v1`), distincts du choix À la une et du panier. Une vue Favoris et un filtre par occasion sont disponibles dans la collection ; les occasions initiales viennent des descriptions existantes et restent éditables dans la gestion. Ces suggestions n’excluent pas les autres usages d’un pagne.

Livraison proposée à Ouagadougou et Bobo-Dioulasso. Les autres villes du Burkina Faso sont étudiées selon la situation générale. Les prix affichés concernent les pagnes hors livraison ; les frais et délais doivent être convenus avec la boutique avant accord. Retrait à Bobo-Dioulasso, lieu et heure à convenir. La disponibilité initiale est « À confirmer », faute de stock réel renseigné. « Disponible en stock », « Sur commande » et « Indisponible pour le moment » se règlent par produit. Un modèle indisponible reste consultable et peut être favori, mais ne peut être ajouté ou validé dans une commande.

## Ajustements du salon en conservant les textes

La composition du salon et ses textes d’accueil restent en place dans la 3D. Les dimensions de la pièce sont conservées, avec un cadrage légèrement élargi. Les niches latérales sont inclinées de 16 degrés vers l’entrée ; le bois est clair, les murs crème et les détails dorés. L’éclairage est plus doux, avec une carte d’ombres statique ; les couleurs des photos restent inchangées.

Toucher un pagne déclenche une approche courte avant sa fiche (0,65 à 1,5 seconde), annulable par un nouveau geste. Avec la réduction des animations, la fiche s’ouvre directement. Sur mobile, les commandes Précédent, Suivant et Vue d’ensemble sont sous le salon et permettent d’approcher tous ses pagnes sans déplacement libre. Les textes à l’intérieur sont conservés. Le glissement, le pincement et la visite guidée restent disponibles. La revue visuelle sur un vrai téléphone reste nécessaire.

## Préparation du référencement

Titre et description nomment le Faso Dan Fani et le Burkina Faso. L’accueil contient une présentation HTML lisible avant JavaScript, avec les villes desservies et les contacts réels ; React la remplace par l’application interactive. Le build ajoute des données structurées Organization, robots.txt et sitemap.xml. Aucun avis, certification, stock ou adresse précise n’est inventé.

L’aperçu privé reste non indexable. Au déploiement public, fournir la variable de build `PUBLIC_SITE_URL=https://votre-domaine/` (origine HTTPS réelle sans chemin). Le build prépare alors la canonique, les aperçus sociaux, le sitemap et l’autorisation d’indexation. Cette variable ne rend pas un site privé public. Vérifier les accès publics réels et la protection de la gestion avant l’ouverture. Les PDF et les API restent exclus du sitemap ; les PDF portent aussi un en-tête noindex côté serveur.

Après choix du domaine : vérifier la propriété dans Google Search Console, soumettre /sitemap.xml, contrôler l’URL et demander l’indexation. Prévoir ensuite de vraies pages publiques par produit, avec rendu serveur du catalogue actualisé et données Product fiables. Le catalogue actuel dans la 3D et les fenêtres produit ne constitue pas encore ces pages séparées. L’indexation et les positions dans Google ne sont jamais garanties.

## Animation d’accueil

À l’ouverture de la boutique, un léger mouvement de caméra commence après le chargement des photos et dure sept secondes, puis revient au cadrage de départ et s’arrête. Son amplitude est réduite sur téléphone. Les textes restent dans le salon et la visite guidée complète se lance seulement sur demande.

Le bouton Pause interrompt l’accueil ; toute action tactile, frappe, recherche, défilement ou changement d’onglet l’arrête également. Un geste dans la scène fige d’abord le mouvement avant d’appliquer le déplacement ou le zoom. Le chargement ne consomme pas les sept secondes. La préférence de réduction des animations empêche le démarrage et interrompt l’animation si elle est activée pendant la visite. Le mouvement n’est pas relancé après une interaction ou un changement de salon.

## Gestion des commandes (D1)

Le catalogue courant, les commandes et le stock résident désormais dans D1 lorsque le binding DB est disponible. Le catalogue existant en R2 est repris une seule fois, sans écraser ses modifications. R2 conserve les photos originales, variantes et bons PDF. La migration structurelle est dans `drizzle/0000_orders.sql` ; elle ne contient aucune commande ni donnée client.

L’espace `?gestion=1` propose une vue d’ensemble, commandes avec recherche/statuts/historique, stock et collection. Une demande client est enregistrée avant son PDF et reçoit un suivi privé. La confirmation exige l’accord du client, les frais, la date convenue et le prix personnalisé éventuel ; elle réserve les unités disponibles par une transaction SQL. Une annulation avant remise restitue les unités. Livraison et encaissement restent distincts ; Orange Money ou Wave sont saisis manuellement à la remise. Les requêtes répétées utilisent une clé d’idempotence.

Les quantités initiales entre 2 et 5 sont explicitement des données de démonstration et n’écrasent aucun stock existant. L’administration doit renseigner les stocks réels avant ouverture publique. Les nouveaux pagnes ne reçoivent aucun stock inventé.

Le futur déploiement indépendant, les transferts de données, la connexion Access, les sauvegardes et les limites de cette version sont documentés dans `deployment/cloudflare/README.md`. Aucun compte Cloudflare personnel ni abonnement n’est configuré par le seul ajout de ces fichiers. Le code demeure sur l’aperçu privé jusqu’au transfert autorisé et sécurisé des ressources.
