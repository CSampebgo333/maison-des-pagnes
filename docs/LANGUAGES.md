# Français et anglais

Le sélecteur commun est disponible dans la boutique, la gestion et le suivi. Ordre de préférence : paramètre `lang=fr|en` dans l’URL, choix mémorisé sur l’appareil, première préférence française/anglaise du navigateur, français par défaut. Le changement ne recharge pas la page et ne remet pas à zéro les favoris, la sélection ou le formulaire. Les données ne sont pas traduites par un service externe.

Le dictionnaire anglais est un module séparé chargé seulement si nécessaire, une fois par session ; les photos et les produits ne sont pas téléchargés à nouveau pour changer les textes. La scène conserve son moteur et son cache de textures ; seules les étiquettes sont actualisées. Les dates et nombres utilisent Intl. La devise reste XOF/CFA et la couverture de livraison reste au Burkina Faso.

## Produits et administration

Les champs historiques `name`, `description`, `pattern`, `unit`, `composition`, `dimensions` sont les sources françaises. `translations.en` contient leurs variantes anglaises. Le document catalogue persiste dans D1, sans dupliquer les identifiants, stocks ou photos. Les douze modèles initiaux ont des descriptions anglaises et des suggestions d’occasions. Les changements effectués dans l’administration prennent priorité sur le catalogue initial.

Le formulaire propose des champs anglais séparés et demande nom/description anglais pour publier un modèle. Actualiser les deux langues lorsqu’une description change. Les anciennes entrées sans traduction restent compatibles : l’interface anglaise utilise un titre neutre et invite à contacter la boutique, sans inventer des détails. Un motif, une composition ou une unité inconnus ne sont pas inventés. Les libellés de vues standards sont traduits ; une vue avec libellé libre français sans traduction est nommée simplement « View N » en anglais. Les commentaires clients et notes libres restent dans leur langue d’origine.

La recherche couvre les noms, descriptions et couleurs français/anglais. Les valeurs de filtres, codes de statut et de disponibilité restent canoniques : traduire leur affichage uniquement.

## Commandes, PDF et suivi

La migration `0002_order_language.sql` ajoute `orders.language` avec français par défaut pour les anciennes commandes. Chaque nouvelle demande conserve la langue choisie lors de son enregistrement. Les lignes sauvegardent le nom français et le nom anglais au moment de la demande, en plus du prix/quantité communs. L’historique n’est donc pas modifié lorsqu’on renomme ensuite un pagne.

Le PDF et la page photo utilisent la langue de la demande ; le texte est traduit avant calcul des retours à la ligne. Le lien de suivi conserve cette langue dans `?lang=` et son secret dans le fragment. Le client peut toujours changer la langue d’affichage ; le bon enregistré conserve la langue d’origine. Les messages WhatsApp utilisent la langue de l’interface au moment du partage. Les API conservent des erreurs canoniques et leur affichage peut être traduit ; aucune saisie libre client n’est automatiquement réécrite.

## Référencement et maintenance

Le build produit une page d’accueil française et une anglaise avec contenu HTML avant JavaScript. Le Worker sert l’anglais sur `/?lang=en`. Sur le domaine public configuré, canonique, hreflang fr/en/x-default et sitemap renvoient aux deux URL. La langue est aussi indiquée sur l’élément html. L’aperçu privé reste non indexable ; aucune indexation n’est garantie. Il n’y a toujours pas de pages produit individuelles rendues côté serveur.

Pour ajouter un texte d’interface, utiliser `t('Texte français')` et ajouter sa traduction dans `src/locales/en.json`. Les tests vérifient la couverture des appels explicites, les préférences, la recherche, les PDF et la langue des commandes. Garder les placeholders `{0}`, `{1}` et les données métier hors des traductions. Le build ne dépend pas d’un fournisseur de traduction.
