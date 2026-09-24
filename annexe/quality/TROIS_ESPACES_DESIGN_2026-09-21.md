# Présentation des trois espaces — 21 septembre 2026

Demande : s’inspirer de InfiMatch_Maquettes_V1_Complet.zip pour les couleurs, cadres et répartition de l’espace, sans changer les contenus, boutons ou fonctionnalités.

## Changements
Neuf modules CSS uniquement : fond bleu ciel, cartes blanches, cadres bleu marine et turquoise, sections et statistiques mieux séparées. Espaces intérimaire et agence/établissement via les styles partagés ; administration via sa feuille indépendante. Les trois crushs et leurs taux restent conservés. Aucun TSX, contrat API, flux métier, texte ou règle explicite de bouton modifié.

## Vérification
- Builds utilisateur et admin réussis ; polices présentes dans le livrable admin.
- Comparaison exacte avant/après des libellés, états et styles calculés des boutons sur les tableaux de bord et quatre écrans admin : 1440, 768, 375 px.
- Admin vérifié également à 320 px. Correction de la disposition de l’en-tête tablette pour éviter la coupure du bouton Actualiser.
- Évaluation visuelle indépendante : utilisateur PASS ; admin PASS après correction.
- Fixtures navigateur : actions agence, rapports/filtres, notifications, crushs/top3/taux/favoris, états vides/incomplets/erreur, ajout/suppression d’établissement : PASS.
- Profil, dossier, calendrier : états renseignés/vides, captures aux trois largeurs, absence de débordement et d’erreur JavaScript : PASS.
- Admin : authentification/MFA/invitations/rôles, FINESS, liens/membres/notifications/exploitation, récupération/clôture : PASS avec données fictives.
- Les anciens scripts requests-smoke et expanded-smoke attendaient un ancien libellé de réauthentification sans MFA et un ancien message d’erreur serveur. Copies temporaires adaptées au contrat actuel : PASS. Aucun changement produit pour satisfaire ces tests.
- L’ancien test profil attendait un input pour une identité désormais rendue en lecture seule. Contrôle visuel temporaire adapté au balisage existant : PASS ; aucune modification de ce parcours.
- Diff et contrôle des secrets : PASS.

Les essais fonctionnels utilisent des API simulées et ne prouvent pas les écritures réelles en production. Pas de modification backend ni migration. Captures locales : E:/Interimatch/audits/three-fronts-*-evaluation-*.png et admin-evaluation2-*.png.
