# Affichage sur téléphone et tablette

Les ajustements de présentation concernent les viewports de 900 px ou moins. Le hero des grands écrans conserve son cadrage, son texte et son animation précédents. Sur petit écran, la photographie utilise toute la surface du hero sous la navigation ; le texte reste superposé et ne réduit pas ce cadre. Le cadrage `contain` conserve la photographie entière et ses proportions. Le zoom progresse de 88 % à 100 % de la taille maximale qui tient dans cette surface ; dès cette limite, le diaporama passe au pagne suivant. Aucun bloc séparé ni hauteur réservée au texte ne limite la photo. Le diaporama respecte la préférence de réduction du mouvement.

## Consultation d’un pagne

La vue rapide occupe tout l’écran. La photo et ses commandes sont regroupées dans la première hauteur d’écran, puis les informations du produit se lisent en faisant défiler. La fiche ouverte par son URL utilise la même visionneuse. L’image complète est conservée dans le cadre, sans étirement ni découpage forcé des motifs.

Les miniatures forment une bande horizontale défilante, avec flèches et boutons accessibles. La miniature active reste visible lorsque les flèches changent la photo. Chaque nouvelle photo réinitialise le zoom.

Un déplacement à un doigt laisse défiler la page, même après un zoom. Le pincement à deux doigts agrandit ou réduit la photo entre 100 % et 400 % ; un déplacement à deux doigts repositionne la photo agrandie. Un double toucher rapide alterne entre 100 % et 200 %. Les boutons et le curseur restent disponibles comme alternatives. Les événements tactiles ne sont consommés que pour les gestes de zoom ; les contrôles à la souris des grands écrans restent inchangés.

Les noms et couleurs sous les cartes sont masqués par des styles visuels sur petit écran, sans `display:none` ni `aria-hidden`, afin de conserver leur lecture par les technologies d’assistance. Les métadonnées et URL par couleurs restent communes aux deux présentations.

Les tests automatisés couvrent les déplacements simples, le pincement borné, le déplacement à deux doigts, le double toucher, l’annulation et le nettoyage des écouteurs. Une vérification tactile sur un téléphone physique reste recommandée, car une simulation d’événements ne reproduit pas l’arbitrage des gestes de chaque navigateur.
