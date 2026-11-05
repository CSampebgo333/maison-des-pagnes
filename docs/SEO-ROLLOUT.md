# Réalisation du plan SEO — novembre 2026

## Diagnostic du domaine avant modification

Contrôle HTTP public du 4 novembre 2026 depuis l’exécuteur : accueil, `/robots.txt`, `/sitemap.xml` et `/api/catalogue` répondent **200**. L’accueil possède `index, follow`, sa canonique HTTPS et des alternatives FR/EN. Le sitemap contient 28 URL. Le fichier robots publié combine les règles Cloudflare (dont les choix concernant les robots d’IA) et celles de l’application, avec la déclaration correcte du sitemap. Aucun changement Cloudflare n’a été effectué. L’outil de recherche web ne parvient pas à lire certaines de ces URL ; cela ne constitue pas une preuve de blocage Googlebot.

Le propriétaire a confirmé le 5 novembre 2026 que Search Console fonctionne et que Google accède à la plateforme et à toutes ses pages. Le contrôle d’accès est effectué. Les rapports d’indexation et de performance restent utiles pour suivre les résultats ; accessibilité ne signifie ni indexation de chaque page ni classement garanti.

## État des seize points

| Point | Réalisation / suite nécessaire |
| --- | --- |
| 1. Accès et indexation | Diagnostic HTTP ci-dessus ; aucun assouplissement de sécurité. Accès de Google confirmé par le propriétaire le 5 novembre 2026 ; suivre désormais indexation et performance. |
| 2. Rôle des pages | Accueil commercial, collection comparative, fiche précise, guide culturel, récit familial et parcours de commande distincts. |
| 3. Accueil | Introductions déjà validées conservées ; introduction de collection précisée, frais et liens internes partagés. Design du hero préservé. |
| 4. Métadonnées | Titres et descriptions FR/EN propres à chaque page ; identité de la maison cohérente ; prix produit lu au moment de la requête. |
| 5. Douze descriptions | Réécriture individuelle FR/EN après contrôle des visuels ; tableau avant/après dans PRODUCT-COPY-REVIEW.md. Prix et caractéristiques non supposés. |
| 6. Titres discrets | Noms visuellement masqués sur tous les écrans, accessibles aux lecteurs d’écran ; URL existantes conservées. |
| 7. Trois pages | Guide illustré avec archives créditées, histoire familiale avec texte validé, livraison avec illustration native et parcours interactif. HTML initial complet, même contenu éditorial que React. |
| 8. Informations commerciales | Frais Bobo/Ouaga, demande à confirmer, paiement à la remise, retrait et article défectueux partagés. Modalités incomplètes non inventées. |
| 9. Images | Alternatives par vue vérifiée, dimensions, variantes existantes, archives locales optimisées et créditées ; sitemap d’images conservé. |
| 10. Structure | Canoniques et hreflang réciproques, routes directes, HEAD et redirections, liens HTML, sitemap dynamique de 34 URL pour le catalogue initial, exclusion des données privées et de l’aperçu. |
| 11. Données structurées | WebSite au nom réel de la maison ; Organization/logo/contacts ; Product/Offer depuis le catalogue ; AboutPage/WebPage/BreadcrumbList pour les pages éditoriales. Ni faux avis, ni certification, ni politique de retour structurée incomplète. |
| 12. Performance | Hero limité aux images courante/précédente, anticipation d’une seule suivante sur connexion adaptée, sources responsive, priorités des cartes réduites ; nouvelles images WebP et animations par transform, réduction du mouvement respectée. CWV terrain non mesurés sans données du domaine après publication. |
| 13. Projet et catalogue | Source config et génération cohérentes ; migration éditoriale administrateur à trois voies sur le catalogue stocké, sauvegarde et contrôle de révision. Tests de non-régression et build. |
| 14. Informations nécessaires | Histoire et frais reçus. Prix/unité/composition/dimensions, calcul des délais, modalités complètes de retour, coordonnées définitives et photos familiales à préciser. |
| 15. Présence extérieure | Descriptions FR/EN, quatre publications suggérées, procédure partenaires/avis et étude préliminaire GBP/Merchant Center dans SEO-EXTERNAL-PRESENCE.md. Aucun compte ni message créé. |
| 16. Validation et mesure | Aperçu privé et PR pour validation. Domaine commercial non modifié dans ce travail. Publication, sitemap et mesures Search Console à poursuivre après validation et accès. |

