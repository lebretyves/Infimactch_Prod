# Recette et revue du backend V1 — 15 septembre 2026

**Verdict : backend local fonctionnel sur les parcours testés, validation intégrale V1 encore incomplète.** La recette initiale passait 48 tests. Après corrections, 62 tests passent ; typecheck et compilation réussissent. Couverture : 77,94 % des lignes, 82,62 % des branches. Les tests ne prouvent pas à eux seuls la conformité de tous les endpoints.

## Ce qui fonctionne avec preuve

| Domaine | Vérification |
|---|---|
| Authentification | Sessions, renouvellement, déconnexion, expiration, Origin/CSRF, rejet des champs non autorisés |
| Droits | Isolation entre organisations, refus d'affectation par un acteur non autorisé, droits revérifiés lors d'un rejeu |
| Profils et disponibilités | Qualifications explicites, créneaux complets, nuits, indisponibilités et conflits |
| Matching | Score 93,75 de référence, distance PostGIS, classement des seuls admissibles, explications MongoDB et mode dégradé |
| Missions et candidatures | Publication, consentement versionné, sélection, affectation atomique, annulation, réouverture et clôture |
| Données publiques | France Travail : 50 offres réelles du lot et rejeu sans doublons ; FINESS : 174 621 identifiants officiels consultables |
| Annuaire Santé | Appels réels NOT_FOUND sur numéro synthétique et FOUND sur identifiant public fourni par l'API ; aucune affectation ni modification d'un profil réel |
| Automatisations | Trois workflows n8n locaux exécutés ; reprise de réservation expirée, reçu final obligatoire et génération PDF concurrente |
| Documents | Fichiers fictifs privés, chiffrement authentifié, refus d'altération, rotation des clés et reprise STAGING |
| Intégrité SQL | Zéro mission incohérente et zéro chevauchement d'affectations actives au contrôle final |

Preuves : [tests](proofs/verification.json), [couverture](proofs/coverage.txt), [intégrité SQL](proofs/review-integrity.json), [France Travail](proofs/france-travail-live.json), [FINESS](proofs/finess-live.json), [RPPS positif](proofs/ans-fhir-positive.json). Les preuves fournisseurs antérieures conservent leur date. Le test positif RPPS vérifie l'adaptateur, pas l'identité du titulaire d'un compte InfiMatch.

## Défauts corrigés pendant cette revue

| Priorité | Défaut constaté | Correction et test |
|---|---|---|
| P1 | Les propositions classaient aussi des dossiers inéligibles avec score null | Exclusion avant classement ; statut RPPS exposé séparément ; test côté infirmier et agence |
| P1 | Rejeu d'une création ou transition pouvant créer un doublon ou refuser une action déjà réussie | Clé obligatoire pour créations/modifications/transitions de mission, candidatures et besoins ; reçu dans la transaction, empreinte du contenu, verrou et contrôle des droits |
| P1 | Rejeu d'une confirmation après clôture pouvant la marquer CANCELLED | Le couple mission/affectation COMPLETED conserve une confirmation READY ; test de génération tardive et rejeu |
| P1 | Certaines listes ne permettaient pas d'aller au-delà de 20/50 éléments | limit/offset validés et tri stable pour listes secondaires ; tests de pages distinctes et limites invalides |
| P2 | Réponses privées sans politique de cache uniforme | Cache-Control: no-store pour sessions authentifiées et routes d'authentification |
| P2 | Documents de confirmation non publiés visibles dans la liste des métadonnées | Liste limitée aux confirmations effectivement liées à un état consultable ; téléchargement concurrent perdant refusé |
| P2 | Révision substantielle d'une mission ouverte sans événement de recalcul | Événement MissionOPEN avec la nouvelle version |
| P2 | Après cinq échecs, état de retour laissant croire à une nouvelle tentative automatique | EXHAUSTED explicite et CLI retry-outbox, refus d'une réservation encore active, audit de reprise |
| P2 | Contrat des nouvelles commandes et listes insuffisamment décrit | En-tête d'idempotence et principaux schémas de sortie ajoutés ; test du document OpenAPI |

Une nouvelle candidature ou affectation sur une mission déjà commencée est désormais refusée. Les recommandations et notifications excluent aussi les missions commencées. La consultation historique reste possible.

Le test d'expiration PDF vérifie que le traitement perdant ne remplace pas le document du gagnant. Le test d'outbox simule en base la réservation abandonnée : ce n'est pas un test de coupure électrique ni une restauration complète des services.

