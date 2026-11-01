# Référencement de la boutique

## Pages et catalogue

L’accueil conserve sa présentation et ajoute des conseils courts pour choisir, commander et se faire livrer. Chaque article publié dispose d’une fiche `/pagnes/{id}/{nom-descriptif}`. L’identifiant évite les collisions entre deux noms et permet une redirection 301 lorsqu’un nom change. L’anglais utilise le même chemin avec `?lang=en` ; le français et l’anglais ont chacun leur canonique, leurs balises hreflang, leur titre et leur description. Les anciennes adresses `/index.en` et `/index.en.html` redirigent vers `/?lang=en`.

Le Worker lit le catalogue enregistré pour générer les fiches, les liens HTML de l’accueil et `/sitemap.xml`. Un ajout dans la gestion devient donc découvrable sans nouveau build. Les prix et disponibilités proviennent du même catalogue que la boutique. Un article masqué ou supprimé est retiré des liens et du sitemap et renvoie 404. Une indisponibilité temporaire du stockage renvoie 503 avec `Retry-After`, sans publier un ancien catalogue à la place.

La réponse HTML contient le nom, les photos, le prix, la description et les caractéristiques renseignées avant le chargement de JavaScript. La boutique interactive garde le zoom, les favoris, la sélection et les demandes de commande. Les photos et les noms de la collection sont des liens HTML ; la vue rapide reste un bouton séparé.

## Métadonnées

Le domaine public doit être fourni au build avec `PUBLIC_SITE_URL=https://fasodanfani.shop`. Le build transmet cette origine au Worker. Les adresses de canonique, d’images sociales et du sitemap utilisent cette origine configurée, jamais un en-tête Host fourni par le visiteur. Les aperçus sans cette variable servent `noindex, nofollow`, bloquent les robots et ne publient aucun produit dans leur sitemap.

Chaque fiche possède des données structurées Product et BreadcrumbList. Le prix en XOF est inclus seulement lorsqu’il est renseigné. Le stock est déclaré InStock ou OutOfStock uniquement pour une disponibilité explicitement confirmée ; le statut « à confirmer » ne devient pas une fausse promesse de stock. Aucun avis, note, fabricant, délai ou tarif de livraison n’est inventé. Les caractéristiques absentes restent absentes. L’éligibilité et l’affichage d’un résultat enrichi restent à la décision de Google.

L’accueil conserve la cinquième photo lavande choisie pour les aperçus sociaux. Les fiches produit utilisent la photo principale de l’article. Les commandes, PDF, API et outils de gestion ne figurent jamais dans le sitemap. Les données du catalogue sont échappées avant insertion dans le HTML et le JSON-LD.

## Vérifier après fusion et déploiement

1. Ouvrir une fiche depuis la collection, recharger son adresse, changer de langue et vérifier le prix, les photos et l’ajout à la sélection.
2. Ouvrir `https://fasodanfani.shop/sitemap.xml`. Pour les douze pagnes initiaux publiés, il contient vingt-six adresses : deux accueils et vingt-quatre variantes de fiches. Le nombre évolue avec les articles publiés.
3. Dans Search Console, inspecter quelques fiches représentatives puis lancer un test en direct. Vérifier le HTML rendu, l’accès Google, les variantes linguistiques et l’absence de blocage Cloudflare. Demander l’indexation des fiches représentatives et laisser Google traiter le sitemap existant.
4. Valider les données produit avec le test des résultats enrichis de Google. Une propriété facultative absente n’autorise pas à inventer sa valeur.
5. Suivre les impressions, requêtes, clics et positions dans Performances. Comparer les tendances sur plusieurs semaines, pas uniquement une recherche personnelle. Les changements ne garantissent pas une position ni une date d’apparition.

Pour développer ensuite la visibilité, publier des informations utiles et vérifiables sur la boutique, les modèles, les dimensions et l’entretien. Utiliser naturellement « Faso Dan Fani » dans les descriptions plutôt que répéter artificiellement toutes ses variantes orthographiques. Ajouter le lien de la boutique aux profils sociaux et aux partenaires pertinents. Aucun achat de liens ni fausse recommandation n’est nécessaire.
