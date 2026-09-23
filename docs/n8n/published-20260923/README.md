# Exports n8n publiés — 23 septembre 2026

Ces neuf JSON proviennent de la lecture authentifiée de n8n Cloud dans Firefox. Les nœuds et connexions sont ceux de `activeVersion` ; les paramètres globaux sont ceux du workflow. Les neuf workflows sont actifs et leur `versionId` correspond à `activeVersionId` au moment de la lecture. L'horodatage et les identifiants de versions figurent dans `manifest.json`.

Aucun workflow n'a été modifié, publié ou exécuté pendant cette lecture. Les références aux credentials ont été retirées : il faut les réassocier dans n8n avant toute utilisation d'un import. Aucun secret d'authentification n'est fourni dans ce dossier.

## Comparaison avec le dépôt

Les nœuds (type, paramètres et options) et connexions des huit workflows suivants correspondent aux définitions du dépôt, en ignorant les identifiants techniques des nœuds, les positions graphiques et les références de credentials : relais Discord, matches, confirmation, cancellation, reminders, import France Travail, import JobsPipe, maintenance quotidienne.

Les différences de « reprise et rappels » sont :

- Le nœud publié s'appelle **Toutes les 30 minutes**, mais son paramètre réel est `field: hours, hoursInterval: 4`. Le fichier du dépôt l'appelle **Toutes les 4 heures**. Les connexions utilisent donc deux libellés différents pour ce même déclencheur.
- Le contrôle de disponibilité publié ne précise pas `method`, tandis que le dépôt écrit explicitement `GET`. Son URL et son délai de 30 secondes sont identiques.
- Les paramètres Cloud n'indiquent pas explicitement `timezone: Europe/Paris`, présent dans le dépôt. Ne pas déduire le fuseau global de l'instance à partir de cette absence.
- Le Cloud expose `binaryMode: separate`, absent du JSON du dépôt.

Le constat du 19 septembre sur un intervalle de 30 minutes était historique : la lecture actuelle confirme **4 heures**, malgré le nom resté inchangé. Il ne faut donc pas utiliser les anciennes captures pour déduire l'intervalle actuel.

Horaires lus aujourd'hui : France Travail à 7 h et 15 h, JobsPipe à 7 h (Europe/Paris explicitement indiqué dans ces workflows) ; maintenance `15 4 * * *`, Europe/Paris. Ces réglages et le statut actif ne prouvent pas à eux seuls une exécution réussie ou une livraison Discord/email.

Les workflows de `workflows/confirmation.json`, `matches.json` et `reminders.json` restent ceux de la recette isolée. Leur présentation est différente de celle des versions Cloud. Pour documenter les captures de production, utiliser ce dossier daté et son manifeste.
