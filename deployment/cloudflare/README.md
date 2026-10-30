# Passage vers le compte Cloudflare du propriétaire

Le site privé Sites utilise déjà les bindings DB et BUCKET. Le futur hébergement indépendant doit utiliser le compte du propriétaire et une configuration distincte. Aucun abonnement n’est activé par ce dépôt.

## Configuration requise avant ouverture publique

1. Activer Workers, D1 et R2 dans le compte du propriétaire en vérifiant les conditions de facturation R2. Créer `maison-faso` (D1) et `maison-faso-files` (R2). Conserver les identifiants de ressources dans une configuration de déploiement, jamais les secrets dans Git.
2. Copier `deployment/cloudflare/wrangler.example.jsonc` vers `deployment/cloudflare/wrangler.local.jsonc` (ignoré par Git). Remplacer l’identifiant de la base et les paramètres Cloudflare Access. Conserver ce fichier dans ce dossier pour que ses chemins relatifs restent valides.
3. Créer une application Cloudflare Access protégeant `/api/admin/*` et le chemin de connexion d’administration. Autoriser uniquement `l’adresse e-mail du propriétaire` après authentification. Fournir issuer et audience de cette application au Worker. `AUTH_MODE=cloudflare` est obligatoire : les en-têtes ChatGPT ne sont jamais fiables sur l’hébergement indépendant. Le Worker vérifie la signature, l’expiration, l’émetteur, l’audience et l’e-mail du JWT Access.
4. Construire avec la version Node du projet et le gestionnaire indiqué dans package.json. Déployer d’abord sur une adresse de recette privée. Appliquer les migrations SQL de `drizzle/` avec Wrangler avant le Worker. Les migrations sont uniquement structurelles.
5. **Transférer les données réelles**, pas seulement le code : exporter le document catalogue courant, l’inventaire, les commandes et événements depuis la base Sites ; importer dans la nouvelle D1. Copier les objets R2 `catalogue-assets/`, `catalogue/photos/`, `catalogue/history/`, `managed-orders/` et les PDF temporaires encore valides si nécessaire. Les nouvelles photos ajoutées par l’administration ne sont pas dans GitHub. Suspendre les écritures pendant le transfert final et contrôler comptages et échantillons.
6. Remplacer tous les stocks de démonstration par un inventaire réel. Vérifier le parcours client et les contrôles Access avant ouverture. Choisir le domaine, configurer PUBLIC_SITE_URL au build et vérifier le référencement séparément.

Le catalogue migre automatiquement du document R2 vers D1 si la table `catalogue_documents` est vide. Les stocks initiaux aléatoires sont des données de démonstration : ils se chargent uniquement dans les lignes absentes à l’ouverture de la rubrique Stock. Aucun stock existant n’est remplacé. Les nouveaux modèles restent à renseigner.

## Sauvegarde et restauration

- Export D1 complet (schéma + données) via les outils officiels Cloudflare, et copie indépendante des objets R2. L’export CSV du tableau de bord est un outil métier, pas une sauvegarde complète.
- Conserver les sauvegardes chiffrées hors dépôt public ; tester une restauration dans une base de recette.
- D1 Time Travel couvre la base seulement ; il ne restaure pas R2. Ne pas supprimer les fichiers d’une commande tant que la politique de conservation n’a pas été fixée.
- À mettre en place avec le compte connecté : planification des exports, surveillance des quotas, protection contre l’abus du formulaire public, durée de conservation et procédure d’effacement des coordonnées clients.

## Limites de cette première version

- Aucun paiement mobile n’est déclenché ni vérifié automatiquement. Le gestionnaire saisit l’encaissement à la remise, via Orange Money ou Wave.
- Aucun message WhatsApp n’est envoyé automatiquement. Le client ouvre WhatsApp et envoie lui-même le lien ou le fichier.
- Les alertes sont dans le tableau de bord ; les notifications e-mail nécessitent un service d’envoi distinct.
- Le client accepte un devis par échange avec la boutique ; le gestionnaire enregistre cet accord avant confirmation. Il n’y a pas encore de signature ou acceptation de devis en ligne.
- Stock disponible = stock non réservé. La confirmation déduit les unités, l’annulation avant remise les restitue. Une commande terminée ne s’annule pas : les retours/remboursements nécessitent un parcours supplémentaire.
- La saisie manuelle actuelle couvre un modèle du catalogue par demande ; les demandes clients en ligne peuvent contenir plusieurs modèles.
- Les statistiques portent sur les demandes créées dans la période choisie et leurs montants actuels, pas sur un journal comptable d’encaissements datés.
- Les pages de suivi utilisent un secret aléatoire dans le fragment URL, transmis à l’API par Authorization. Elles n’exposent pas les coordonnées ni les notes internes. Toute personne possédant le lien peut lire ce récapitulatif.

