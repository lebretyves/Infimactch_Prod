# Cahier des charges et roadmap
Synthèse du 23 septembre 2026, fondée sur les [exigences V1](../../REQUIREMENTS_V1.md), le [planning à quatre](../../PLANNING_4_PERSONNES_11_JOURS.md) et le [chiffrage initial](../../CHIFFRAGE_V1.csv). La rédaction ne prouve pas une validation historique à J+2.

## Objectif
Permettre à un infirmier de trouver une mission compatible avec qualification, disponibilités et zone, puis de suivre sa candidature jusqu'à une décision humaine. L'établissement exprime le besoin ; l'agence organise le recrutement et l'affectation. Le POC ne remplace ni l'employeur ni la paie.

## Utilisateurs
Infirmier : dossier, disponibilités, recherche, candidature, calendrier et documents. Établissement : besoins, publication et suivi. Agence : sélection et affectation. Administration : comptes, MFA, incidents, imports et visibilité des sources.

## Fonctions et acceptation
| Lot fonctionnel | Résultat observable | Code à la racine |
| --- | --- | --- |
| Comptes et permissions | Familles de comptes, affiliations et refus des accès non autorisés | backend/src/auth ; backend/src/common |
| Profil professionnel | Qualification, expérience, zone et disponibilités conservées | backend/src/profiles |
| FINESS | Recherche d'établissements issue de données normalisées | backend/src/reference-data |
| Missions | Conditions, dates, lieu, rémunération, publication et états | backend/src/missions |
| Recherche et matching | Critères géographiques et métier, recommandations expliquées | backend/src/matching ; backend/src/listings |
| Candidature et affectation | Candidature distincte de confirmation ; décision humaine | backend/src/missions |
| Documents et agenda | Consultation des missions affectées et pièces protégées | frontend/src ; backend/src/documents |
| Automatisations | Matching, PDF et rappels avec suivi et reprise | backend/src/automation ; n8n |
| Notifications | Préférences et destinataires contrôlés, messages lisibles | backend/src/notifications |
| Imports externes | Nettoyage, doublons, provenance et visibilité contrôlée | backend/src/public-data |
| Exploitation | Administration, journaux, tests et sauvegardes | annexe/quality ; scripts/security |

## Roadmap de référence : quatre personnes, onze jours
| Jours | Travail prévu | Sortie attendue |
| --- | --- | --- |
| J1–J2 | Parcours, contrats API, fournisseurs, CDC et estimation | Décision de périmètre et risques |
| J3–J4 | Profil, pièces, FINESS, création et recherche | Première mission consultable |
| J5–J7 | Candidature, matching, affectation, PDF et workflows | Parcours intégré et import |
| J8–J9 | Droits, concurrence, accessibilité et recette | Version stabilisée et preuves |
| J10–J11 | Documentation, temps réels, répétition et livraison | Rendu et soutenance |

A : backend métier ; B : données/matching ; C : frontend ; D : infrastructure/documents/n8n. Tests et recette collectifs. Ce planning n'est pas un relevé des jours exécutés.

## Estimation
Les dix-huit lots conservés représentent **348 à 528 heures-personnes**. Quatre personnes sur onze jours donnent 44 journées-personnes. Six heures productives par jour donneraient 264 h, mais cette disponibilité n'est pas confirmée. Le dépassement de cette capacité hypothétique doit être expliqué par la réalité du réemploi, des disponibilités et du périmètre, sans transformer l'estimation en réalisé.

## Contraintes et qualité
TypeScript frontend/backend, PostgreSQL/PostGIS et MongoDB, au moins deux automatismes n8n, données publiques nettoyées et utilisées dans le produit, CLI, tests et couverture. Accessibilité, SEO et réduction des requêtes : preuves ciblées, sans certification globale.

## Limites
Accès fournisseurs, quotas, configuration des services et droits d'exploitation restent des dépendances. Une confirmation PDF n'est pas un contrat de travail complet signé. Le mode de démonstration peut rendre le RPPS facultatif ; il ne certifie pas une qualification. La conformité d'un lancement commercial reste à instruire.