## Ce qui manque encore

| Point | État réel et action restante |
|---|---|
| Idempotence documentaire | Upload de justificatif et remplacement bancaire ne disposent pas encore du protocole complet de reçu/reprise avec fichiers. Un rejeu peut ajouter un document ; à traiter avant validation intégrale des commandes sensibles |
| Conservation des documents | Un traitement PDF perdant peut laisser un fichier chiffré orphelin, inaccessible via l'API. Purge contrôlée et politique de conservation à compléter |
| OpenAPI | Schémas ajoutés aux commandes et listes principales ; réponses complexes matching, tableaux de bord, données publiques et documents à compléter entièrement |
| Recette complète des endpoints | 62 tests couvrent les scénarios listés ; aucune couverture exhaustive de toutes les combinaisons de champs et permissions n'est revendiquée |
| Import des offres | Import réel et normalisation testés, mais rafraîchissement complet et traitement systématique des offres retirées chez le fournisseur à compléter |
| FINESS | Recherche du référentiel disponible ; intégration au formulaire et choix produit du blocage éventuel non réalisés. Les coordonnées absentes/ambiguës restent inconnues |
| Déploiement | HTTPS, TLS entre services, rôles de bases au moindre privilège et analyse des images non validés |
| Restauration complète | Code et restauration PostgreSQL déjà exercés ; restauration commune SQL + MongoDB + documents + clés + n8n non démontrée |
| n8n Cloud | Les trois workflows fonctionnent localement. L'instance Cloud fournie n'est pas connectée au backend local |
| Livrables collectifs | Frontend, responsive, accessibilité, SEO, étude, CDC, soutenance et cadre métier restent à réaliser/valider par l'équipe |

Les exigences non réalisées ne sont pas retirées de la V1. Attestation et références restent hors V1 conformément aux décisions utilisateur. Les versions futures ne sont pas ajoutées à ce chantier.

## Incidence pour le frontend

Toutes les commandes mission, candidature et création de besoin listées dans OpenAPI demandent maintenant `Idempotency-Key`. Générer une clé pour une nouvelle action et conserver la même lors d'une relance réseau. Une clé réutilisée avec un contenu différent produit HTTP 409 ; une clé absente produit HTTP 400.

Les listes existantes conservent leur forme de réponse (tableau ou enveloppe). Elles acceptent `limit` (20 par défaut, maximum 50) et `offset` (0 à 10000). Les propositions ne contiennent que les entrées admissibles ; `excluded` compte les entrées exclues et `rppsStatus` informe le professionnel.

La nouvelle exigence d'en-tête doit être prise en compte par les clients en cours de construction ; aucun frontend existant n'a été validé contre ce changement.

## Reproduction

```powershell
npm run verify
node scripts/verify-finess.cjs
npm run check:secrets
node backend/dist/cli.js retry-outbox --event UUID_EVENEMENT
```

Les tests utilisent des données fictives dans les bases locales et l'instance n8n locale. Le processus API appelé par n8n et les scripts de recette fournisseur ne sont pas instrumentés par la couverture. Un audit npm à zéro concerne uniquement les dépendances npm.

Code teste : `e5a2d72db53559d7ee787e95e9d07ecb6d6ea574`. Les modifications suivantes de preuves/documentation ne remplacent pas cette reference de code.


## Rectification France Travail du 15 septembre 2026

[Rectificatif du catalogue V1](RECTIFICATIF_CATALOGUE_V1.md) et [contrat des offres externes](OFFRES_EXTERNES_V1.md). Collecte multi-recherches, classement prudent, conservation des informations fournisseur et correspondance sans score complet. Lot Paris : 134 offres importees et rejeu sans doublon ; 120 IDE, 7 IADE, 1 IBODE, 6 non confirmees. Frontend et synchronisation exhaustive restent a completer.


## Comparaison partielle des annonces externes

Comparaison au profil connecte et option includeUncertainExternal implementees. Informations inconnues et indices restent distincts des incompatibilites connues. Aucun score externe complet. 71 tests reussis ; preuve complementaire avec offres reelles et profils fictifs dans docs/proofs/external-partial-live.json. [Explication a transmettre](EXPLICATION_MATCHING_DONNEES_MANQUANTES.md) et [contrat API](OFFRES_EXTERNES_V1.md). Integration frontend restante.
