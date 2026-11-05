# Gestion et fiabilité — bilan du 5 novembre 2026

## Travail livré

- Rubrique « Les prochaines actions » : demandes à confirmer, dates convenues dépassées, remises prévues sous deux jours, commandes remises restant à encaisser et demandes de plus de dix minutes sans pièces jointes attendues. Les compteurs portent sur toutes les commandes concernées ; chaque liste présente les huit premières, avec accès à la fiche.
- Alertes de stock réel, avec un seuil par modèle réglable dans Collection (2 unités par défaut). Les stocks inconnus ou de démonstration restent distincts. La consultation du stock ne crée plus de quantités fictives ; le bouton de démonstration reste une action explicite.
- Recherche des commandes par statut, ville et période de création. Le CSV reprend les mêmes filtres, reste privé et neutralise les cellules pouvant devenir des formules de tableur.
- Brouillons de réponse FR/EN fondés sur les informations réellement enregistrées : un prix inconnu ou une demande à confirmer n’est pas présenté comme une vente acceptée. Le gestionnaire copie le brouillon ; aucun message automatique n’est envoyé.
- Coûts privés de fabrication/achat, transport et autres frais, avec révision propre et historique. Un coût inconnu reste vide. La marge indicative du tableau de bord porte uniquement sur les commandes remises aux coûts complets et sur les montants convenus ; elle ne constitue ni une comptabilité ni une preuve d’encaissement. Les clients ne voient pas ces données.
- Sauvegardes : vérification SHA-256 de la base ET des fichiers copiés, manifeste téléchargeable dans la gestion, conservation du dernier instantané valide si une copie échoue.
- Restauration : formats historiques et tables actuelles acceptés, chargement sans déclenchement de nouvelles notifications, ordre SQL compatible avec les clés étrangères. L’export pour une nouvelle base place les messages encore en attente/en cours en « à vérifier » afin d’éviter un renvoi historique automatique.
- Pièces jointes : validation de format/dimensions, quota d’envoi distinct, clés immuables. Une confirmation concurrente empêche un remplacement tardif du document approuvé.
- Photos ajoutées : décodage borné à la taille de la plus grande variante, puis création des trois versions légères ; l’original reste intact.
- GitHub Actions : TypeScript, tests, construction publique et audit des dépendances de production. Actions référencées par empreinte de commit, permissions en lecture seule. Dependabot propose des mises à jour hebdomadaires ; aucune fusion automatique.

## Vérifications effectuées

Les tests s’exécutent contre SQLite avec les migrations réelles, et un stockage R2 isolé en mémoire. Ils couvrent commandes classiques/personnalisées, retrait/livraison, stock concurrent, annulation, paiements enregistrés manuellement, coûts privés, filtres/export et restauration d’une sauvegarde contenant des clients inscrits aux notifications. La restauration est réellement importée dans une NOUVELLE base SQLite avec les clés étrangères actives ; les comptages, relations et états des files sont contrôlés. Les copies corrompues et les formats incomplets sont refusés.

Les contrôles navigateur locaux utilisent des données fictives et désactivent les écritures. Ils ne constituent pas une commande passée sur le domaine commercial. La configuration de test n’entre pas dans le build publié.

Un essai navigateur sur une photo de test de 2 400 × 3 200 pixels a conservé l’original à l’identique et produit des variantes de 150 × 200, 488 × 650 et 750 × 1 000 pixels. Il s’agit d’une validation du traitement, pas d’une mesure de vitesse réseau sur les photos commerciales.

L’audit des dépendances de production a renvoyé zéro vulnérabilité le 5 novembre 2026. Cela ne constitue pas une garantie de sécurité future ; le contrôle est aussi inclus dans la CI.

## Migration et compatibilité

La table privée `order_costs` est ajoutée par `drizzle/0005_order_costs.sql`. Elle ne modifie ni les commandes, ni les prix, ni le stock existants et n’effectue aucun paiement. Sites applique les migrations de l’aperçu avant le Worker. Sur l’hébergement Cloudflare indépendant, appliquer les migrations avec la configuration D1 déjà fonctionnelle et conserver les mêmes bindings.

