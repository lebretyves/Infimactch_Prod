# Zone de recherche et alertes — 20 septembre 2026

Le domicile (`details.address`, `details.postalCode`, `details.city`) est distinct de la zone de travail (`latitude`, `longitude`, `radius_km`, `details.mobilityCity`).

Priorité de recherche : URL explicite, dernière recherche locale de cet utilisateur, zone du compte, puis proposition de commune du domicile. Le bouton « Utiliser cette zone pour mes alertes » enregistre explicitement le lieu et le rayon saisis. Une recherche ponctuelle ne modifie pas la zone du compte.

`PATCH /api/v1/profile/search-area` : session et profil intérimaire requis, protection CSRF globale. Corps `{latitude, longitude, radiusKm, city}` ; coordonnées numériques bornées, rayon de 0,1 à 1 000 km, ville de 1 à 200 caractères. Champs supplémentaires refusés. Réponse : `latitude`, `longitude`, `radius_km`, `details`.

La transaction verrouille le profil et modifie uniquement la zone. Domicile, disponibilités, transport et préférences de notifications sont préservés. Une sauvegarde identique ne relance pas le recalcul. Les autres changements déclenchent le mécanisme existant de recherche de missions compatibles. Les alertes Discord en attente vérifient la zone actuelle avant envoi ; les messages déjà envoyés ne sont pas rappelés.

Vérifications : builds frontend/backend réussis ; 33 tests backend ciblés ; 8 tests frontend ciblés. Évaluation navigateur locale : PASS sur ordinateur, tablette et mobile avec API fictive, recherche ponctuelle, sauvegarde explicite, erreur serveur et conservation du domicile. La persistance réelle en production de la nouvelle API n’a pas été testée.

Le bouton de localisation déjà en production a été testé séparément : retour GPS simulé, réponse serveur réelle, navigation aller-retour et refus de permission. Preuves : `E:/Interimatch/audits/localisation-production-2026-09-20/rapport.md`.

Modifications locales uniquement ; nouvelle API et interface à livrer ensemble. Aucun abonnement externe ajouté.
