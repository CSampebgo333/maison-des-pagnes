# Référencement de la boutique

## Propriété Search Console et balise de vérification

La propriété de domaine `fasodanfani.shop` se vérifie dans le DNS Cloudflare avec le TXT fourni par Google. Dans Search Console, ouvrir Paramètres > Validation de la propriété pour retrouver la méthode utilisée. Conserver la vraie valeur `google-site-verification=…` fournie par Google ; un texte d’exemple ou des points de suspension ne remplacent pas le code réel. Le changement de code du site ne supprime pas ce record DNS.

Pour cette propriété de domaine déjà vérifiée, aucune balise HTML supplémentaire n’est nécessaire et aucune valeur Google n’est inventée dans le dépôt. La vérification prouve la propriété du site ; elle ne garantit pas sa position dans les résultats.

La méthode « Balise HTML » concerne les propriétés de type préfixe d’URL, par exemple `https://fasodanfani.shop/`. Si elle est choisie pour une propriété distincte, copier la balise exacte depuis la procédure de vérification et la placer dans le `<head>` du fichier racine `index.html`, après la déclaration du jeu de caractères et avant `</head>`. Ne pas la mettre dans un composant React, le corps de page, la description ou `robots.txt`. Le générateur de pages conserve une balise de vérification existante. L’ajout d’un autre propriétaire nécessite son accord ; une balise fournie par un tiers ne doit pas être ajoutée sans comprendre à quel compte elle appartient.

## Contrôles du head

Les titres, descriptions, canoniques et hreflang identifient l’accueil et chaque fiche en français et en anglais. Le JSON-LD de l’accueil utilise « Faso Dan Fani » comme nom préféré du site (WebSite), avec « Fasodanfani », « Faso Dan-fani » et « Faso Danfani » comme noms alternatifs. Les balises og:site_name utilisent le même nom court. L’organisation éditrice reste « Maison du Faso Dan Fani ». Cette préférence de nom est commune aux versions française et anglaise ; elle ne garantit ni le nom retenu par Google ni un classement pour ces expressions. L’image de partage choisie conserve son adresse HTTPS, son texte alternatif, ses dimensions 800 × 800 et son format JPEG. Les fiches ne réutilisent pas à tort ces dimensions pour leurs autres photos. Les en-têtes HTTP de langue respectent la langue déclarée par la réponse HTML.

Avant un déploiement sur un Custom Domain public, le validateur exige `PUBLIC_SITE_URL` avec le domaine réellement configuré, des canoniques FR/EN cohérentes, des pages indexables et un robots.txt ouvert au crawl. Il arrête le déploiement plutôt que publier par erreur un build d’aperçu privé marqué noindex. Les aperçus privés sans route de domaine public restent non indexables. Aucune balise de mots-clés artificiels ni code de suivi publicitaire n’est ajouté.

## Pages et catalogue

L’accueil présente clairement la vente de pagnes dès son titre, son introduction et son bouton vers les modèles et les prix. Ces textes commerciaux sont partagés entre le HTML initial et la boutique interactive, en français et en anglais. Il ajoute aussi des conseils courts pour choisir, commander et se faire livrer. Chaque article publié dispose d’une fiche `/pagnes/{id}/{nom-descriptif}`. L’identifiant évite les collisions entre deux noms et permet une redirection 301 lorsqu’un nom change. L’anglais utilise le même chemin avec `?lang=en` ; le français et l’anglais ont chacun leur canonique, leurs balises hreflang, leur titre et leur description. Les anciennes adresses `/index.en` et `/index.en.html` redirigent vers `/?lang=en`.

Le Worker lit le catalogue enregistré pour générer les fiches, les liens HTML de l’accueil et `/sitemap.xml`. Un ajout dans la gestion devient donc découvrable sans nouveau build. Les prix et disponibilités proviennent du même catalogue que la boutique. Un article masqué ou supprimé est retiré des liens et du sitemap et renvoie 404. Une indisponibilité temporaire du stockage renvoie 503 avec `Retry-After`, sans publier un ancien catalogue à la place.

La réponse HTML contient le nom, les photos, le prix, la description et les caractéristiques renseignées avant le chargement de JavaScript. La boutique interactive garde le zoom, les favoris, la sélection et les demandes de commande. Les photos et les noms de la collection sont des liens HTML ; la vue rapide reste un bouton séparé.

## Métadonnées

Le domaine public doit être fourni au build avec `PUBLIC_SITE_URL=https://fasodanfani.shop`. Le build transmet cette origine au Worker. Les adresses de canonique, d’images sociales et du sitemap utilisent cette origine configurée, jamais un en-tête Host fourni par le visiteur. Les aperçus sans cette variable servent `noindex, nofollow`, bloquent les robots et ne publient aucun produit dans leur sitemap.