Le nouveau code reste compatible avant cette migration : la rubrique coûts est indiquée comme indisponible, les autres fonctionnalités continuent de fonctionner et les sauvegardes n’essaient pas de lire une table absente. Le déploiement GitHub ne prouve pas qu’une migration a été exécutée sur D1.

## Ce qui nécessite les accès ou informations du propriétaire

| Élément | Suite nécessaire |
| --- | --- |
| Cloudflare commercial | Contrôler la version réellement déployée, l’état des migrations dont 0005, le dernier résultat de sauvegarde et la protection Access des API de gestion. |
| Vraie restauration métier | Exporter une sauvegarde récente et les objets de son manifeste ; répéter la recette dans une base de staging distincte, avant toute intervention sur la production. Choisir une destination privée pour une copie hors du compte Cloudflare. |
| Catalogue enregistré | Ouvrir Gestion > Collection, revoir puis appliquer les descriptions relues si l’encart est présent. L’agent n’a pas modifié les données du catalogue commercial depuis le dépôt. |
| Données commerciales | Prix exacts, unité vendue, dimensions, composition et quantités réelles. Aucun coût ni quantité réelle n’a été inventé. |
| Livraison et retours | Préciser le décompte des délais, les localités à 1 000/1 500 CFA, les modalités de retour/remboursement et les horaires/lieu de retrait publiables. |
| Confidentialité | Définir les durées de conservation des commandes, pièces jointes et coordonnées, ainsi que le canal de demande de suppression. Aucune suppression automatique de données métier n’est ajoutée sans ces décisions. |
| Contacts et identité | Coordonnées publiques définitives, email de la boutique, profils officiels et photos autorisées de la famille au travail. |
| WhatsApp | Connexion Meta, numéro d’envoi, secret serveur, modèles approuvés et essais réels avant activation. Le chantier reste différé conformément à la demande du propriétaire. |
| Mesures réelles | Vérifier les Core Web Vitals et le site sur de vrais téléphones, notamment Safari/iOS. La requête PageSpeed n’a pas abouti dans cet environnement : aucun score n’est annoncé. |
| Règles GitHub | La CI est versionnée ; son caractère obligatoire avant fusion nécessite une règle de protection de branche. Ne pas confondre une CI présente avec une règle obligatoire active. |

## Search Console : acquis et suivi

Le propriétaire a confirmé le 5 novembre 2026 que Google peut consulter la plateforme et toutes ses pages. Ce contrôle d’accès est donc considéré comme effectué ; il n’est pas demandé de le refaire. Cela ne signifie pas que toutes les pages sont déjà indexées ou bien classées. Le suivi utile reste celui des pages indexées, impressions, clics, requêtes et appareils, sur des périodes comparables.

Les requêtes de cet environnement vers le domaine commercial ont reçu HTTP 403. Elles ne remettent pas en cause le contrôle du propriétaire et ne justifient aucune baisse des protections Cloudflare. L’agent ne certifie donc pas une recette complète de production à partir des essais locaux.

## Restaurer une sauvegarde hors production

1. Télécharger les données et le manifeste depuis Gestion > Sauvegardes, puis les objets R2 référencés par le manifeste dans un dossier privé.
2. Exécuter `python3 scripts/verify-backup.py sauvegarde-boutique.json --manifest manifeste-sauvegarde.json --files-root /chemin/prive/export-r2 --sql-output /chemin/prive/restauration.sql`.
3. Importer le SQL UNIQUEMENT dans une nouvelle base vide ; recopier les fichiers vers leurs clés `key` d’origine sur un bucket de staging distinct. Le script vérifie l’arbre de sauvegarde, mais ne modifie pas un bucket distant.
4. Laisser les envois WhatsApp désactivés et examiner les files restaurées. Vérifier catalogue, documents privés, stock et suivi. Aucun client ne doit recevoir de message de test.

Le fichier SQL est créé avec des droits locaux privés et n’écrase jamais un fichier existant. Les anciennes sauvegardes sans empreintes de fichiers restent vérifiables pour la base ; leur contenu R2 ne peut pas être certifié par ce nouveau contrôle complet.

Les limites de la sauvegarde intégrée restent explicites : 10 000 lignes par table, 20 Mio de données JSON et 400 fichiers par instantané. Au-delà, prévoir les exports natifs D1 et R2 ; un instantané tronqué n’est jamais présenté comme une réussite.
