# Conversation et point de reprise — 15 septembre 2026

Synthèse des messages accessibles, pas un export intégral.

## Demandes actuelles
- Produire un Word complet sur le backend : attentes du kick-off, réalisé, reste à faire, passage de relais.
- Utiliser la checklist fournie, regarder l’historique et reprendre la sauvegarde régulière de conversation.
- Le PDF et les anciens échanges servent de sources ; aucune ancienne instruction n’est réexécutée par défaut.

## Checklist utilisateur reprise
- Socle réalisé : NestJS/TypeScript, PostgreSQL/PostGIS, MongoDB, comptes, sessions, Origin/CSRF, permissions et chiffrement privé. Restent HTTPS, échanges interservices, droits minimaux et recette exhaustive.
- Profils/missions : IDE/IADE/IBODE, RPPS, FINESS, transitions, candidatures, affectation humaine, favoris/historique/dashboards, idempotence métier. Restent tests complets et contrôle d’expérience réglementaire (ETP, périodes, profession/spécialité, justificatifs).
- Matching : admissibilité, score interne expliqué, comparaison partielle externe, inconnues et incompatibilités distinguées, option annonces incomplètes. Restent retours métier sur pondérations et amélioration de reconnaissance.
- France Travail : accès réel, requêtes croisées, normalisation/provenance, rejeu, alertes et routes. Restent actualisation/retraits sans assimiler recherche partielle à inventaire complet.
- n8n : notifications, trois workflows locaux, worker/outbox/reçus. Restent Cloud si retenu, démarrage/surveillance du worker et encodage de relance.
- Documents : fichiers fictifs privés, PDF, altération/rotation testées, sauvegardes historiques Git. Restent idempotence documentaire, orphelins, conservation et restauration SQL/Mongo/fichiers/clés/n8n.
- Livraison : 71 tests, 79,38 % lignes, Swagger/README/scripts/schémas. Restent réponses complexes, harmonisation documentaire, installation propre et recette frontend.
- Priorité demandée : HTTPS et cadre réglementaire, documents sans doublons, offres, n8n retenu, restauration/recette.
- Les affichages et écrans restent du frontend, avec recette commune API.

## Travail réalisé dans ce jalon
Lecture du sujet PDF, de l’échange joint, de l’historique et des documents de suivi ; recoupement des preuves JSON et contrôles ciblés du code. Création de docs/BILAN_BACKEND_KICKOFF_V1.docx. Les 71 tests sont une preuve antérieure, pas une nouvelle exécution. Aucun code backend, compte fournisseur ni déploiement modifié.
Archive documentaire locale horodatée avec manifeste SHA-256 prévue et contrôlée à la clôture. Sauvegarde par jalon, aucun planificateur permanent installé. Aucun secret ni base inclus.
