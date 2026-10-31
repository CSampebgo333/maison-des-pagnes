# Accueil et aperçu des liens

L’accueil photographique remplace le salon 3D. Son carrousel utilise quatre photos réelles du catalogue courant et leurs variantes existantes. Son défilement est indépendant de la photo choisie pour les aperçus de liens. La collection, les favoris, les commandes et la gestion gardent leurs données et leurs API.

## Image de partage

`public/social/rayures-lavande-v2.jpg` reprend exactement la cinquième photo du groupe « Rayures lavande » (`public/pagnes/pagne1-5.webp`). L’image complète conserve ses dimensions 1254 × 1254, sans recadrage, texte ajouté ni génération d’image. Seul le format est exporté en JPEG léger pour les messageries.

Les métadonnées Open Graph et Twitter des pages françaises et anglaises référencent cette photo, avec ses dimensions réelles et un texte alternatif localisé. Le build ajoute l’origine absolue depuis `PUBLIC_SITE_URL`. La page et l’image doivent être accessibles publiquement aux plateformes de partage.

Après déploiement, partager un nouveau message avec `https://fasodanfani.shop/`. WhatsApp et les autres plateformes décident du rendu et peuvent conserver un ancien aperçu en cache. Le nouveau nom de fichier distingue cette photo de l’ancien visuel orange. Le fonctionnement ne nécessite pas WhatsApp Business ni l’activation des notifications de commande.

## Garamond

EB Garamond normal et italique est auto-hébergé en WOFF2, avec les caractères latins nécessaires au français et à l’anglais. Source : [Google Fonts / EB Garamond](https://github.com/google/fonts/tree/main/ofl/ebgaramond). La licence SIL OFL complète accompagne les fichiers dans `public/eb-garamond-OFL.txt`.
