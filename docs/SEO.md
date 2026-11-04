# Référencement — Maison du Faso Dan Fani

Le domaine commercial est `https://fasodanfani.shop`. La configuration publique exige `PUBLIC_SITE_URL` avec cette origine HTTPS. Les aperçus privés laissent cette valeur vide : robots bloqués, `noindex, nofollow`, pas de canoniques publiques ni d’entrées de sitemap. Le DNS de validation Search Console existant est conservé ; aucune fausse balise de vérification n’est ajoutée.

## Pages, langues et identité

L’accueil, `/collection`, les fiches `/pagnes/{id}/{nom-descriptif}` et les trois pages `/faso-dan-fani`, `/notre-maison`, `/livraison-et-commandes` sont disponibles en français et en anglais. L’anglais conserve le chemin français avec `?lang=en`. Les URL existantes restent stables ; les anciennes adresses de fiche redirigent en 301 si leurs couleurs changent. Les variantes ont leur canonique propre et des hreflang FR/EN/x-default réciproques.

Le nom du WebSite et `og:site_name` est **Maison du Faso Dan Fani**, cohérent avec l’organisation et l’interface. Les variantes orthographiques du terme culturel ne sont plus déclarées comme noms alternatifs artificiels de la boutique. Le titre commercial principal et le design du hero validés restent conservés.

Les métadonnées et données structurées sont partagées par le Worker et le navigateur. L’accueil utilise WebPage, la collection CollectionPage/ItemList, les fiches Product/Offer/BreadcrumbList et les pages éditoriales AboutPage ou WebPage avec fil d’Ariane. Le logo, les téléphones et les zones desservies sont réels ; aucune adresse, certification, note ou politique de retour complète n’est inventée.

## Catalogue réellement enregistré

D1/R2 reste la source prioritaire des textes, prix et disponibilités. Une erreur de stockage sur les routes commerciales produit un 503 réessayable plutôt qu’un catalogue statique trompeur. Les pages éditoriales restent accessibles sans dépendre du stockage du catalogue.

Les douze descriptions ont été réécrites individuellement après contrôle des photographies. Les remplacements FR/EN et les textes précédents figurent dans [PRODUCT-COPY-REVIEW.md](PRODUCT-COPY-REVIEW.md). Le catalogue initial vient de `config/pagnes.json`, puis de `scripts/prepare-catalogue.mjs` : la génération conserve les disponibilités confirmées.

Pour un catalogue déjà enregistré, l’actualisation administrateur sauvegarde le document existant, compare sa révision et applique uniquement les champs correspondant à la référence connue. Une modification ultérieure par la gestion, une photo remplacée ou un prix différent ne sont pas écrasés. Voir [SEO-ROLLOUT.md](SEO-ROLLOUT.md). Les stocks précis de démonstration restent distincts de la disponibilité générale confirmée par le propriétaire.

## Titres et photographies

Les noms des pagnes restent masqués visuellement **sur tous les écrans**, tout en conservant les titres et liens nécessaires aux lecteurs d’écran. Les lignes de couleurs sous les photos restent retirées. Les couleurs alimentent toujours les filtres, les noms SEO et les URL, sans paragraphes invisibles de mots-clés.

Les alternatives des photos distinguent les vues vérifiées : plié de face, partiellement déplié, drapé, gros plan et autre angle. Les nouveaux articles utilisent les libellés fournis par la gestion. Les miniatures et versions scene/display demeurent versionnées, et les originaux restent disponibles pour le zoom. Les images d’archives sont locales, compressées et créditées : [EDITORIAL-IMAGE-CREDITS.md](EDITORIAL-IMAGE-CREDITS.md).

Le hero ne monte que les photos courante et précédente ; une seule suivante peut être anticipée sur connexion adaptée. Des sources responsive et des priorités limitées évitent de charger toutes les photos du carrousel immédiatement. La réduction du mouvement est respectée. Les performances terrain nécessitent une mesure après publication, distincte des contrôles de build.

## HTML, sitemap et confidentialité

Le HTML initial contient les descriptions, les prix, les photos et les vrais liens vers les fiches, même si un carrousel n’affiche qu’une portion de sa rangée. Les pages éditoriales utilisent exactement le même générateur de contenu que React. Le contenu est échappé avant insertion HTML et JSON-LD.

Le sitemap dynamique reprend tous les articles publiés, leurs photos et les nouvelles pages dans les deux langues : **34 URL pour les douze modèles initiaux**. Un ajout ou masquage dans le catalogue se reflète dans le sitemap. Les produits masqués/supprimés renvoient 404 ; une rupture temporaire conserve la fiche avec la disponibilité adéquate.

Les API et PDF privés portent des en-têtes `noindex` et `no-store`. Les pages de gestion sont non indexables, même lorsque le paramètre `gestion` n’est pas le premier de l’URL. L’aperçu reste exclu des moteurs. Aucun outil publicitaire ou suivi visiteur supplémentaire n’est ajouté.

## Suivi

Le diagnostic initial, les seize points, la procédure de publication, les compléments attendus et le suivi Search Console sont documentés dans [SEO-ROLLOUT.md](SEO-ROLLOUT.md). Les textes de profils, idées de publications et vérifications GBP/Merchant Center sont dans [SEO-EXTERNAL-PRESENCE.md](SEO-EXTERNAL-PRESENCE.md).

Les objectifs LCP ≤ 2,5 s, INP ≤ 200 ms et CLS ≤ 0,1 ne sont pas déclarés atteints sans mesure. Ni le balisage, ni un sitemap, ni une réécriture ne garantissent un classement ou l’affichage d’un résultat enrichi.

Références : [site names](https://developers.google.com/search/docs/appearance/site-names), [images](https://developers.google.com/search/docs/appearance/google-images), [produits](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [langues](https://developers.google.com/search/docs/specialty/international/localized-versions), [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).
