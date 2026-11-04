# Installer la boutique sur un appareil

La boutique propose une application web installable (PWA), avec manifeste et icônes locales. Elle conserve les mêmes produits et parcours que le site, sans promettre un fonctionnement hors connexion. Le catalogue courant et les commandes nécessitent une connexion.

## Invitation discrète

Une carte apparaît après 4,5 secondes de consultation active : en bas à droite sur ordinateur, en bas de l’écran sur téléphone avec respect de sa zone de sécurité. Elle est non modale, peut être fermée et ne déplace pas le focus. Elle attend la fermeture des fiches, du panier ou d’un formulaire de commande.

Le navigateur conserve l’heure de sa dernière apparition dans `maison-faso-install-notice-v1`. Un nouvel affichage est possible après 24 heures révolues ; les visites intermédiaires ne repoussent pas ce délai. Par exemple, apparition lundi à 08 h, nouvelle visite lundi à 21 h sans apparition, puis apparition mardi à 09 h. Plusieurs onglets partagent cette préférence. Ce suivi est local à l’origine et au navigateur ; il ne prétend pas identifier une personne entre appareils ou après effacement de ses données. Aucun cookie ni compte client supplémentaire n’est créé. Si le stockage est inaccessible, l’invitation automatique est omise pour éviter les rappels répétés.

La carte n’apparaît pas dans une fenêtre d’application reconnue comme installée. `appinstalled` et l’acceptation d’une installation mémorisent également ce choix sur le navigateur. Aucun navigateur ne fournit une détection universelle de toutes les installations ou désinstallations réalisées ailleurs.

## Installation selon le navigateur

Chrome/Edge et les navigateurs compatibles peuvent fournir `beforeinstallprompt`. L’événement est conservé dès le démarrage et déclenché seulement après un clic sur « Installer l’application ». Sans cet événement, la carte affiche « Comment l’installer » : instructions de partage/écran d’accueil sur iPhone/iPad, Fichier → Ajouter au Dock sur Safari Mac, ou menu d’installation sur les autres navigateurs compatibles. Une instruction manuelle ne prétend pas qu’une installation native a réussi.

Le mode autonome, le manifeste, les icônes et le cache de photos existants sont conservés. Les API, commandes, PDF et authentifications ne sont pas ajoutés au cache. Tester l’installation native sur le domaine HTTPS final : la protection de connexion de l’aperçu privé peut empêcher la proposition native. Une installation sur un domaine de test ne migre pas automatiquement vers le domaine final.

Références : https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event et https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app