## Appliquer les textes au catalogue réellement enregistré

Le build utilise `config/pagnes.json` puis génère `src/catalogue.json`. Modifier seulement ce dernier serait perdu au prochain build : les deux sources ont été mises à jour. Le catalogue enregistré dans D1/R2 reste prioritaire et n’est jamais écrasé par un catalogue statique.

Après publication du code validé, ouvrir Gestion > Collection et utiliser **Appliquer les descriptions relues** lorsque l’encart est présent. L’API authentifiée `/api/admin/catalogue/editorial-refresh` montre d’abord les champs concernés et vérifie la révision lors de l’application. Elle crée `catalogue/history/{revision}.json` avant d’écrire avec contrôle de concurrence. Les descriptions modifiées par la gestion, les photos remplacées, les prix, les propriétés non éditoriales et les quantités exactes sont protégés. Les anciens événements et PDF de commande ne sont pas réécrits. La disponibilité confirmée ne concerne que les modèles initiaux correspondants, sans inventer de nombre d’unités.

## WhatsApp propriétaire

Le code des alertes est prêt, désactivé par défaut, avec file durable distincte et essais simulés. Voir WHATSAPP.md. Appliquer la migration 0004 sur la base cible avant activation. Aucun message réel ni rétroactif. Connexion Meta et modèle approuvé nécessaires ; disposer de l’application WhatsApp Business ne termine pas cette configuration.

## Après validation et publication sur fasodanfani.shop

1. Appliquer les migrations D1 manquantes avant l’activation des alertes ; laisser celles-ci désactivées sans Meta configuré.
2. Vérifier `/`, `/collection`, les trois nouvelles pages et une fiche dans les deux langues, y compris en recharge directe et sur téléphone. Vérifier les vrais prix et unités avant publication des caractéristiques supplémentaires.
3. Appliquer l’actualisation éditoriale du catalogue si elle est proposée ; confirmer ses prix, photos et disponibilités puis conserver la sauvegarde.
4. Dans Search Console, inspecter l’accueil, la collection, une fiche et les trois nouvelles pages. Lancer **Tester l’URL publiée**, vérifier le rendu et les ressources, puis demander l’indexation des pages représentatives.
5. Soumettre ou actualiser `https://fasodanfani.shop/sitemap.xml`. Attendre 34 URL pour 12 produits publiés (ce nombre évolue avec le catalogue).
6. Utiliser le test des résultats enrichis de Google pour une fiche ; vérifier les propriétés exigées sans inventer les facultatives.
7. Relever une période de référence (28 jours) : impressions, clics, CTR, position moyenne, requêtes, pages et appareils. Distinguer « Faso Dan Fani », recherches d’achat/prix et recherches locales. Comparer à la même durée après plusieurs semaines et, si possible, à la saison précédente.
8. Comparer les demandes enregistrées et confirmées dans le tableau de bord sur les mêmes périodes. Aucun nouveau suivi publicitaire ou outil d’analyse visiteur n’est ajouté.
9. Pour la performance terrain, consulter Core Web Vitals/Search Console et tester accueil/collection/fiche avec PageSpeed Insights après publication. Objectifs : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Les poids de build et contrôles visuels ne démontrent pas à eux seuls ces résultats.

## Informations restant à fournir

- Prix exacts par modèle, unité vendue, dimensions et composition.
- Décompte des deux/cinq jours (départ, week-ends/jours fériés, transport inclus ou non).
- Retours : cas couverts, délai et frais ; ne pas déduire un droit de retour pour simple changement d’avis.
- Répartition des localités de Bobo entre 1 000 et 1 500 CFA.
- Coordonnées définitives, lieu/horaires de retrait publiables, photos autorisées et profils officiels.
- Accès accompagné ou exports Search Console ; configuration Meta à réaliser séparément.
