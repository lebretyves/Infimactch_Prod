# Reste à faire backend — V1 et kickoff — 16 septembre 2026

> Pour le reste à faire actuel, utiliser le [bilan consolidé main](BILAN_V1_MAIN_2026-09-16.md), qui tient compte des dernières corrections et des commits frontend annulés.
> Mise à jour : filtre intérim contextualisé, retrait des offres explicitement non conformes et commandes de conservation récupérés. Voir [les corrections, preuves et limites de conservation](RECUPERATION_BACKEND_RETENTION_2026-09-16.md).
> Mise à jour postérieure : les sept évolutions parsing/frontend sont développées et testées. Voir [la livraison et ses limites](LIVRAISON_SEPT_EVOLUTIONS_V1.md). 194 annonces recalculées ; 149 tests backend isolés et 12 tests frontend réussis. Les statuts antérieurs ci-dessous restent historiques pour ces points.

Audit local croisé avec un autre agent, sur REQUIREMENTS_V1, le kickoff extrait, le consolidé et le code. Les changements locaux ne constituent pas une livraison Git/CI validée.

## Priorités fonctionnelles

1. JobsPipe : exiger une preuve contextualisée que le poste est en intérim ; le mot intérim dans la présentation du recruteur ne suffit pas. Les CDI sont déjà exclus.
2. Désactiver les offres précédemment importées quand le fournisseur les déclare fermées, expirées ou non conformes. Actuellement seule l’exclusion CDI désactive ces anciennes lignes.
3. Définir fraîcheur et retrait des offres disparues. Un import limité à dix résultats ne permet pas de conclure à une disparition ; une panne ne doit pas vider le catalogue.
4. Raccorder le parseur expérimental au backend : schéma métier avec preuves, unités, niveau d’exigence, contradictions, inconnus et version ; stockage/migration ; recalcul idempotent ; réponses API. Les trois fiches de démonstration du frontend sont des exemples relus, pas un traitement généralisé.
5. Améliorer attribution service/expérience, alternatives de diplômes, primes, roulements et localisation ; mesurer omissions et faux positifs sur un nouveau corpus indépendant. Les textes tronqués restent explicitement incomplets.
6. Enrichir la correspondance externe avec les champs validés : son API existe déjà.

## Sécurité et données

7. Définir et appliquer conservation, suppression/anonymisation et exercice des droits sur SQL, documents, notifications, audits et sauvegardes ; le TTL Mongo ne couvre pas ces éléments.
8. Compléter ou justifier le chiffrement en transit selon la topologie cible : HTTPS navigateur et Vault existent, TLS PostgreSQL/Mongo/n8n reste à traiter.
9. Rejouer une restauration globale représentative avec missions, relations et documents déchiffrables, puis les exercices rotation et incident. Les scripts existent déjà.

## Validation et livraison

10. Compléter les réponses et erreurs OpenAPI : profils, authentification, matching, correspondance, catalogue, tableaux de bord et documents.
11. Rejouer intégrations isolées et couverture sur la révision finale, notamment Google, JobsPipe, exclusion CDI et futur parsing. Les dernières intégrations ne couvrent pas tous les changements locaux récents.
12. Terminer la recette par rôle et qualification : besoin, mission, candidature, affectation, PDF, annulation, conflits, rejeux et cloisonnement entre organisations.
13. Valider installation depuis clone propre, migrations, seed, Vault, n8n, affiliations CLI, nettoyage du jeu de démonstration et documentation ; publier le lot puis vérifier sa CI.
14. Vérifier les exécutions planifiées réelles, quotas, erreurs 429 et dernière réussite, sans réessai ni rattrapage automatique conformément à la demande utilisateur.
15. Corriger les caractères d’encodage dégradés dans la documentation de livraison.
16. Google : résoudre le signalement origin_mismatch côté origines JavaScript du client OAuth, puis tester une connexion réelle. Une configuration API active ne prouve pas la connexion navigateur.

## Déjà réalisé, à ne pas reconstruire

Authentification et intégration Google, préférences de notification API, matching déterministe et explications, pagination/filtres API, trois workflows, exclusion des comptes désactivés, correction quota PDF et verrouillage nettoyage/écriture, droits minimaux des bases, migrations sécurité et scripts de sauvegarde/restauration.

## Périmètre

Le kickoff exige des données nettoyées alimentant une fonctionnalité visible, pas un LLM ni une extraction exhaustive. Le parseur enrichi, JobsPipe et les horaires programmés sont des compléments demandés. Sauvegarde hors machine, surveillance, certificats publics et domaine dépendent de la cible d’exploitation. Contrats complets, signature, paie et chatbot restent hors V1.
