# Mes missions : recherche et pagination

La liste entreprise affiche les numéros de page, la première et la dernière page, un accès direct à un numéro et le total des missions correspondant aux critères. Une page contient 20 missions.

Critères cumulables : intitulé ou service, métier, lieu/nom d’établissement/FINESS, date locale de vacation, statut et horaires. Tri par création récente ou date de début croissante/décroissante. Les critères s’appliquent à toutes les missions accessibles, avant pagination.

Le numéro de page et les filtres sont portés par l’URL et conservés lors du retour d’une fiche ou d’un formulaire de modification. La validation d’une nouvelle recherche repart de la première page. Une page devenue vide propose un retour à la première page. Les liens de retour n’acceptent que le chemin local `/missions` et ses paramètres autorisés.

L’API `GET /enterprise/missions` renvoie `{items,total,limit,offset}`. Le compte et la liste sont calculés dans une seule requête avec le même périmètre de droits et les mêmes filtres. Les membres d’agence et d’établissement ne produisent pas de doublons. L’ancien `GET /missions` conserve sa réponse tableau pour le tableau de bord.

La date utilise le fuseau de chaque mission et l’intersection avec le jour demandé : une vacation de nuit peut apparaître pour chacun des deux jours concernés. Les tris sont limités à des expressions prédéfinies et départagés par l’identifiant de mission.

Contrôles : compilation frontend/backend ; tests unitaires de navigation ; tests PostGIS isolés du total, des dernières pages, des filtres cumulés, de l’isolation des comptes, du tri, des caractères littéraux et d’une nuit en Guadeloupe. Contrôles visuels avec API simulées pour 0, 1, 20, 21 et 3 092 résultats sur ordinateur, tablette et mobile.

La limite existante de l’API reste un offset de 10 000, soit 501 pages de 20. Aucune migration de données n’est nécessaire.