## Sauvegarde quotidienne et protections ajoutées

Le Worker expose un gestionnaire scheduled et la configuration Cloudflare prévoit le cron `0 3 * * *` (03:00 UTC / Burkina Faso). Cela ne signifie pas que le cron est déjà enregistré dans le compte : il ne le sera qu’après déploiement de cette configuration. Sur Sites, aucune planification n’est déclarée et la gestion l’indique explicitement.

La sauvegarde logique des cinq tables métier est lue dans une seule transaction batch D1, relue et vérifiée SHA-256. Les fichiers R2 ajoutés par la gestion et les documents de commandes sont copiés sous un préfixe privé daté. Le pointeur « latest » n’est remplacé que lorsque l’ensemble réussit. Le dernier échec est visible dans la rubrique Sauvegardes. Les instantanés sont conservés 14 jours. Les fichiers statiques du catalogue initial restent dans GitHub et le build ; ils ne sont pas dupliqués dans ces copies R2.

Ce mécanisme est volontairement borné : 10 000 lignes par table, 20 Mo de données et 400 fichiers par exécution. Il refuse de marquer une sauvegarde tronquée comme complète. Au-delà, passer à l’export D1 natif et à un mécanisme de copie incrémentale. Les sauvegardes sont dans le même compte R2 : ce n’est pas une protection contre la perte du compte ou la suppression du bucket. Garder une copie indépendante est nécessaire avant un usage critique. Le téléchargement de l’administration contient uniquement les données JSON ; les fichiers sont sous le préfixe du manifeste dans R2.

Vérification de restauration, sans toucher à la production : `python scripts/verify-backup.py /chemin/sauvegarde.json`. Pour produire un export SQL à importer dans une NOUVELLE base vide : ajouter `--sql-output /chemin/prive/restauration.sql`. Le script refuse de remplacer un fichier existant. Valider les comptages, recopier les fichiers du manifeste vers leurs clés originales et tester le site de recette avant toute bascule. Aucun outil de restauration destructrice n’est exposé dans le tableau de bord.

Avant déploiement indépendant, ajouter un secret SECURITY_SALT aléatoire (32 octets minimum) dans les secrets du Worker. Ne pas le mettre dans Git. Les créations de demandes/liens sont limitées à 30 tentatives par heure et par IP ; le suivi et ses uploads à 90 par minute. D1 assure le compteur atomique. Seule une empreinte salée temporaire est stockée, jamais l’IP brute. Le cron nettoie les compteurs expirés. En mode Cloudflare, les opérations publiques concernées refusent de fonctionner si cette configuration manque.

Des en-têtes limitent les sources de scripts, bloquent l’intégration d’objets actifs, désactivent caméra/micro/localisation/paiement navigateur et empêchent la mise en cache des API/documents privés. HSTS est activé sur l’hébergement indépendant HTTPS. Cloudflare Access et la vérification cryptographique du JWT restent nécessaires pour l’administration. Aucun service ne garantit une sécurité absolue : vérifier Access, les chemins alternatifs, les quotas et une sauvegarde réelle après connexion du compte.

## Configuration de référence et commandes

`wrangler.jsonc` à la racine est la configuration suivie du Worker existant, utilisée par les déploiements automatiques. Le build génère `dist/server/wrangler.json` à partir de ce fichier et adapte les chemins du Worker, des assets et des migrations. `deployment/cloudflare/wrangler.example.jsonc` reste un modèle pour un autre compte. `CLOUDFLARE_D1_ID`, si fourni au build, remplace l’identifiant D1 dans la configuration générée. La configuration racine reste du JSON strict malgré son extension `.jsonc`, car le build la lit avec `JSON.parse`. Les identifiants D1 et Access et l’e-mail sont fournis par les variables de build, sans être inscrits dans la configuration suivie. `SECURITY_SALT` reste uniquement dans les secrets du Worker.

