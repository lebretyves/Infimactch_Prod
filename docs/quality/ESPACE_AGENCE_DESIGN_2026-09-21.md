# Organisation de Mon espace agence — 21 septembre 2026

Périmètre corrigé explicitement par l’utilisateur : accueil agence, pas accueil intérimaire. La branche entreprise partagée avec les établissements est réorganisée ; les composants candidats et les données métier restent inchangés.

La création d’offre apparaît dans l’en-tête. Les candidatures à traiter sont prioritaires, les compteurs de missions et les raccourcis sont séparés. Les dernières offres et les notifications précèdent les résultats de recrutement. Les indicateurs disposent de deux colonnes sur grand écran et d’une colonne sur mobile ; les explications et exclusions restent accessibles par dépliage.

Fonctions conservées : création, modification, actualisation, établissements, toutes missions, gestion des offres, notifications avec identifiant de lecture ; changement d’organisation, période UTC, calcul et recalcul, tous taux et numérateurs/dénominateurs, délais, exclusions et définitions. États vides, erreurs et réessais conservés.

Validation : compilation frontend réussie ; recette navigateur avec API fictive sur tous les liens de gestion, les notifications, l’actualisation, le choix d’organisation, les dates, le calcul et recalcul, les définitions, les états vides, les erreurs/réessais du tableau de bord et du calcul. Absence de débordement horizontal aux largeurs 375, 768 et 1440 pixels. Aucun compte, candidature ni mission réelle modifié par la recette.

Captures avant/après dans E:/Interimatch/audits/agency-dashboard-{before,after}-{1440,768,375}.png.

Évaluation visuelle indépendante : PASS sur ordinateur, tablette et mobile ; navigation clavier et focus vérifiés.
