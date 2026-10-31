# Maison du Faso Dan Fani

Une boutique de Faso Dan Fani en français et en anglais, avec un accueil photographique, une collection accessible, des demandes de commande et une gestion protégée du catalogue, du stock et des commandes. Le catalogue initial contient douze modèles et soixante photos. Le backend utilise Cloudflare Workers, D1 et R2.

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

Le build produit le frontend dans `dist/client/` et le Worker dans `dist/server/`. `pnpm dev` et `pnpm preview` servent uniquement le frontend : les API nécessitent le Worker et ses bindings D1/R2. La configuration du déploiement automatique est prête dans `wrangler.jsonc` ; connecter le Worker au dépôt avec Workers Builds pour l’activer (voir le guide Cloudflare).

## Le rendu

- Accueil photographique avec accès direct à la collection, sans navigation en 3D.
- Typographie EB Garamond auto-hébergée, en français et en anglais.
- Recherche, filtres couleur/occasion et favoris ; léger zoom de 5 % au survol des photos (désactivé avec la réduction des animations).
- Fiches avec plusieurs photos, zoom de 100 à 400 %, déplacement de la photo et pincement tactile. Sur téléphone, la galerie occupe deux tiers de la hauteur visible.
- Aperçu social avec image de marque dédiée pour WhatsApp et les réseaux sociaux.
- Sélection des pagnes avec quantités, conservée sur l’appareil et partageable sous forme de texte.

Les noms des pagnes décrivent les motifs visibles sur leurs photos. Chaque pagne coûte 12 000 CFA (XOF), selon le prix fourni. Les stocks de démonstration doivent être remplacés par les quantités réelles avant ouverture publique ; la composition et les dimensions restent à renseigner selon les produits.

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

Les couleurs et la mise en page sont dans `src/styles.css`. La vue numéro 1 est l’image principale dans la collection et la sélection. Les autres vues ne sont accessibles qu’après ouverture de la fiche du pagne.

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

Exécuter `pnpm ci:build` pour contrôler TypeScript, lancer les tests et construire le site ainsi que le Worker. Les tests couvrent le catalogue, les photos, les commandes, la gestion protégée, les sauvegardes, les langues et les métadonnées de partage.

La navigation WebGL et le comportement tactile n’ont pas été vérifiés visuellement dans un navigateur ici. L’aperçu autonome permet cette revue sur les appareils qui serviront à la boutique.

### Images et performances

Les originaux dans `public/pagnes` restent disponibles pour le zoom et les PDF.
La boutique utilise des variantes WebP adaptées : miniature 200 px, collection
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

Sur Sites, la gestion utilise l’identité ChatGPT transmise par son proxy de confiance et `CATALOGUE_ADMIN_EMAIL`. Sur le déploiement indépendant, définir impérativement `AUTH_MODE=cloudflare` : le serveur vérifie le JWT Cloudflare Access, son émetteur, son audience, son expiration et l’e-mail autorisé. Protéger `/api/admin/*` avec Access, y compris `/api/admin/login`. Ne jamais utiliser le mode Sites sur un hébergement public indépendant. Les paramètres à compléter sont décrits dans le guide Cloudflare ; aucun compte propriétaire n’est configuré par le dépôt seul.

Avec le binding DB, le catalogue courant est stocké dans D1 (`catalogue_documents`). À la première lecture, le catalogue R2 existant (`catalogue/current.json`) est repris si D1 est vide ; sinon le catalogue initial sert de source. Sans DB, le catalogue utilise R2. Chaque enregistrement conserve la version précédente sous `catalogue/history/` dans R2. La révision et la mise à jour conditionnelle D1 (ou l’ETag R2 sans DB) empêchent d’écraser une modification concurrente : si un conflit apparaît, recharger la gestion avant de réessayer. Les fichiers retirés d’une fiche sont conservés pour les versions précédentes. Les uploads abandonnés ne sont pas automatiquement purgés dans cette version.

Chaque upload JPEG/PNG (6 Mo, 24 mégapixels maximum) conserve son original et produit automatiquement trois WebP : miniature 200 px / 100 Ko maximum, aperçu 650 px / 300 Ko, galerie 1000 px / 600 Ko. Le traitement est séquentiel sur l’appareil et l’envoi est validé côté serveur. Les variantes portent une empreinte de contenu et bénéficient du cache d’images existant ; le zoom et les PDF utilisent l’original. Les nouvelles photos rejoignent tous les parcours existants. La collection affiche tous les articles et propose des filtres. La limite actuelle est de 200 pagnes.

Le catalogue source JSON demeure le catalogue initial et de secours. Les mises à jour effectuées dans la gestion ne nécessitent ni GitHub ni nouveau déploiement et prennent priorité sur ce catalogue. Elles sont sauvegardées dans le stockage de l’hébergement, pas dans Git. Le code ne considère pas le catalogue de secours comme une preuve de disponibilité : les prix et disponibilités sont revérifiés avant création d’un bon PDF.

Les favoris sont multiples et mémorisés sur l’appareil (`maison-faso-favoris-v1`), distincts du choix À la une et du panier. Une vue Favoris et un filtre par occasion sont disponibles dans la collection ; les occasions initiales viennent des descriptions existantes et restent éditables dans la gestion. Ces suggestions n’excluent pas les autres usages d’un pagne.

