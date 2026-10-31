# Installer la boutique sur un appareil

La boutique fournit un manifeste web (`public/manifest.webmanifest`) et des icônes PNG de 192 et 512 pixels, une icône maskable et une icône Apple. L’application installée ouvre l’accueil public dans une fenêtre autonome ; son URL de démarrage ne contient ni accès de gestion ni secret de suivi.

Sur Chrome ou Edge compatibles, le navigateur peut proposer son icône d’installation dans la barre d’adresse après avoir reconnu le manifeste sur HTTPS. Sur iPhone/iPad, utiliser Partager → Sur l’écran d’accueil. Aucun bouton d’installation personnalisé n’est ajouté dans la boutique. La disponibilité et le moment d’apparition de l’icône native dépendent du navigateur, du mode de navigation et de l’état d’installation.

Une connexion reste nécessaire pour le catalogue actuel, les commandes, les fichiers et la gestion. Le service worker existant continue de mettre en cache seulement les photos publiques versionnées : aucune nouvelle mise en cache HTML, API, authentification, commande ou PDF n’est ajoutée. Les futures versions du code sont chargées depuis le serveur à la réouverture de l’application.

L’installation est liée à l’origine. Tester de préférence sur le domaine final une fois connecté ; une installation depuis workers.dev ne migre pas automatiquement vers un nouveau domaine. La protection Cloudflare Access du test privé peut empêcher le navigateur de récupérer les métadonnées d’installation : vérifier aussi sur le domaine public lors de son ouverture, tout en conservant la protection de la gestion.

Vérification : tester Chrome/Edge en navigation normale sur HTTPS, ouvrir le manifeste et ses icônes, installer, lancer depuis le raccourci, vérifier l’accueil en mode autonome. Sur iOS, vérifier le parcours Partager → Sur l’écran d’accueil. Les tests automatiques vérifient le manifeste, les URL de lancement et les dimensions des icônes. Ils ne remplacent pas l’installation réelle sur chaque appareil.

Le fond de page, le pied de page, la section de demande personnalisée et la section de livraison sont blancs. L’accueil photographique présente un pagne orange avec un accès direct à la collection ; les petits contrôles et badges gardent leurs accents de couleur. La police EB Garamond est servie localement.
