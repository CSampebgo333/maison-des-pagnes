# Notifications de commande sur WhatsApp

Les étapes du suivi et les pastilles de gestion passent de l’orange au jaune, puis au vert clair et au vert. Une annulation reste rouge. Les libellés et la bordure de l’étape active permettent de comprendre le suivi sans dépendre des couleurs. Le retrait en boutique n’affiche pas l’étape de livraison.

## Avant de déployer

Appliquer drizzle/0003_whatsapp_notifications.sql sur D1 **avant** de fusionner le code : la création des commandes et les détails de gestion utilisent les nouvelles colonnes et la file de notifications. La migration ne remplace ni commandes ni stock. Depuis cette branche et avec la configuration locale déjà renseignée :

    pnpm dlx wrangler d1 migrations apply maison-faso --remote --config deployment/cloudflare/wrangler.local.jsonc

La file fait partie des nouvelles sauvegardes métier. Les sauvegardes précédentes restent inchangées.

## Activer l’envoi

L’intégration est désactivée par défaut (WHATSAPP_ENABLED=0). Le seul numéro de boutique autorisé est +226 77 54 07 92. Le Worker vérifie le numéro affiché par Meta avant chaque traitement. Un numéro ou un lien wa.me seul ne permet pas d’envoyer automatiquement.

1. Connecter ce numéro à WhatsApp Business Platform / Cloud API dans Meta Business. Vérifier avec Meta les conditions de coexistence avec l’application mobile avant de modifier son enregistrement.
2. Récupérer le Phone Number ID (identifiant Meta, différent du numéro) et un jeton serveur ayant les permissions whatsapp_business_messaging (envoi) et whatsapp_business_management (lecture du numéro) pour ce compte.
3. Faire approuver deux modèles Utility sans bouton ni en-tête, avec deux paramètres de corps positionnels : français (code fr) et anglais (code en). Leur contenu et leurs codes doivent correspondre à cette configuration.
4. Tester avec un client volontaire avant activation publique. Les tests du dépôt simulent Meta et n’envoient aucun message réel.

Modèle français proposé :

> Maison du Faso Dan Fani — Commande {{1}} : {{2}}. Consultez votre lien de suivi pour les détails. Vous pouvez y arrêter les notifications.

Modèle anglais proposé :

> Maison du Faso Dan Fani — Order {{1}}: {{2}}. Open your tracking link for details. You can stop notifications there.

Exemples de paramètres : FDF-20261030-ABC12345 et « commande confirmée · Total : 25000 CFA · Date convenue : 2026-11-05 ». La remise du produit et le montant encaissé sont distincts. Aucun nom, adresse, note interne, motif interne ou jeton de suivi n’est envoyé à Meta.

Dans les variables de build Production, définir :

| Variable | Valeur |
| --- | --- |
| WHATSAPP_ENABLED | 1 après configuration et test |
| WHATSAPP_PHONE_NUMBER_ID | Identifiant Meta du numéro de la boutique |
| WHATSAPP_API_VERSION | Version Graph prise en charge par votre application Meta, au format vNN.N |
| WHATSAPP_TEMPLATE_FR | Nom exact du modèle français approuvé |
| WHATSAPP_TEMPLATE_EN | Nom exact du modèle anglais approuvé |

Ces valeurs non secrètes sont copiées dans la configuration générée. Ajouter séparément le secret runtime WHATSAPP_ACCESS_TOKEN au Worker existant, sans jamais enregistrer le jeton dans GitHub ou les variables de build :

    pnpm dlx wrangler secret put WHATSAPP_ACCESS_TOKEN --config deployment/cloudflare/wrangler.local.jsonc

L’envoi peut être facturé par Meta ; vérifier ses tarifs avant activation.

## Consentement et traitement

Lorsque la configuration est complète, le formulaire propose un choix facultatif, décoché par défaut, pour recevoir les mises à jour. Un indicatif international explicite est obligatoire. Les anciennes commandes ne sont pas inscrites automatiquement. Le client peut arrêter les notifications depuis son lien privé ; la gestion peut aussi les arrêter après une demande reçue ailleurs.

La réception de la demande et les changements publics (statut, frais, devis personnalisé, date convenue, paiement) créent un instantané dans la même transaction SQL que la commande. Les notes internes, les enregistrements sans changement public et les opérations refusées ne déclenchent aucun message.

Le Worker traite la file après une création ou modification réussie. Un cron toutes les cinq minutes reprend les messages en attente, par lots de dix et dans l’ordre des versions d’une commande. La sauvegarde reste à 03:00 UTC ; les déclenchements de notifications ne lancent pas de sauvegarde. Un retard reste possible selon le volume et l’état de Meta.

Les détails de gestion affichent les derniers états des notifications. **Soumis à WhatsApp ne prouve pas une livraison au téléphone** : les accusés de livraison via webhook ne sont pas intégrés. Ne pas annoncer une livraison à partir de la seule réponse de soumission.

Une réponse 429 est réessayée avec temporisation, cinq tentatives au maximum. Un rejet définitif est conservé en échec. Un délai dépassé, une réponse ambiguë ou un traitement interrompu reste à vérifier, sans répétition automatique qui risquerait un doublon. Vérifier ces cas dans Meta avant toute intervention manuelle. Un envoi exactement unique ne peut pas être garanti si la connexion est interrompue après acceptation par le fournisseur.

Pour suspendre les envois, remettre WHATSAPP_ENABLED=0 dans le build et redéployer. Les événements en attente sont conservés ; vérifier leur pertinence avant réactivation.
