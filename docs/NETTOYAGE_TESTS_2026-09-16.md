# Nettoyage des données fictives — 16 septembre 2026

Nettoyage demandé par le propriétaire, avec confirmation explicite du second lot après refus du contrôle automatique. Chaque lot a été sauvegardé avant suppression. Les dépendances ont été contrôlées pour refuser tout lien à un compte extérieur au lot.

## Résultat

| Élément | Supprimé |
| --- | ---: |
| Comptes fictifs |184|
| Organisations fictives |96|
| Profils fictifs |88|
| Missions fictives |49|
| Candidatures fictives |60|
| Affectations fictives |38|
| Documents et fichiers chiffrés fictifs |100|
| Confirmations fictives |33|
| Besoins fictifs |16|
| Sessions de test |58|
| Résultats matching MongoDB |288|
| Annonces externes TEST_FIXTURE |12|

Les notifications, commandes idempotentes et événements techniques liés ont également été retirés. Les journaux d’audit sont conservés. Les offres réelles importées ne sont pas concernées.40 fichiers temporaires/anciens identifiants de démonstration ont été déplacés dans la sauvegarde.

Un seul compte, celui du propriétaire, reste en base. Aucun profil, mot de passe ni donnée professionnelle du propriétaire n’a été supprimé. La correction de son adresse email a fait l’objet d’une autorisation distincte.

## Sauvegardes locales

- `E:/Interimatch/backups/nettoyage-tests-1789511364777` : premier lot36comptes.
- `E:/Interimatch/backups/nettoyage-tests-1789511635783` : second lot148comptes, annonces TEST_FIXTURE et fichiers temporaires.

Les sauvegardes contiennent les lignes avant suppression et les fichiers de documents chiffrés. Ne pas publier ces fichiers dans le frontend ou Git. Les preuves de tests et les scripts de tests du projet sont conservés. Le catalogue utilise désormais des fixtures interceptées, sans remplir la base réelle.
