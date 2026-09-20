# Optimisation du matching — 20 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

Distances calculées par lots de 100 avec la même formule PostGIS geography. Côté recruteur, une requête charge les affectations actives du lot puis les regroupe par candidat. Côté intérimaire, la distance est réutilisée pour enregistrer l’explication.

Pondérations, critères métier, autorisations, tris, pagination, historique MongoDB, index et schéma inchangés. Le matching reste une photographie : les vérifications transactionnelles lors d’une affectation restent nécessaires.

## Résultats

Durées médianes, appels directs du service local après préchauffage.

| Taille | Recherche | Simultanés | Avant (ms) | Après (ms) | SQL avant / après |
| --- | --- | --- | --- | --- | --- |
| 100 | forNurse | 1 | 207.8 | 97.3 | 184 / 65 |
| 100 | forNurse | 5 | 273.1 | 161.0 | 184 / 65 |
| 100 | forMission | 1 | 165.5 | 12.3 | 206 / 8 |
| 100 | forMission | 5 | 227.4 | 27.5 | 206 / 8 |
| 1000 | forNurse | 1 | 886.7 | 123.0 | 1093 / 83 |
| 1000 | forNurse | 5 | 1091.9 | 217.3 | 1093 / 83 |
| 1000 | forMission | 1 | 1565.0 | 60.7 | 2015 / 35 |
| 1000 | forMission | 5 | 1974.4 | 142.0 | 2015 / 35 |

À 1 000 éléments, 10 requêtes de distance par recherche et 10 requêtes de conflits côté recruteur. Le total SQL comprend aussi les transactions et l’enregistrement des explications.

## Vérifications

332 tests unitaires, 24 fichiers d’intégration, contrôles de sécurité PostgreSQL, compilation et contrat OpenAPI réussis. Le nouveau test compare exactement les distances scalaires et groupées sur PostGIS réel : coordonnées absentes, zéro, doublons, ordre, antiméridien et limites de rayon.

Deux campagnes optimisées réussies. Les empreintes métier avant/après sont identiques pour scores, admissibilités, exclusions, classement, deux premières pages et tri récent. Les identifiants d’explication générés sont exclus de la comparaison. Le tri récent utilise des publications absentes dans ce jeu.

## Reproduire et consulter les preuves

Commande depuis la racine : `node scripts/bench/run-matching.mjs --optimization`.

Dossier `../proofs/matching-optimization/` : `baseline.json` (référence relancée sur le code non modifié), `first-run.json`, `results.json` (seconde campagne), `tests-result.json`, `tests-suite-results.json` et `tests-source-snapshot.json`.

Le script compare automatiquement les empreintes métier de référence et contrôle les nombres de requêtes de distance/conflits. Le commit des mesures identifie la base Git ; les SHA-256 des sources dans le dernier résultat identifient le correctif local.

Données fictives de 100 et 1 000 profils/missions : 20 % de profils RPPS non vérifiés, 10 % avec affectation active et 20 % de missions hors rayon. Services PostgreSQL/PostGIS et MongoDB locaux isolés, identifiants éphémères, aucun appel fournisseur. Nettoyage des services et volumes du benchmark en fin d’exécution.

## Limites et ressources

Trois appels séquentiels et une vague de cinq appels simultanés par scénario. Ces mesures ne sont pas des durées navigateur en production. Pas de test à 10 000 profils ni de charge prolongée. La baisse de temps CPU observée est locale ; aucun montant, énergie ou CO2 économisé n’est chiffré. La mémoire PostgreSQL inclut les caches, le RSS Node est cumulatif dans un même processus.

## Livraison

Lot sauvegardé dans les deux copies locales et dans `E:/Interimatch/audits/matching-optimization-2026-09-20.zip`. Publication sur Main et Backend et déploiement explicitement autorisés par Yves le 20 septembre 2026. Les preuves ci-dessus concernent la validation locale ; le statut de livraison est fourni par les contrôles GitHub et Vercel du commit publié.