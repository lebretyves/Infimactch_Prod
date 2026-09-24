# Reprise des compléments des branches — 24 septembre 2026

## Changements repris

La comparaison porte sur les références distantes Yves et Epitech récupérées le 24 septembre. La branche de revue contient déjà les deux branches principales et les travaux business/notifications. La présente reprise conserve les corrections ultérieures au lieu de fusionner aveuglément des versions anciennes.

| Commits d’origine | Traitement |
| --- | --- |
| `6cf072f` | Reprise de la présentation Mon compte et de sa feuille de style ; erreurs Google distinguées d’une absence d’association, récapitulatif et conséquences de clôture lisibles. Contrôles métier existants conservés. |
| `94c2c21` | Renommage missionCrushs vers missionTopMatches et du test associé, appliqué à l’implémentation courante ; filtre des offres externes Epitech conservé. Les preuves historiques ne sont pas réécrites. |
| `6cb3f12`, `9f4d0ff` | Activation de neuf fichiers de tests pertinents dans npm test. Suppressions de suites navigateur et de scripts de preuve non reprises ; assertion de délai existante conservée. |
| `6e7b82c`, `faee153`, `d597d21`, `8fcd6ae` | Boutons publics, Mon compte dans le menu et déconnexion rouge déjà présents dans la version Epitech consolidée ; variantes anciennes d’espacement/icônes non réappliquées. |
| `6945510`, `500180c`, `b3a9941` | Google Maps, visibilité des sources et calendrier déjà repris avec corrections ; voir le rapport des six fonctionnalités. |
| `25227b1` | FINESS déjà repris, avec lancement sécurisé sous Windows et tests conservés. |
| `aab9df2` | og:url déjà présent dans le HTML, le générateur des pages et QualityRoot. |
| `b269d5f`, `0f19c0d` | Contrat de géolocalisation inverse, test OpenAPI et archivage du contrat dans la CI déjà présents. |
| `698292d`, `c9a528e` | Documentation et refactorisation déjà reprises sous d’autres identifiants (`d302f29`, `9de9550` notamment), avec docs_intern renommé en docs. |

Les branches de sauvegarde ont été conservées. Un commit restant « en avance » dans GitHub peut avoir été repris sous un autre identifiant ; ce document ne prétend pas rendre tous les anciens commits ancêtres de main.

## Vérification

[Preuves](../proofs/branch-completion-20260924/README.md) : 105/105 tests frontend, typage/build, parcours navigateur et contrôle ciblé Mon compte réussis. Aucun changement backend dans ce complément ; les 688 tests unitaires et la couverture de 95,00 % restent ceux de la campagne backend précédente.

## État de publication

Reprise destinée aux PR Yves #3 et Epitech #30. Les dernières branches principales observées sont Yves `53c09bd` et Epitech `856ff02`. Les derniers déploiements Production enregistrés dans GitHub sont `53c09bd` ; les versions de la branche de revue sont des Preview. Cette reprise ne prouve ni une fusion ni un déploiement. La revue indépendante exigée par Yves, le budget Actions Epitech et les prérequis migration/activation des rappels restent à traiter.
