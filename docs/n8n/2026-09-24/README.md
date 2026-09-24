# n8n — état après migration du 24 septembre 2026

Compte de production : **https://infimatch2.app.n8n.cloud/home/workflows** (accès opérateur authentifié).

Les dix workflows ont été copiés ; leurs définitions ont été comparées trois fois. Neuf sont actifs sur le nouveau compte. L’ancien compte `infimatch.app.n8n.cloud` conserve les dix workflows, désactivés pour éviter les doubles traitements.

| Workflow | État observé sur le nouveau compte |
| --- | --- |
| Relais Discord sécurisé | Actif |
| Matching | Actif |
| Confirmation | Actif |
| Annulation | Actif |
| Rappels par webhook | Actif |
| Import France Travail | Actif |
| Import JobsPipe | Actif |
| Maintenance quotidienne | Actif |
| Relances 4 h et avant mission | Actif |
| Ancienne reprise et rappels | Inactif ; remplacé par le nouveau planificateur |

## Cadence et destinataires

- Une vérification toutes les **4 heures**, sans message s’il n’y a rien à traiter. Ce planificateur seul représente 6 exécutions/jour, soit 180 sur 30 jours ; les autres workflows et relais s’ajoutent.
- Mission non pourvue : au moins 24 h après publication, puis au moins 24 h entre deux relances ; trois maximum. Destinataires : membres actifs de l’agence et de l’établissement. Arrêt si la mission n’est plus ouverte, a commencé ou si ses relances sont désactivées.
- Mission confirmée : infirmier affecté et membres actifs des organisations concernées ; un rappel dans la fenêtre J-1, puis un dans la fenêtre H-2. Affectation active, mission pourvue et horaires précis requis. **Le rappel H-2 peut être manqué avec une cadence de quatre heures.**
- Notifications internes, emails via SMTP2GO et Discord suivant les destinations/préférences configurées ; dédoublonnage côté backend.

## Exports et preuves

[JSON du nouveau planificateur](relances-multicanales.json) : modèle d’import volontairement inactif, sans connexions privées. Cet état du fichier ne signifie pas que le workflow Cloud est inactif. Raccorder les credentials sur le compte destinataire avant activation et conserver un seul planificateur de relances.

[Exports historiques des autres workflows](../published-20260923/README.md). Les identifiants Cloud et connexions ont changé lors de la copie. Les captures historiques montrent la structure, pas l’état actif actuel.

Backend et relais Discord utilisent le nouveau compte depuis le 24 septembre. Un email de confirmation a été accepté par SMTP2GO à 13 h 51 (Paris) ; son destinataire a confirmé sa réception. Le retour automatique de livraison dans l’application restait `NOT_REPORTED` lors du contrôle : cette réception ne valide pas le raccordement des webhooks SMTP2GO.

Les tests de copie et de connexion ne constituent pas une recette réelle exhaustive de tous les workflows. Aucun secret ni export privé Vault n’est inclus dans ce dossier.