Pour le déploiement manuel historique, il est possible de continuer à utiliser explicitement la configuration locale à chaque commande Wrangler. Le build ne lit pas ce fichier local et ne remplace pas ses paramètres :

```sh
pnpm build
pnpm exec wrangler d1 migrations apply maison-faso --remote --config deployment/cloudflare/wrangler.local.jsonc
pnpm exec wrangler secret put SECURITY_SALT --config deployment/cloudflare/wrangler.local.jsonc
pnpm exec wrangler deploy --config deployment/cloudflare/wrangler.local.jsonc
```

Ces commandes nécessitent Wrangler installé dans l’environnement et une connexion au compte Cloudflare du propriétaire. Wrangler n’est pas une dépendance du dépôt. Générer un secret aléatoire d’au moins 32 octets et le saisir à l’invite dédiée ; ne jamais le placer dans un fichier versionné. Les commandes ci-dessus sont à exécuter après création des ressources, configuration Access et validation du transfert de données. Pour le build public, fournir également `PUBLIC_SITE_URL` avec l’origine HTTPS réelle.

Ne pas déployer directement la configuration générée avec ses valeurs d’exemple : elle contient des paramètres Access et D1 à compléter et ne contient pas le secret. Le build ne crée aucune ressource, n’applique aucune migration et n’active aucun cron dans un compte à lui seul.

## Déploiement automatique depuis GitHub

Connecter le Worker existant `maison-du-faso-dan-fani` au dépôt `CSampebgo333/maison-des-pagnes` dans Workers Builds. Utiliser la racine du dépôt, la branche de production `main`, la commande de build `pnpm ci:build` et la commande de déploiement `pnpm deploy:cloudflare`. Le fichier racine `wrangler.jsonc` fournit les noms de bindings et les paramètres communs ; aucun fichier local ignoré n’est nécessaire. Wrangler est exécuté à la version 4.155.0. Le fichier `pnpm-workspace.yaml` autorise le script d’installation esbuild nécessaire à une installation sans interaction.

Renseigner les variables de build `CLOUDFLARE_D1_ID`, `CATALOGUE_ADMIN_EMAIL`, `ACCESS_ISSUER` et `ACCESS_AUD` avec les valeurs de la configuration locale fonctionnelle. Le build les injecte dans `dist/server/wrangler.json`, qui est le fichier réellement déployé ; le script de déploiement refuse les valeurs manquantes ou d’exemple.

Configurer Node 24.22.1 (`NODE_VERSION`) et pnpm 11.25.0 (`PNPM_VERSION`) dans l’environnement de build. Laisser `PUBLIC_SITE_URL` absent pendant le test privé. Le secret runtime `SECURITY_SALT` existe déjà sur le Worker et ne doit pas être ajouté aux variables de build ni remplacé lors des déploiements. Conserver les mêmes bindings D1 et R2.

Désactiver les builds/déploiements des branches non productives dans le tableau de bord. Ne pas ajouter de commande de déploiement de branche qui exécute `wrangler deploy`. Les URL de version restent désactivées (`preview_urls: false`). L’application Access existante protège le nom d’hôte de test ; cette protection ne dépend pas du référencement.

Après connexion, vérifier un premier build de `main`, sa version déployée et les parcours protégés. Un échec des contrôles ou du build arrête la commande avant le déploiement. Les changements sur une branche de travail ne doivent être publiés qu’après fusion dans `main`.

Les migrations ne sont pas appliquées automatiquement par cette configuration. Pour une version qui change le schéma, prévoir une sauvegarde puis appliquer explicitement les migrations compatibles avec la version en service avant la fusion ; ne pas fusionner une fonctionnalité dépendant d’un schéma absent. Un déploiement du code ne remplace pas le catalogue D1, les commandes, les stocks ou les fichiers R2. Les paramètres d’Access devront être réévalués lors de l’ouverture publique.
