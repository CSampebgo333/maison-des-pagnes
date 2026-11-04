# Affichage sur téléphone et tablette

Les ajustements de présentation concernent les viewports de 900 px ou moins. Le hero des grands écrans conserve son cadrage, son texte et son animation précédents. Ses écritures sont blanches, avec un bouton blanc à texte prune, comme sur les petits écrans ; le dégradé derrière les textes sur grand écran s’étend de gauche à droite, avec une opacité de 85 % au départ, 50 % à 22 % de la largeur, puis transparence dès 65 %. Le dégradé des petits écrans reste conservé. Sur petit écran, la photographie utilise toute la surface du hero sous la navigation ; le texte reste superposé et ne réduit pas ce cadre. Le cadrage `contain` conserve les proportions. Les téléphones restent en orientation verticale ; de 480 à 900 px, le pagne est orienté horizontalement. Le zoom progresse de 91,52 % à 104 % du cadrage initial, soit un agrandissement supplémentaire discret de 4 % ; dès cette limite, le diaporama passe au pagne suivant. Aucun bloc séparé ni hauteur réservée au texte ne limite la photo. La mention « BOUTIQUE DE PAGNES AU BURKINA FASO » et sa version anglaise sont omises du hero sur les écrans de 900 px ou moins. Le diaporama respecte la préférence de réduction du mouvement.

## Consultation d’un pagne

La vue rapide occupe tout l’écran. La photo et ses commandes sont regroupées dans la première hauteur d’écran, puis les informations du produit se lisent en faisant défiler. La fiche ouverte par son URL utilise la même visionneuse. L’image complète est conservée dans le cadre, sans étirement ni découpage forcé des motifs.

Les miniatures forment une bande horizontale défilante, avec flèches et boutons accessibles. La miniature active reste visible lorsque les flèches changent la photo. Chaque nouvelle photo réinitialise le zoom.

Un déplacement à un doigt laisse défiler la page, même après un zoom. Le pincement à deux doigts agrandit ou réduit la photo entre 100 % et 400 % ; un déplacement à deux doigts repositionne la photo agrandie. Un double toucher rapide alterne entre 100 % et 200 %. Les boutons et le curseur restent disponibles comme alternatives. Les événements tactiles ne sont consommés que pour les gestes de zoom ; les contrôles à la souris des grands écrans restent inchangés.

Les noms restent accessibles mais visuellement masqués sur petit écran. Les lignes de couleurs sont retirées du rendu des cartes et des fiches sur tous les écrans. La rangée vide sous la photo est supprimée et le bouton d’ajout est aligné avec le prix. Les couleurs du catalogue restent disponibles aux filtres et au référencement. Les métadonnées et URL par couleurs restent communes aux deux présentations.

Les tests automatisés couvrent les déplacements simples, le pincement borné, le déplacement à deux doigts, le double toucher, l’annulation et le nettoyage des écouteurs. Une vérification tactile sur un téléphone physique reste recommandée, car une simulation d’événements ne reproduit pas l’arbitrage des gestes de chaque navigateur.

## Continuité avec la navigation desktop

Au-delà de 900 px, le fond du hero s’étend derrière la navigation. La teinte gris-taupe `#21171d` de l’ancienne navigation est utilisée à la fois pour le voile supérieur et le hero et sa transition se prolonge progressivement sous la barre. La ligne claire de séparation disparaît à l’entrée. Le survol et le focus conservent une surface translucide, avec des bordures de contrôle plus visibles au focus, au lieu de blanchir toute la barre. Le champ de recherche reprend une forme arrondie cohérente avec le sélecteur de langue. Après défilement et sur les pages de collection ou de produit, la navigation conserve son panneau blanc et ses textes prune. Les petits écrans restent inchangés.

## Collection complète

La page Collection et l’accueil utilisent le même carrousel par groupe : une seule rangée, trois pagnes visibles sur ordinateur portable et quatre à partir de 1 600 px. Le surplus reste accessible par glissement horizontal, par les flèches ou au clavier, sans retour à la ligne. La page Collection affiche tous les groupes ; l’accueil garde les trois premiers.
