# Interimatch Santé — Architecture backend V1 consolidée

Version du 14 septembre 2026. Conception synchronisée avec le méga prompt ; aucun logiciel ni test applicatif déclaré livré.

## 1. Périmètre et décisions
La référence est le **catalogue Word courant, F01 à F26 et F02 bis**, complété par le sujet D-WEB-901 et les décisions explicites de l’utilisateur. Les anciens PDF/catalogues et méga prompts sont des archives. Le détail des parcours et de l’API est défini dans [le prompt — archive](https://github.com/lebretyves/Infimactch_Prod/blob/fd68a377da28a76151483529ac62473eed99d264/docs/references/Interimatch_Sante_Mega_Prompt_Backend_V1.md).

Décisions : F12 comprend trois workflows ; F18 consulte le RPPS par API, avec blocage si non retrouvé et attente si indisponible. Aucune validation manuelle par l’agence n’est ajoutée à ce contrôle. L’attestation F02 reste V2 ; les références professionnelles sont hors V1, envisagées en V2 et encore à définir. La validation humaine de l’affectation F19 reste distincte du contrôle RPPS.

La V1 conserve F01, F02, F02 bis, F03, F04, F05, F06, F07, F08, F09, F12, F15, F16, F17, F18, F19, F20 et F22. F04 et F16 sont deux usages du même moteur. F21 administration multisite avancée reste V3 ; l’isolation et les affiliations nécessaires sont présentes dès V1. F24 contrats complets reste V3, sans supprimer la confirmation F12.

## 2. Stack retenue
| Élément | Choix | Usage |
|---|---|---|
| Runtime | Node.js 24 LTS, correctif maintenu figé | Backend et CLI |
| Framework | NestJS + adaptateur Express + TypeScript | Monolithe modulaire |
| API | REST /api/v1, OpenAPI et DTO validés | Contrats frontend et n8n |
| SQL | PostgreSQL, PostGIS, btree_gist | Métier, distances et réservations |
| ORM | TypeORM, migrations SQL explicites | synchronize: false |
| NoSQL | MongoDB avec Mongoose | Explications du matching écrites et relues |
| Auth | Sessions serveur PostgreSQL, Argon2id | Expiration, révocation et cookies protégés |
| Documents | Stockage privé persistant, AES-256-GCM | RIB, justificatif et confirmation |
| Automatisation | n8n, outbox SQL | Trois scénarios durables |
| Données | Commander.js, adaptateurs fournisseurs | Import API normalisé et CLI |
| Livraison | Docker Compose, proxy HTTPS, CI | Démarrage reproductible |
| Tests | Jest, Supertest et bases réelles isolées | Unitaire, intégration, concurrence et coverage |

Valider la compatibilité et figer les versions exactes au bootstrap ; les images et extensions n’ont pas encore été exécutées dans ce dossier. NestJS documente les frontières de modules et les services exportés [NestJS](https://docs.nestjs.com/modules). PostgreSQL fournit les contraintes d’exclusion [PostgreSQL](https://www.postgresql.org/docs/current/rangetypes.html). PostGIS permet la recherche par rayon indexée [PostGIS](https://postgis.net/docs/ST_DWithin.html).

## 3. Topologie
Une origine HTTPS dessert le frontend Next.js et /api/v1 vers NestJS. Le navigateur ne dispose d’aucun accès direct aux bases ni clé fournisseur.

PostgreSQL porte les états métier ; MongoDB porte les traces de matching. Le backend écrit l’outbox dans ses transactions. Un distributeur du même code réserve les événements et contacte n8n. n8n appelle les seules routes techniques autorisées du backend. Il n’écrit pas dans les tables métier. Sa base et ses identifiants techniques sont séparés, même si le serveur PostgreSQL est partagé.

Le distributeur peut démarrer dans le processus backend avec état durable en SQL ; le séparer ensuite n’impose pas de microservices métier. Aucun Kafka, Redis, Kubernetes ou moteur de recherche supplémentaire sans besoin mesuré.

Ports des bases, éditeur n8n et stockage privés. Bloquer /api/v1/internal à l’entrée publique et authentifier ces routes sur le réseau privé. TLS avec validation des certificats couvre les échanges sensibles du déploiement distant : clients–proxy, API–bases, backend–n8n et n8n–API. Documenter la terminaison TLS et les exceptions strictement locales. Un réseau privé ne chiffre pas les données.

## 4. Modules et modèle
| Module | Entités principales | Fonctions |
|---|---|---|
| Auth / Organizations | User, Session, TermsAcceptance, Organization, Membership, OrganizationLink | F01, affiliations et droits |
| Profiles / Facilities | NurseProfile, ProfileQualification, Skill, Experience, Facility | F02, F02 bis et référentiels |
| Availability | Availability, Unavailability, MobilityPreference | F08 |
| Missions | StaffingRequest, Mission, MissionSkill, MissionHistory | F17 et demandes établissement |
| Applications / Assignments | Application, ApplicationHistory, MissionConsent, Assignment | F07, F09, F19 |
| Search / Favorites | FavoriteListing, FavoriteFacility | F05 et F06 |
| Matching | MatchingRun MongoDB | F04 et F16 |
| ProfessionalVerification | RppsCheck | F18 seulement ; aucune ReferenceCheck V1 |
| Documents | Document, BankDetails | F02 RIB et F22 |
| MissionConfirmations | MissionConfirmation | F12 confirmation |
| Notifications / Automation | Notification, NotificationPreference, OutboxEvent, AutomationReceipt, IdempotencyRecord | F12 |
| PublicData | DataSource, ImportRun, ExternalOffer | F15 et F20 |
| Audit / Dashboards | AuditEvent et projections autorisées | F03, F19 et sécurité |

Un module possède ses écritures ; ses services exportés prennent un contexte transactionnel commun lorsque plusieurs modules coopèrent. Les contrôleurs ne portent pas les décisions métier. Le matching est constitué de fonctions pures testables.

Deux familles de comptes : NURSE et ENTERPRISE ; organisations ESTABLISHMENT et AGENCY. L’identifiant FINESS d’un établissement public ne prouve pas l’affiliation du compte. Pas d’auto-inscription administrateur.

Séparer qualifications IDE/IADE/IBODE, compétences, service et spécialité. Appliquer le référentiel hiérarchique du Word actuel et du prompt. Qualifications multiples explicites, sans équivalence IADE–IBODE ni diplôme déduit d’un texte d’annonce.

Séparer Mission interne, ExternalOffer et StaffingRequest. Une offre externe reste consultable et favorite ; la candidature redirige vers son diffuseur sans prétendre à une transmission interne. Les missions internes sont créées et publiées par l’agence, entreprise au sens du sujet.

Une mission = un poste et un intervalle continu en V1. Dates UTC et fuseau Europe/Paris ; intervalles [début, fin), fin > début, nuit et changements d’heure testés. Les valeurs inconnues restent inconnues. Monnaie en décimal exact ou entiers, avec unité, devise et brut. FINESS/RPPS/codes postaux stockés en texte.

FavoriteListing doit référencer une vraie cible : soit une clé étrangère vers un registre commun, soit deux clés étrangères facultatives Mission/ExternalOffer avec CHECK imposant exactement une cible et unicités adaptées. Ne pas laisser une simple paire type/id sans intégrité relationnelle.

## 5. États et concurrence
Mission : DRAFT → OPEN → FILLED → COMPLETED ; annulation vers CANCELLED. Assignment : ACTIVE → COMPLETED ou CANCELLED. Application : SUBMITTED, SELECTED, REJECTED, WITHDRAWN, ACCEPTED. Consentement daté lié à la version substantielle de mission. Les catégories temporelles upcoming/in_progress/past ne clôturent pas une mission.

Affecter, dans une seule transaction : verrouiller mission puis profil puis candidature/consentement ; relire droits, versions, RPPS, critères et planning ; créer Assignment, passer Application à ACCEPTED et Mission à FILLED ; écrire audit et AssignmentCreated dans l’outbox. Aucun appel externe pendant la transaction.

Toutes les routes concernées coopèrent : retrait, sélection, reconfirmation, disponibilités, qualifications, expérience, RPPS et liens d’autorisation. Ordre stable : mission, profils triés, candidatures/consentements. Les mutations de profil seules ne prennent pas ensuite un verrou de mission. Les changements d’habilitation sont sérialisés avec les opérations sensibles. Le prompt précise les cas d’usage ; aucun repository ne sort silencieusement de la transaction.

Contraintes : candidature unique par infirmier/mission avec historique ; unicité partielle d’affectation ACTIVE par mission ; exclusion GiST par infirmier et tstzrange sur les affectations ACTIVE. Les intervalles adjacents ne se chevauchent pas ; les contraintes de repos et trajet sont des règles distinctes. Erreurs de collision en 409, reprises bornées des erreurs de sérialisation/deadlock.

Annuler une affectation ACTIVE annule simultanément la mission, libère le créneau et écrit les événements. Ne pas laisser FILLED sans ACTIVE. Une republication explicite suit CANCELLED → DRAFT → OPEN avec nouvelle version, nouveaux consentements et historique ; COMPLETED ne se rouvre pas. L’annulation précédente reste visible. Un changement RPPS ne supprime pas automatiquement une affectation existante.

## 6. RPPS V1
Lors de la saisie/modification du numéro, le backend consulte l’API Annuaire Santé avec sa clé serveur et une recherche exacte. Saisie malformée : erreur de champ avant appel.

| État | Sens | Actions internes |
|---|---|---|
| NOT_CHECKED | Contrôle non effectué | Candidature/affectation non autorisées |
| PENDING | Appel en cours ou résultat indisponible | En attente ; profil et annonces accessibles |
| FOUND | Numéro retrouvé | Condition RPPS satisfaite, autres prérequis conservés |
| NOT_FOUND | Recherche valide sans correspondance | Candidature/nouvelle affectation bloquées ; correction possible |

Timeout, 429, 5xx, problème de clé et réponse inexploitable restent PENDING avec motif technique, reprise bornée et alerte si nécessaire. Ne pas les assimiler à une absence de RPPS. Une réponse tardive concernant un ancien numéro ou une ancienne demande est ignorée. Versionner et dater les résultats ; verrouiller le profil à leur écriture. Recontrôler le statut courant à la candidature et à l’affectation.

FOUND n’est pas une vérification d’identité ni une validation de toutes les expériences ou qualifications. Ne pas générer des diplômes à partir de ce booléen. Aucune validation manuelle par l’agence ajoutée à F18. La sélection/affectation humaine F19 demeure.

L’accès nécessite une clé ANS ; sa procédure est documentée [ANS](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/getting-started/get-api-key.html). Aucun accès projet authentifié n’est prouvé ici. Les tests sur profils fictifs sont des fixtures, distinctes d’une preuve d’intégration réelle.

## 7. Recherche et matching
Filtres communs : établissement, localisation/rayon, dates, jour/nuit. Branches IDE, IADE, IBODE combinées par OU, filtres internes à chaque branche par ET ; valeurs d’une même dimension par OU. Un IADE/IBODE recherchant IDE accède aux services IDE. Les filtres de bloc ne suppriment pas les résultats IDE.

PostGIS geography et index GiST, distances en mètres ; approximation de commune signalée, aucune distance inconnue convertie en zéro. Pagination 20, maximum 50 proposé ; tri stable.

Conditions bloquantes avant score : mission OPEN, qualification, prérequis, RPPS, disponibilité couvrant tout le créneau après retrait des indisponibilités, absence de conflit connu et mobilité. NOT_FOUND est bloquant ; PENDING est incomplet. Scores et explications ne présentent pas ces profils comme éligibles.

Poids initiaux du prompt : compétences souhaitées 45 %, proximité 25 %, préférence de créneau 20 %, expérience pertinente 10 %. Exemple 93,75 correct. Règles configurables/versionnées ; aucune donnée sensible/protégée dans le classement.

MatchingRun enregistre versions profil/mission/algorithme, composantes, raisons, date et expiration. Écriture et lecture autorisées réelles dans MongoDB. Rétention de démonstration proposée 30 jours, configurable, TTL plus filtre expiresAt. Panne MongoDB : historique indisponible annoncé, contrôles SQL conservés, aucune fausse preuve d’enregistrement.

## 8. Données publiques
France Travail est le fournisseur d’offres initial proposé : accès et conditions à vérifier avec le compte projet. Pipeline borné acquisition → staging → validation → normalisation → dédoublonnage → publication du lot valide → rapport. Unicité source/externalId, réimport idempotent, rejets et provenance conservés. Pas d’inactivation des absentes après un import partiel.

FINESS enrichit les établissements et le préremplissage ; il ne remplace pas F15 import d’offres. CLI Commander partage le pipeline, avec dry-run, limite, bilan et code de sortie. Un manifeste décrit licence, empreinte, acquisition, transformations et périmètre. Aucun import réellement exécuté n’est affirmé.

La fiche officielle décrit les offres et partenaires consentants [France Travail](https://www.data.gouv.fr/dataservices/api-offres-demploi). Le jeu FINESS publie des structures en JSON [FINESS](https://www.data.gouv.fr/datasets/finess-structures-1). Voir docs_intern/ACCES_API_V1.md pour les preuves disponibles et manquantes.

## 9. Trois workflows F12
A : MissionPublished ou évolution pertinente du profil → matching autorisé → notification interne.
B : déclenchement périodique → missions OPEN anciennes → recontrôle transactionnel → relance.
C : AssignmentCreated → génération backend d’une confirmation PDF versionnée → stockage privé → notification avec lien autorisé.

La confirmation n’est pas un contrat signé. n8n reçoit des identifiants et résultats minimaux, pas de RIB ou pièce. MissionConfirmation : PENDING, READY, FAILED, SUPERSEDED, CANCELLED ; unicité affectation/version de mission/version de modèle. Recontrôle à la publication et à la notification en cas d’annulation concurrente ; panne du document sans annuler l’affectation.

Outbox SQL atomique avec les événements métier. Réservation avec bail, timeout, reprise bornée et reçu final/réconciliation. Livraison au moins une fois ; traitement idempotent, contraintes en base. Un accusé HTTP ne prouve pas l’achèvement. Exports n8n nettoyés et trois exécutions démontrées. Aucun envoi à des tiers non autorisés.

## 10. Sécurité et fichiers
Sessions PostgreSQL, identifiant renouvelé, cookies HttpOnly/Secure/SameSite et CSRF, expiration/invalidation, limitation des tentatives et trust proxy configuré. Contrôler rôle, affiliation et relation à la ressource pour chaque liste/détail/document. Un établissement n’accède pas par défaut aux justificatifs ou RIB des candidats.

Chiffrer RIB et justificatif fictifs au repos, clés séparées, nonce unique, tag vérifié, keyVersion et rotation. Conserver le RIB hors profils ordinaires, logs, MongoDB et n8n. Définir au bootstrap sa représentation document/champs structurés ; ne pas stocker deux copies inutiles. Champs obligatoires à l’inscription à préciser sans conditionner arbitrairement le matching au RIB.

Fichiers contrôlés en taille et type réel, noms opaques, stockage hors racine publique. Ne retourner aucun octet déchiffré avant validation d’intégrité. Métadonnées SQL et stockage objet non atomiques : STAGING/READY, nettoyage des temporaires et objets orphelins, reprise contrôlée. Cache privé et droits à chaque téléchargement.

Sauvegardes chiffrées, clés récupérables séparément, restauration isolée, audit et simulation d’incident. Durées, finalités et droits documentés ; CGU versionnées sans les confondre avec le fondement de tous les traitements. Les règles juridiques du scénario sont à vérifier avant implementation ; aucune certification ou validation juridique intégrale annoncée.

## 11. Livraison et recette
OpenAPI fait autorité pour les contrats de transport, types client générés si possible ; aucune entité de persistance exposée telle quelle. Erreurs 400/401/403/404/409/429/503 explicites, requestId, jamais de secret.

CI : installation déterministe, types/lint, migrations, tests, coverage et build. Intégration sur vraies bases PostgreSQL/PostGIS et MongoDB isolées, pas uniquement des mocks. Les 18 contrôles SEC du prompt correspondent à la note de sécurité ; leurs résultats restent à produire.

La matrice docs_intern/MATRICE_VALIDATION_V1.csv rassemble F, R01–R40 et SEC01–SEC18, avec état réel, preuve et responsable. Le chiffrage docs_intern/CHIFFRAGE_V1.csv est une hypothèse initiale, pas un engagement. Le journal des temps réels reste vide jusqu’à saisie.

Front : responsive, RGAA, SEO public, états d’erreur et parcours intégrés. Collectif : marché, proposition de valeur, CDC J+2, go/no-go, deux pratiques RGESN, règles du scénario, achat responsable/réemploi, README et soutenance avec participation de tous. Aucun succès global à partir des seuls endpoints.

## 12. Reprise et dépendances
Lire docs_intern/REPRISE_BACKEND_V1.md ; si absent, inspecter et créer. L’absence de Git ou de code est un état initial, pas une erreur à masquer. Empreintes des sources dans docs_intern/SOURCES_SHA256.json.

Une fonctionnalité est terminée lorsque comportement, droits, tests, documentation et preuves existent. Les accès API absents restent bloqués et les tests non exécutés restent non exécutés. La prochaine étape est le bootstrap du vrai dépôt et les appels authentifiés autorisés.

Décisions ouvertes : identifiants projet API, modèle visuel de confirmation, champs RIB obligatoires et représentation, conservation et déploiement cible, répartition effective de l’équipe. Les références professionnelles restent hors V1 ; elles ne bloquent pas le cadrage V1.

Contrainte de livraison confirmee : quatre personnes, onze jours, date fixe. Voir docs_intern/PLANNING_4_PERSONNES_11_JOURS.md pour la repartition et docs_intern/CHIFFRAGE_V1.md pour les hypotheses de charge.