Chaque fiche possède des données structurées Product et BreadcrumbList. Le prix en XOF est inclus seulement lorsqu’il est renseigné. Le stock est déclaré InStock ou OutOfStock uniquement pour une disponibilité explicitement confirmée ; le statut « à confirmer » ne devient pas une fausse promesse de stock. Aucun avis, note, fabricant, délai ou tarif de livraison n’est inventé. Les caractéristiques absentes restent absentes. L’éligibilité et l’affichage d’un résultat enrichi restent à la décision de Google.

L’accueil conserve la cinquième photo lavande choisie pour les aperçus sociaux. Les fiches produit utilisent la photo principale de l’article. Les commandes, PDF, API et outils de gestion ne figurent jamais dans le sitemap. Les données du catalogue sont échappées avant insertion dans le HTML et le JSON-LD.

## Descriptions et images dans Google

Le titre français proposé est « Faso Dan Fani — Vente de pagnes au Burkina Faso ». La description invite à comparer les motifs, consulter les prix et préparer une commande, avec les villes de livraison réellement prises en charge. Les fiches indiquent le prix courant hors livraison et distinguent les articles indisponibles. Le paragraphe culturel reste visible, mais son conteneur porte `data-nosnippet` pour ne plus servir de description de résultat. Google choisit toutefois ses propres titres et extraits selon la requête ; une métadescription ne les impose pas.

Le sitemap utilise l’extension image : chaque fiche liste ses photos publiques, et les accueils relient les photos principales du catalogue et l’image lavande choisie. Les données structurées ajoutent une CollectionPage et sa liste d’articles publiés, ainsi qu’un ImageObject représentatif ; les fiches relient leur image principale à leur WebPage. Les pages publiques autorisent `max-image-preview:large` pour Googlebot. Le favicon PNG carré complète le SVG. Le favicon, l’image de partage WhatsApp et la miniature de résultat Google remplissent des rôles différents ; aucune de ces balises ne garantit une miniature.

Le catalogue en ligne reste la source des images, des prix et des liens. Aucun stock, avis, réduction, service de paiement ou détail commercial absent n’est inventé pour obtenir un résultat enrichi.

## Vérifier après fusion et déploiement

1. Ouvrir une fiche depuis la collection, recharger son adresse, changer de langue et vérifier le prix, les photos et l’ajout à la sélection.
2. Ouvrir `https://fasodanfani.shop/sitemap.xml`. Pour les douze pagnes initiaux publiés, il contient vingt-huit adresses : deux accueils, deux pages Collection et vingt-quatre variantes de fiches. Le nombre évolue avec les articles publiés. Vérifier aussi les entrées `image:image` et l’accès public aux photos.
3. Dans Search Console, inspecter l’accueil français, sa variante anglaise et quelques fiches représentatives puis lancer un test en direct. Vérifier le HTML rendu, l’accès Google, les variantes linguistiques et l’absence de blocage Cloudflare. Demander l’indexation des fiches représentatives et laisser Google traiter le sitemap existant.
4. Valider les données produit avec le test des résultats enrichis de Google. Une propriété facultative absente n’autorise pas à inventer sa valeur.
5. Suivre les impressions, requêtes, clics et positions dans Performances. Comparer les tendances sur plusieurs semaines, pas uniquement une recherche personnelle. Les changements ne garantissent pas une position ni une date d’apparition.

Pour développer ensuite la visibilité, publier des informations utiles et vérifiables sur la boutique, les modèles, les dimensions et l’entretien. Utiliser naturellement « Faso Dan Fani » dans les descriptions plutôt que répéter artificiellement toutes ses variantes orthographiques. Ajouter le lien de la boutique aux profils sociaux et aux partenaires pertinents. Aucun achat de liens ni fausse recommandation n’est nécessaire.

Références : [extraits Google](https://developers.google.com/search/docs/appearance/snippet), [images Google](https://developers.google.com/search/docs/appearance/google-images), [sitemaps d’images](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps).

## Page Collection

`/collection` et `/collection?lang=en` affichent le catalogue complet, y compris les rangées au-delà des trois de l’accueil. Les liens de navigation, les retours des fiches, les canoniques, les alternatives linguistiques et le sitemap pointent vers cette page. Le HTML serveur contient les produits avant JavaScript ; la version interactive ajoute recherche, filtres et grille responsive. Les rangées supplémentaires sont conservées dans le champ existant `collectionRow`, sans migration SQL.
