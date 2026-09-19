# Continuité des automatisations — proposition, non basculée

## État observé

Les horaires publiés sont France Travail à 07:00 et 15:00, JobsPipe à 07:00, Europe/Paris. Les imports ont été retirés du cycle principal de 30 minutes. Les anciens déclencheurs Windows d’import sont désactivés. Les imports ne doivent jamais réactiver les notifications des anciens lots fictifs.

Le dernier relevé de l’interface d’essai a affiché 721/1 000 exécutions et 10 jours restants. C’est un relevé ponctuel, pas un compteur actuel garanti. Une exécution du workflow principal toutes les 30 minutes représente à elle seule 48 exécutions par jour, soit 1 440 sur 30 jours, avant les imports et workflows événementiels. Réduire les imports ne suffit donc pas à garantir le respect d’un plafond de 1 000. Les nombres de crédits JobsPipe et d’exécutions n8n sont indépendants.

JobsPipe a retourné QUOTA_EXHAUSTED ; le budget local de 1 000 et ses 241 réservations ne permettent pas de déduire un solde fournisseur de 759. Le code reporte l’essai au prochain renouvellement indiqué. Ne pas multiplier les clés ou relances pour contourner ce quota.

## Dépendances et conséquences d’un arrêt

Le backend persiste des événements à traiter puis `AutomationService.dispatch` appelle les webhooks n8n. Le scheduler principal appelle dispatch et maintenance. Une simple tâche Windows vers dispatch ne remplace donc pas n8n : un endpoint de workflow doit rester joignable depuis le backend Vercel. Quand l’orchestrateur est arrêté, les automatisations asynchrones peuvent attendre, même si le site et l’affectation continuent de répondre. Surveiller les dates des dernières exécutions, les files et les reprises.

## Options à décider avant l’expiration

1. Maintenir le service hébergé actuel : conserver les URL et secrets, choisir explicitement une capacité adaptée au nombre réel d’exécutions et au coût accepté. Aucun abonnement payant n’a été souscrit.
2. Héberger n8n sur un hôte administré par le projet : reprendre les exports versionnés, utiliser un stockage persistant et une clé de chiffrement sauvegardée, exposer les webhooks en HTTPS, protéger l’éditeur et tester la joignabilité depuis Vercel. Le poste Windows local ne fournit pas une disponibilité continue lorsqu’il est éteint. Aucun serveur externe ni tunnel public n’a été ouvert.

Le dépôt comporte une infrastructure Docker de développement/test. Elle prouve la reproductibilité des workflows en environnement isolé, pas une installation d’exploitation publique sécurisée. Une bascule doit tester notification, confirmation PDF et relance bornée sur données fictives, vérifier l’idempotence, désactiver l’ancien scheduler avant d’activer le nouveau, puis surveiller les premiers reçus. Conserver le retour arrière et les exports sans secrets.

## Critères de recette après choix

- URL de webhook joignable et authentifiée, aucun secret dans les exports publics.
- Un seul scheduler actif par fonction et fuseau explicite.
- Réessais bornés, doublons ignorés, anciennes missions fictives toujours inhibées.
- Confirmation et annulation sans nouveau renvoi d’anciens emails.
- Imports respectant les quotas, reçus observés aux prochains vrais créneaux ; ne pas avancer l’horloge de production pour simuler leur passage.
- Maintenance et sauvegardes contrôlées séparément.

Cette proposition ne constitue pas une migration d’hébergement. Le choix d’hébergement, son coût éventuel et son niveau de disponibilité restent à valider avant exécution conformément au lot 8.

Sources officielles consultées le 19 septembre 2026 : [choisir le déploiement n8n](https://github.com/n8n-io/n8n-docs/blob/main/docs/get-started/choose-how-to-use-n8n.md), [hébergement administré par le projet](https://github.com/n8n-io/n8n-docs/blob/main/docs/deploy/host-n8n/README.md). Le logiciel Community est disponible sans licence payante ; cela ne rend pas gratuits le serveur, l’administration ou une disponibilité continue.
