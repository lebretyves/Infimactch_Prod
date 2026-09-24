# Exports n8n et provenance
Les neuf [JSON de référence](../../n8n/published-20260923/) proviennent des versions publiées observées le 23 septembre 2026 à 12:46 UTC. Le manifeste contient versions et identifiants de cette lecture. Ce ne sont pas les trois modèles de recette locale.

| Scénario | Déclenchement et usage |
| --- | --- |
| matches | Webhook de matching |
| confirmation | Webhook de confirmation et document |
| cancellation | Webhook d'annulation |
| reminders | Webhook de relance |
| reprise-et-rappels | Reprise périodique toutes les quatre heures |
| import-France-Travail | 7 h et 15 h, Europe/Paris |
| import-JobsPipe | 7 h, Europe/Paris |
| maintenance-quotidienne | Cron 15 4 * * *, Europe/Paris |
| discord-relay | Relais authentifié vers Discord |

Le nœud Cloud nommé « Toutes les 30 minutes » est réglé sur quatre heures. Consulter la [comparaison d'origine](../../n8n/published-20260923/README.md).

## Import de démonstration
Importer dans un espace de test, réassocier les credentials retirés, vérifier chaque URL, fuseau et destinataire, puis activer uniquement les scénarios voulus. Conserver identifiant d'exécution, date, entrée et résultat. Un workflow actif n'est pas une preuve de livraison réussie.

Les modèles de workflows/ servent à la recette isolée. La campagne du 23 septembre a utilisé PostgreSQL, MongoDB et n8n locaux : ne pas la présenter comme une nouvelle exécution du Cloud.

## À expliquer au jury
Matching : événement métier, appel n8n, traitement sous contrôle des droits et préférences, notification. Confirmation : affectation humaine, événement, préparation du PDF, reprise si nécessaire. Candidature et confirmation restent deux états différents.