Livraison proposée à Ouagadougou et Bobo-Dioulasso. Les autres villes du Burkina Faso sont étudiées selon la situation générale. Les prix affichés concernent les pagnes hors livraison ; les frais et délais doivent être convenus avec la boutique avant accord. Retrait à Bobo-Dioulasso, lieu et heure à convenir. La disponibilité initiale est « À confirmer », faute de stock réel renseigné. « Disponible en stock », « Sur commande » et « Indisponible pour le moment » se règlent par produit. Un modèle indisponible reste consultable et peut être favori, mais ne peut être ajouté ou validé dans une commande.

## Préparation du référencement

Titre et description nomment le Faso Dan Fani et le Burkina Faso. L’accueil contient une présentation HTML lisible avant JavaScript, avec les villes desservies et les contacts réels ; React la remplace par l’application interactive. Le build ajoute des données structurées Organization, robots.txt et sitemap.xml. Aucun avis, certification, stock ou adresse précise n’est inventé.

L’aperçu privé reste non indexable. Au déploiement public, fournir la variable de build `PUBLIC_SITE_URL=https://votre-domaine/` (origine HTTPS réelle sans chemin). Le build prépare alors la canonique, les aperçus sociaux, le sitemap et l’autorisation d’indexation. Cette variable ne rend pas un site privé public. Vérifier les accès publics réels et la protection de la gestion avant l’ouverture. Les PDF et les API restent exclus du sitemap ; les PDF portent aussi un en-tête noindex côté serveur.

Après choix du domaine : vérifier la propriété dans Google Search Console, soumettre /sitemap.xml, contrôler l’URL et demander l’indexation. Prévoir ensuite de vraies pages publiques par produit, avec rendu serveur du catalogue actualisé et données Product fiables. Le catalogue actuel et les fenêtres produit ne constitue pas encore ces pages séparées. L’indexation et les positions dans Google ne sont jamais garanties.

## Gestion des commandes (D1)

Le catalogue courant, les commandes et le stock résident désormais dans D1 lorsque le binding DB est disponible. Le catalogue existant en R2 est repris une seule fois, sans écraser ses modifications. R2 conserve les photos originales, variantes et bons PDF. Appliquer les trois migrations de `drizzle/` dans l’ordre : `0000_orders.sql` (tables et stock), `0001_security.sql` (limitation des requêtes), `0002_order_language.sql` (langue des commandes). Elles ne contiennent aucune commande ni donnée client.

L’espace `?gestion=1` propose une vue d’ensemble, commandes avec recherche/statuts/historique, stock et collection. Une demande client est enregistrée avant son PDF et reçoit un suivi privé. La confirmation exige l’accord du client, les frais, la date convenue et le prix personnalisé éventuel ; elle réserve les unités disponibles par une transaction SQL. Une annulation avant remise restitue les unités. Livraison et encaissement restent distincts ; Orange Money ou Wave sont saisis manuellement à la remise. Les requêtes répétées utilisent une clé d’idempotence.

Les quantités initiales entre 2 et 5 sont explicitement des données de démonstration et n’écrasent aucun stock existant. L’administration doit renseigner les stocks réels avant ouverture publique. Les nouveaux pagnes ne reçoivent aucun stock inventé.

Le futur déploiement indépendant, les transferts de données, la connexion Access, les sauvegardes et les limites de cette version sont documentés dans `deployment/cloudflare/README.md`. Aucun compte Cloudflare personnel ni abonnement n’est configuré par le seul ajout de ces fichiers. Le code demeure sur l’aperçu privé jusqu’au transfert autorisé et sécurisé des ressources.

La rubrique Sauvegardes affiche la dernière copie vérifiée, les erreurs et l’état réel de planification. Le code prévoit une sauvegarde à 03:00 UTC avec rétention de 14 jours pour le futur hébergement Cloudflare. Ce cron n’est pas activé par le seul aperçu Sites. Les conditions de taille, restauration, secrets anti-abus et contrôles avant ouverture sont détaillées dans le guide Cloudflare.

## Langues

Français / English est disponible dans la boutique, les commandes, le suivi et la gestion. Les textes anglais sont chargés à la demande. Les produits conservent les mêmes photos, prix et stocks dans les deux langues ; les descriptions anglaises sont éditables dans la gestion. Les commandes mémorisent leur langue et les PDF sont générés dans cette langue. Voir `docs/LANGUAGES.md` pour les champs, le repli des anciennes entrées, le référencement et la maintenance.

## Accueil et partage des liens

L’accueil utilise une photo du catalogue initial (pagne orange, vue 2), sans animation automatique. Le bouton « Découvrir la collection » mène directement aux produits. Le survol agrandit doucement la photo de 5 %, sans changer le produit ; le lien de découverte reste accessible au clavier et sur écran tactile.

EB Garamond normal et italique est servi localement (licence SIL OFL dans `public/eb-garamond-OFL.txt`). Les noms de variantes internes `scene` restent conservés pour la compatibilité des photos existantes ; aucun moteur 3D n’est chargé.

Le build public (`PUBLIC_SITE_URL`) inclut les balises Open Graph et Twitter pointant vers `public/social/rayures-lavande-v2.jpg`. Cette image doit rester accessible sans authentification sur le domaine public. Les plateformes peuvent conserver un ancien aperçu en cache après un déploiement.
