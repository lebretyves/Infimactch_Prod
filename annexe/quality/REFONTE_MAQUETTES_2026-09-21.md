# Reprise des trois espaces à partir des maquettes

## Périmètre
Références réellement inspectées : PNG 04, 05, 09, 13, 14, 17 et 18 du ZIP InfiMatch_Maquettes_V1_Complet.zip. Conservation des contenus et actions de l’application existante : aucun texte, bouton, gestionnaire, contrat API ou composant TSX modifié. Seules dix feuilles CSS changent.

## Composition
Titres sans encadré sur fond ciel, cartes blanches discrètes, rayons réduits, navigation plus compacte. Agence : candidature prioritaire et compteurs côte à côte, offres et notifications réparties en colonnes, rapport en grille 2 × 2. Intérimaire : trois indicateurs, panneaux de préparation équilibrés, trois crushs avec taux réels conservés ; le bloc bleu marine reste conforme à la demande antérieure. Admin : FINESS et alertes en colonnes, six cartes de synthèse et tables occupant la largeur utile.

Il s’agit d’une adaptation de la composition des maquettes aux contenus actuels, pas d’une copie de leurs données fictives ni de leurs fonctionnalités.

## Validation
Builds utilisateur/admin réussis. Comparaison exacte des styles calculés, libellés et états des boutons sur 1440/768/375 px ; contrôle supplémentaire des dispositions 1024/320 px. Tableau de bord intérimaire renseigné avec mission confirmée et trois taux vérifié aux cinq largeurs. Tests locaux avec API fictives : actions agence et rapports, filtres et favoris des crushs, gestion des établissements, profil/dossier/calendrier, admin authentification/MFA/invitations/rôles/FINESS et opérations de gestion : réussis. Pas d’erreur JavaScript ou de débordement observé sur ces scénarios.

Les anciens scripts admin et profil nécessitent les adaptations temporaires déjà documentées dans TROIS_ESPACES_DESIGN_2026-09-21.md. Le script historique test-mission-publication attend en plus un placement accessibilité en haut, alors que le composant courant inchangé utilise footerAccessibility ; ce contrôle historique échoue, sans modification de ce composant ou de sa feuille dans cette refonte. Il n’est pas annoncé comme réussi.

Évaluation indépendante : utilisateur PASS ; admin PASS après correction de la navigation mobile (zone de 260 px, 18 liens accessibles au clavier, titre visible dès le premier écran à 320 et 375 px). Captures locales E:/Interimatch/audits/three-fronts-*-faithful-*.png, faithful-nurse-populated-*.png et admin-faithful-overview-*.png. Tests métier simulés : aucune écriture de données réelles ni message envoyé.
