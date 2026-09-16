# Interimatch Santé — Architecture backend V1

Version du 14 septembre 2026 — document de conception à implémenter et à vérifier.

## 1. Décision et périmètre

Architecture retenue : **monolithe modulaire NestJS en TypeScript, PostgreSQL avec PostGIS, MongoDB pour les traces de matching, n8n pour trois automatisations**. Une API métier, une CLI d'import et un distributeur d'événements issu du même code. Aucun microservice métier nécessaire à la V1.

Ce document suit la demande de l'équipe : **les lignes V1 du Catalogue complet des fonctionnalités PDF sont le périmètre produit**, en complément des exigences de D-WEB-901-project.pdf. Les anciens documents Word et méga prompts apportent des propositions techniques ; ils ne reportent aucune fonctionnalité V1 du PDF.

Les onze jours sont la durée scolaire, pas une preuve de faisabilité de cette V1. Le chiffrage doit intégrer le frontend, les accès fournisseurs, les tests et les livrables collectifs. Aucun développement, accès API ou test réussi n'est déclaré par ce document.

### Règles de lecture des documents

| Point | Décision de conception |
|---|---|
| P0 encore mentionné en dernière page du catalogue | Ne pas l'utiliser pour réduire les lignes V1 demandées par l'équipe. |
| Deux F17 | Nommer les tickets `F17-API-V1` et `F17-CSV-V2`, sans modifier le document source. |
| F03 sans priorité | Inclure le dashboard indispensable aux parcours et au sujet. |
| F04 sans priorité et tableau annoncé par Yves | Prévoir un référentiel et des règles explicites ; taxonomie finale à préciser avec Yves. Aucun classement clinique inventé. |
| F24 organisations en V3 | Affiliation et isolation obligatoires dès V1 ; administration multisite avancée différée. |
| F14 confirmation ou contrat ; F27 contrats en V3 | Générer une confirmation de mission depuis un modèle en V1. Aucun contrat signé ou opposable annoncé. |
| F20 RPPS et références | Intégration RPPS réelle et parcours de contrôle des références. La méthode exacte de contrôle des références reste une décision métier ouverte. |
| OAuth | Facultatif selon le libellé du catalogue ; l'authentification classique reste à développer et à comprendre. |
| F09 alerte calendrier en V2 | Les alertes de confort sont différées ; empêcher deux affectations incompatibles connues reste une règle V1. |

## 2. Stack retenue

| Couche | Choix | Rôle |
|---|---|---|
| Runtime | Node.js 24 LTS, correctif maintenu figé à l'installation | Exécution backend et CLI |
| HTTP | NestJS, adaptateur Express | Modules, injection, contrôleurs, validation et autorisation |
| Contrat | REST JSON `/api/v1`, OpenAPI | Interface frontend et comptes techniques |
| SQL | PostgreSQL + PostGIS + btree_gist | Données métier, géographie, transactions et contraintes |
| ORM | TypeORM, migrations versionnées ; SQL paramétré pour les besoins avancés | Persistance, transactions, requêtes géographiques |
| NoSQL | MongoDB via Mongoose | Calculs de matching enregistrés et relus |
| Auth | Bibliothèque de sessions avec stockage PostgreSQL ; Argon2id | Authentification classique, expiration et révocation |
| Documents | Volume privé persistant en démonstration, derrière une interface de stockage | RIB, justificatifs et confirmations chiffrés |
| Automatisation | n8n avec base technique et identifiants séparés | Orchestration de trois workflows |
| Traitement public | Commander.js, services de normalisation partagés | Import CLI et réexécution |
| Validation | DTO NestJS, class-validator/class-transformer, parsing explicite | Validation serveur et schéma OpenAPI |
| Tests | Jest, Supertest, véritables bases isolées pour l'intégration | Unitaire, HTTP, concurrence et coverage |
| Livraison | Docker Compose, reverse proxy HTTPS, CI | Installation et démonstration reproductibles |

Figer les versions compatibles dans le lockfile et les images par version précise ou digest. Vérifier les migrations PostGIS et btree_gist sur l'environnement cible avant le développement métier. `synchronize: false`. Ne pas introduire Redis, Kafka, Kubernetes ou un moteur de recherche supplémentaire sans besoin mesuré.

NestJS fournit une intégration TypeORM et un support des transactions et migrations. [Documentation NestJS](https://docs.nestjs.com/techniques/database). Les types spatiaux PostgreSQL sont documentés par [TypeORM](https://typeorm.io/docs/drivers/postgres/). Le runtime retenu appartient à la branche LTS [Node.js](https://nodejs.org/en/about/previous-releases).

## 3. Déploiement et frontières

Le navigateur accède à une origine HTTPS unique. Le reverse proxy distribue les pages au frontend et `/api/v1` au backend. Le frontend ne dispose d'aucun identifiant de base ni secret fournisseur.

L'API accède à PostgreSQL, MongoDB et au stockage privé. Le distributeur d'outbox transmet les événements à n8n ; n8n appelle seulement les routes techniques autorisées de l'API. La CLI utilise les services d'import avec une identité de base dédiée.

Une instance API et un distributeur embarqué suffisent au premier déploiement. Son traitement reste durable et verrouillé en base ; aucun travail essentiel ne repose uniquement sur un timer mémoire. Le distributeur peut ensuite devenir un processus séparé sans modifier les modules métier.

Les ports des bases, le stockage et l'éditeur n8n ne sont pas publics. Les routes `/api/v1/internal` sont bloquées à l'entrée publique et authentifiées même sur le réseau privé. L'état technique de n8n utilise une base et un compte séparés, éventuellement sur la même instance PostgreSQL. n8n ne lit pas directement les tables métier.

Un réseau privé ne chiffre pas les échanges. Décrire et configurer TLS pour les connexions transportant des données sensibles dans le déploiement distant, y compris API–bases et API–n8n. Ne pas désactiver la validation des certificats. Documenter les éventuelles différences de l'environnement local.

## 4. Modules et propriété des données

| Module | Entités principales | Responsabilité |
|---|---|---|
| Auth | User, Session, TermsAcceptance | Connexion, déconnexion, expiration, acceptation versionnée des CGU |
| Organizations | Organization, Membership, AgencyFacilityLink | Affiliations confirmées et relations agence–établissement |
| Profiles | NurseProfile, ProfileQualification, Skill, Experience | Profil structuré et complétude |
| Facilities | Facility, Qualification, Specialty, ServiceType | FINESS, établissements et codes métier |
| Availability | Availability, Unavailability, MobilityPreference | Disponibilité effective et zone acceptée |
| Missions | StaffingRequest, Mission, MissionSkill, MissionHistory | Besoin, publication, modifications, clôture et annulation |
| Applications | Application, ApplicationHistory, MissionConsent | Candidature volontaire, sélection, refus et accord |
| Assignments | Assignment | Affectation atomique et conflits de planning |
| Search | Projections de lecture | Recherche commune avec origine explicite |
| Favorites | FavoriteMission, FavoriteExternalOffer, FavoriteFacility | Ajout, suppression et consultation des favoris |
| Matching | MatchingRun dans MongoDB | Éligibilité, classement, versions et explications |
| ProfessionalVerification | VerificationCheck, ReferenceCheck | RPPS, contrôles humains et preuves limitées |
| Documents | Document | RIB et justificatifs privés, chiffrement et accès |
| MissionConfirmations | MissionConfirmation | Modèle, génération, version et statut du document |
| Notifications | Notification, NotificationPreference | Notifications internes et lecture |
| PublicData | DataSource, ImportRun, ExternalOffer | Acquisition, staging, normalisation et publication des offres |
| Automation | OutboxEvent, AutomationReceipt, IdempotencyRecord | Distribution durable, reprises et dédoublonnage |
| Audit | AuditEvent | Actions sensibles, accès documentaires et décisions |

Une entité a un propriétaire métier. Un module appelle les cas d'usage exportés d'un autre, sans modifier directement ses tables. Pour les opérations multi-modules, partager explicitement le contexte de transaction ; ne pas laisser un repository écrire hors transaction par inadvertance.

Chaque module contient contrôleurs/DTO, cas d'usage et adaptateurs de persistance. Les fonctions de score et de dates sont indépendantes de NestJS. Les tableaux de bord sont des requêtes de lecture avec droits appliqués ; ils ne constituent pas une seconde autorité métier.

## 5. Modèle métier et invariants

Deux familles publiques : INFIRMIER et ENTREPRISE. L'entreprise distingue ETABLISSEMENT et AGENCE_ETT. L'administration est un rôle interne attribué de façon contrôlée.

Séparer un établissement FINESS d'une organisation cliente : un référencement public ne prouve pas l'affiliation d'un utilisateur. Conserver le FINESS géographique du site et, si utile, son rattachement juridique, sous forme de chaînes.

Séparer qualification professionnelle, spécialité clinique et type de service. Les exemples encore « à confirmer » du PDF ne sont pas des équivalences validées. Yves fournit le tableau métier ; les contraintes d'éligibilité s'appuient sur des codes explicites.

Séparer Mission interne, ExternalOffer importée et StaffingRequest adressée à une agence. Une offre importée peut être affichée et mise en favori sans devenir une mission attribuable dans l'application. Son bouton de candidature redirige vers le diffuseur sauf intégration effective autorisée. Un besoin interne doit pouvoir être créé par une entreprise pour satisfaire le sujet scolaire.

V1 proposée : un poste et un intervalle continu par mission interne. Stocker début/fin en instants UTC, conserver le fuseau Europe/Paris pour les règles et l'affichage, accepter les gardes franchissant minuit. Utiliser des intervalles `[début, fin)` et imposer fin > début. Les montants sont décimaux maîtrisés ou entiers monétaires, avec devise, unité et base de rémunération.

### États

- Mission : DRAFT → OPEN → FILLED → COMPLETED ; CANCELLED selon les transitions autorisées.
- Candidature : SUBMITTED → SELECTED ou REJECTED ; WITHDRAWN selon le parcours.
- Accord du soignant : daté et lié à la version substantielle de la mission.
- Vérification : PENDING, MATCH_FOUND, REVIEW_REQUIRED, VERIFIED, REJECTED, UNAVAILABLE ; préserver la différence entre résultat technique et décision humaine.
- Confirmation : PENDING, READY, FAILED, SUPERSEDED ou CANCELLED.

L'historique affiché inclut les annulations. « À venir », « en cours » et « passée » sont des catégories temporelles ; elles ne clôturent pas automatiquement une mission. La clôture nécessite la fin du créneau et une action autorisée.

### Contraintes SQL

- Email normalisé unique ; relations et clés étrangères explicites.
- Candidature unique par infirmier/mission, avec historique en cas de renouvellement.
- Affectation active unique par mission.
- Exclusion des chevauchements d'affectations actives pour un infirmier via `tstzrange` et GiST.
- Favoris uniques par utilisateur et cible ; les trois tables évitent une référence polymorphe sans clé étrangère.
- Offre externe unique sur `(sourceId, externalId)`.
- Notifications, confirmations et requêtes idempotentes protégées par des contraintes d'unicité métier.

PostgreSQL documente les intervalles et contraintes d'exclusion adaptés à la réservation de créneaux. [Documentation PostgreSQL](https://www.postgresql.org/docs/current/rangetypes.html).

## 6. Affectation transactionnelle

1. Authentifier l'agence et vérifier son lien avec la mission et le dossier.
2. Ouvrir la transaction, verrouiller la mission puis le profil dans un ordre constant.
3. Relire candidature, accord, versions, qualifications vérifiées, disponibilités et affectations.
4. Vérifier l'union des disponibilités moins les indisponibilités, les conflits connus et les conditions métier du scénario.
5. Créer l'affectation, passer la mission à FILLED, enregistrer l'audit et `AssignmentCreated` dans l'outbox.
6. Commit, puis distribution asynchrone. Aucun appel fournisseur pendant la transaction.

Tous les chemins modifiant le planning ou une qualification vérifiée utilisent le verrou de profil partagé. Une modification incompatible avec une affectation existante est rejetée ou passe par une annulation/replanification explicite. Les écritures de mission partagent le verrou de mission. La contrainte SQL reste le dernier rempart.

Les erreurs de concurrence donnent un 409 exploitable. Une clé d'idempotence est liée à l'acteur, l'opération et l'empreinte de la requête ; rejouer une demande identique restitue le résultat, changer son contenu avec la même clé est refusé. Annuler libère la réservation active et conserve l'historique. La vérification des conflits porte uniquement sur les engagements connus de la plateforme.

## 7. Recherche, matching et MongoDB

Recherche V1 : spécialités, qualifications, service si disponible, commune/rayon, dates et nom d'établissement ; origine explicite. Plusieurs valeurs d'une catégorie se combinent par OU, les catégories par ET. Pagination bornée, tri stable avec identifiant secondaire et index adaptés. Les établissements d'un import ne sont pas rapprochés sur leur seul nom.

Utiliser PostGIS `geography(Point,4326)` et `ST_DWithin` avec index GiST pour le rayon en mètres. Une distance géographique ne constitue pas un temps de trajet. Une géolocalisation approximative ou inconnue est signalée. [Documentation PostGIS](https://postgis.net/docs/ST_DWithin.html).

Le moteur évalue d'abord les critères bloquants : mission ouverte, qualification, compétences obligatoires, disponibilité complète, absence de conflit connu, mobilité et vérification suffisante. Une inconnue produit un résultat incomplet, jamais une qualification inventée.

Pour les profils éligibles, conserver comme proposition initiale les poids du méga prompt : 45 % compétences souhaitées, 25 % proximité, 20 % préférence de créneau, 10 % expérience du service. Les poids sont des paramètres produit versionnés à confirmer avec Yves, sans prétention à mesurer une qualité clinique. Une condition d'expérience obligatoire reste séparée du score.

Retourner `eligible`, `reasons`, `missingRequirements`, `components`, `totalScore`, `algorithmVersion`, `missionVersion`, `profileVersion` et `computedAt`. Score null si incomplet. Recalculer à l'affectation.

MongoDB conserve et restitue les MatchingRun via une route autorisée. Identifiants minimisés, aucune pièce, aucun RIB, email ou profil complet. Une durée de 30 jours est une proposition de conservation du POC, à consigner dans le cadrage. TTL et filtre de lecture `expiresAt > now` ; le nettoyage TTL n'est pas immédiat. [Documentation MongoDB](https://www.mongodb.com/docs/manual/core/index-ttl/).

Une panne MongoDB produit un état dégradé explicite. Le matching courant peut être recalculé depuis PostgreSQL, mais une trace non enregistrée n'est jamais annoncée comme disponible. Aucune transaction distribuée entre les deux bases.

## 8. RPPS, références et données publiques

### Vérification professionnelle F20

Intégrer l'API FHIR Annuaire Santé dans un adaptateur serveur : recherche RPPS, récupération des attributs publics utiles, date/source du contrôle et résultat de rapprochement. Protéger la clé API et limiter les reprises. Un RPPS trouvé est une correspondance de registre, pas une preuve d'identité du titulaire du compte ni une vérification automatique de toutes ses compétences. [Ressource Practitioner ANS](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/resources/practitioner.html).

Une incohérence demande une revue humaine. Une indisponibilité est distincte d'une absence de résultat et ne déclasse pas automatiquement une qualification. Les durées de fraîcheur et la politique de validation restent explicites.

Pour les références : prévoir une fiche de contrôle, un acteur habilité, le statut, la date, la méthode et une note factuelle limitée. La méthode de vérification, les informations nécessaires et le canal de contact doivent être arrêtés par l'équipe. Ne pas inventer une API de références ni envoyer automatiquement de demandes à des tiers. Une fiche vide n'est pas une référence vérifiée.

### Import F17-API-V1

France Travail est le fournisseur initial proposé, à confirmer par un appel réel autorisé et l'examen de ses conditions. L'import suit : acquisition bornée → staging → validation → normalisation → dédoublonnage → publication atomique du lot valide → rapport. Conserver source, identifiant, dates d'acquisition et de publication, licence/conditions, précision des horaires et du lieu.

FINESS complète les profils établissements et le préremplissage. Il ne remplace pas l'import d'offres requis par la V1. Si le fournisseur d'offres est inaccessible, marquer F17 comme bloqué et rechercher un autre accès autorisé ; un jeu inventé ne valide pas ce critère.

L'import est idempotent, paginé et relançable. Les annonces absentes ne sont désactivées qu'après un balayage complet réussi du périmètre ou un retrait explicite. Ne pas transformer un salaire mensuel en taux horaire sans base définie, ni une annonce « bloc » en qualification certaine.

La CLI Commander réutilise le même pipeline et expose import, dry-run et rapport. Commander est la bibliothèque retenue pour cette interface. [Documentation Commander](https://github.com/tj/commander.js). Les commandes exactes seront fixées dans le code ; elles ne sont pas présentées ici comme déjà opérationnelles.

## 9. Sécurité et documents sensibles

Sessions serveur dans PostgreSQL, identifiants aléatoires, régénération à la connexion, cookies HttpOnly et Secure, politique SameSite compatible avec le déploiement, CSRF sur les écritures, expiration et déconnexion invalidante. Limitation des tentatives par compte et IP, configuration explicite du reverse proxy. Hachage Argon2id via bibliothèque maintenue, paramètres mesurés. [OWASP mots de passe](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Le titulaire consulte son dossier. L'établissement voit seulement les informations nécessaires à sa mission. L'agence liée accède aux pièces nécessaires selon son habilitation. Les autorisations contrôlent rôle + affiliation confirmée + relation à l'objet, y compris sur les listes, favoris, traces MongoDB et téléchargements. L'inscription ne permet pas de rejoindre librement une organisation référencée.

Interdire les champs client qui changent rôle, propriétaire, vérification ou statut hors cas d'usage. Paramétrer les requêtes SQL et construire les filtres MongoDB côté serveur. Limiter les corps HTTP, tris, listes et téléversements. Les connecteurs n'acceptent pas d'URL arbitraire fournie par l'utilisateur.

F02 prévoit le RIB : retenir un dépôt de document privé en V1, sans extraction bancaire ni paiement. La démo utilise un RIB fictif identifié comme tel. Le caractère obligatoire du RIB à l'inscription reste à confirmer ; proposition : compte et profil créables avant dépôt, complétude distincte. Aucun secret bancaire dans MongoDB, les notifications, les journaux ou les données n8n.

Chiffrement des documents par AES-256-GCM avec nonce unique par clé, tag vérifié et version de clé. Les métadonnées SQL contiennent référence d'objet, propriétaire, taille, type et paramètres de chiffrement ; les clés sont séparées des données et du dépôt. Pour les petits fichiers V1, vérifier l'authenticité avant de transmettre le contenu déchiffré.

Contrôler taille et type réel, générer les noms de stockage, limiter les formats et supprimer les temporaires. Stockage hors racine publique. Téléchargement autorisé à chaque demande, cache privé et noms maîtrisés. Le stockage et la base ne sont pas atomiques : statut STAGING/READY, nettoyage des objets orphelins et reprise des échecs. Seul READY est téléchargeable.

Tracer les accès documentaires et décisions sans contenu sensible. Consigner les durées de conservation, finalités et procédures de suppression/export ; l'acceptation des CGU ne remplace pas cette analyse. Prévoir sauvegardes chiffrées, récupération séparée des clés, rotation documentée et exercice de restauration. Rattacher les 18 scénarios de la note complémentaire à la recette avant livraison ; leur réussite reste à produire.

## 10. Trois automatisations n8n

| Workflow | Déclencheur | Traitement et preuve |
|---|---|---|
| A — notification de match | MissionPublished | Appel API pour matching et préférences, puis création d'une notification interne par destinataire autorisé. |
| B — confirmation | AssignmentCreated | n8n demande la génération depuis un modèle contrôlé, suit le résultat puis crée une notification avec un lien privé. |
| C — relance | Schedule Trigger | Liste des missions OPEN anciennes ; l'API recontrôle l'état au moment de créer la relance. |

Les trois scénarios satisfont F14 ; le minimum scolaire de deux n'autorise pas à oublier la confirmation. Les canaux Slack/Discord sont optionnels et uniquement sur un canal de démonstration autorisé. Les notifications internes constituent le canal de base.

La confirmation est un PDF de démonstration généré par le backend à partir d'un modèle et d'un instantané versionné de l'affectation. Choisir une bibliothèque maintenue de génération PDF au bootstrap. Le document contient les données utiles de mission, pas de RIB. n8n orchestre la génération ; il ne reçoit pas les pièces sensibles. Conserver version du modèle, empreinte et statut. Une annulation ou modification rend l'ancien document obsolète et l'accès indique cet état.

L'outbox est créée dans la transaction métier. Le distributeur réserve les événements avec bail, délai maximal, reprises bornées et état d'échec rejouable. Livraison au moins une fois, consommateurs idempotents. Clés par événement/destinataire/type/version ; ajouter la fenêtre de rappel pour les relances.

Un succès HTTP du webhook ne prouve pas la fin du workflow. Prévoir un reçu final ou une réconciliation des opérations attendues. Les destinataires sont déterminés par l'API. Recontrôler état et version pour les événements retardés ou désordonnés. Si l'affectation est annulée avant la génération, ne pas produire une confirmation active.

Exports n8n nettoyés des secrets et données épinglées, procédure de réimportation et preuve d'exécution des trois scénarios. [Webhooks n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [Export/import n8n](https://docs.n8n.io/workflows/export-import/).

## 11. Contrat API et frontend

OpenAPI est la référence de transport ; générer les types client à partir du contrat pour éviter deux définitions divergentes. Ne pas exporter les entités TypeORM au frontend. Une version produit ultérieure n'impose pas une rupture de `/api/v1`.

| Domaine | Routes proposées sous `/api/v1` |
|---|---|
| Auth | POST /auth/register/nurse, /auth/register/company, /auth/login, /auth/logout ; GET /me |
| Profil | GET/PATCH /profiles/me ; PUT /profiles/me/availabilities ; GET /profiles/me/history |
| Recherche | GET /references, /facilities, /listings, /listings/:id |
| Favoris | GET /favorites ; PUT/DELETE /favorites/missions/:id, /favorites/offers/:id, /favorites/facilities/:id |
| Missions | POST /missions ; PATCH /missions/:id ; POST /missions/:id/publish, /cancel, /complete |
| Candidatures | POST /missions/:id/applications ; POST /applications/:id/withdraw, /select, /reject, /consent |
| Affectation | POST /missions/:id/assignments ; GET /assignments |
| Matching | POST /missions/:id/matching-runs ; GET /matching-runs/:id ; GET /profiles/me/recommendations |
| Vérifications | POST /profiles/me/rpps-checks ; GET /profiles/me/verifications ; POST /profiles/:id/reference-checks et /verifications pour acteurs habilités |
| Documents | POST /profiles/me/documents ; GET /documents/:id/download |
| Tableau de bord | GET /dashboard, /notifications ; PATCH /notifications/:id/read |
| Automatisation | Routes /internal distinctes pour matching, confirmations, relances et reçus |

Les inscriptions publiques ne donnent pas de droits de validation. Les routes de vérification ne permettent pas l'auto-validation. Une offre importée et une mission interne ont des identifiants discriminés et des actions différentes. Prévoir les listes de candidatures et de demandes agence nécessaires aux écrans.

Erreurs : 400 validation, 401 sans session, 403 interdit, 404 absent ou masqué selon politique, 409 conflit, 429 limite, 503 dépendance indispensable indisponible. Réponse structurée `code`, `message`, `fieldErrors`, `requestId`, sans stack ni secrets. Les erreurs accessibles et les libellés sont partagés avec le frontend.

## 12. Exploitation et comportements de panne

| Incident | Comportement attendu |
|---|---|
| PostgreSQL indisponible | Écritures métier refusées ; aucun succès fictif. |
| MongoDB indisponible | Historique de matching indisponible annoncé ; contrôles métier SQL conservés. |
| n8n indisponible | Événements conservés, reprise ultérieure ; l'affectation validée n'est pas annulée pour ce seul motif. |
| Import interrompu | Dernier lot valide conservé, fraîcheur affichée, aucun retrait massif des offres. |
| RPPS indisponible | Statut UNAVAILABLE, reprise ou revue ; aucune nouvelle validation automatique. |
| Stockage indisponible | Téléchargement/génération en échec explicite ; métadonnées cohérentes et reprise. |
| Doublon d'événement | Un résultat métier, suivi du rejeu, aucune double notification. |

Logs structurés avec requestId, métriques de latence/erreurs, âge de l'outbox, jobs échoués, fraîcheur des imports et disponibilité des dépendances. Sondes de santé sans données sensibles. Limites de connexions, pagination et requêtes géographiques indexées. Mesurer avant d'ajouter du cache.

## 13. Matrice de couverture et recette

Tous les statuts ci-dessous sont **à implémenter et à prouver**.

| Exigence | Modules | Preuve attendue |
|---|---|---|
| F01 | Auth, Organizations | Deux parcours ; connexion, déconnexion, expiration et refus d'accès croisé |
| F02 | Profiles, Availability, Documents | Profil complet, données validées, CGU versionnées, RIB fictif chiffré et accès limité |
| F02 bis | Facilities, Organizations | FINESS obligatoire, référent, affiliation contrôlée et CGU |
| F03, socle proposé | Dashboard | Compteurs, recommandations et accès calendrier/favoris/profil |
| F04, règle ouverte | Facilities, Search, Matching | Tableau métier validé et tests des distinctions de qualification |
| F05 | Search, PostGIS | Tous les filtres V1, y compris nom d'établissement et distance |
| F06 | Favorites | Ajout/suppression idempotents, unicité et isolation par utilisateur |
| F08 | Applications, Assignments | Candidature, suivi, retrait, sélection/refus ; affectation protégée |
| F09 | Availability | Intervalles, indisponibilités et mobilité ; nuit et changement d'heure |
| F10 | Assignments, Missions | Historique avec annulations et catégories temporelles correctes |
| F14 | Automation, Notifications, MissionConfirmations | Trois workflows exécutés, confirmation réelle, rejouabilité sans doublon |
| F17-API | PublicData | Import API réel, nettoyage, réimport idempotent, publication visible et provenance |
| F18 | Matching | Éligibilité avant score, exemples numériques, inconnues explicites, lecture MongoDB |
| F20 | ProfessionalVerification | Consultation RPPS réelle, états d'erreur, revue humaine et contrôle des références démontré |
| F25 | Documents | Pièce fictive chiffrée, refus de téléchargement croisé et de tag altéré |
| Création mission du sujet | Missions | Création entreprise avec poste, dates, lieu, compétences et rémunération |
| SQL + NoSQL du sujet | PostgreSQL, MongoDB | Écritures/lectures réelles des deux bases |
| CLI du sujet | PublicData | Bibliothèque utilisée et import reproductible |
| Tests du sujet | CI | Tests unitaires, fonctionnels critiques et rapport coverage livré |
| Sécurité transverse du PDF | Tous | Contrôles documentés, restauration et 18 scénarios de la note rattachés à la recette |

Tests d'intégration sur PostgreSQL/PostGIS et MongoDB réels, pas sur SQLite ni exclusivement sur mocks. Tester deux validations simultanées du même poste, deux missions qui se chevauchent pour le même infirmier, une modification concurrente de disponibilités et un accord périmé. Tester refus d'accès aux profils, RIB, favoris, notifications, confirmations et traces d'autres utilisateurs/organisations.

Pour le matching : cas numériques du méga prompt, qualification absente, disponibilité contiguë, trou, indisponibilité prioritaire, distance inconnue et mission modifiée. Pour les workflows : doublon, panne, annulation pendant traitement et reçus incomplets. Pour l'import : réponse partielle, changement de schéma et réimport sans doublon.

La CI installe depuis le lockfile, vérifie types/lint, exécute migrations et tests, génère la coverage et construit les applications. Une recette finale repart d'un environnement propre avec réimport des workflows et données publiques.

### Exigences collectives à conserver

L'API seule ne valide pas le projet. Livrer également l'étude de marché et la proposition de valeur, le CDC à J+2, la roadmap et les estimations, le suivi réel des heures et des écarts, le frontend TypeScript responsive, les principes RGAA demandés, deux pratiques RGESN documentées, les pages publiques avec SEO, le dossier de protection des données et les règles d'intérim du scénario, la réflexion d'achat responsable/réemploi, le README, les données et scripts, les exports n8n et le support de soutenance avec participation de tous.

Les règles juridiques exactes sont à vérifier sur les sources institutionnelles applicables au scénario avant de fixer les contrôles ; ne pas coder une durée maximale universelle ou présenter la confirmation pédagogique comme une validation juridique. Les mécanismes techniques de ce document ne constituent pas un avis juridique.

## 14. Ordre de réalisation et décisions ouvertes

| Lot | Résultat attendu |
|---|---|
| 1 — Cadrage et faisabilité | Accès offre/RPPS testés, tableau Yves, parcours et champs obligatoires décidés, migrations/extensions validées, contrats initiaux |
| 2 — Parcours complet minimal | Inscription → profil → mission interne → candidature → accord → affectation → dashboard |
| 3 — Couverture V1 | Recherche géographique, favoris, calendrier/historique, RIB/justificatif, RPPS/références et import API |
| 4 — Automatisations | Trois workflows, génération de confirmation, outbox et reprises |
| 5 — Recette et livraison | Tests réels, sécurité, intégration frontend, restauration, coverage et démonstration propre |

Les tests, les permissions et la sécurité accompagnent chaque lot. Affecter un responsable et une estimation à chaque ligne fonctionnelle, compter les dépendances et réserver du temps aux corrections. Un découpage en lots ne vaut pas engagement de charge sur onze jours.

Décisions encore nécessaires : tableau hiérarchique de Yves ; source et accès d'offres ; clé RPPS ; méthode et canal de vérification des références ; statut obligatoire ou facultatif du RIB à l'inscription ; modèle de confirmation ; règles de conservation ; hébergement et capacités réelles de l'équipe. Ces points ne justifient pas de retirer silencieusement une fonction V1.

Hors V1 selon le catalogue : import CSV, CV multiples, duplication de disponibilités, export agenda, itinéraire, imprévus, aide avancée/chatbot, signature électronique, contrats complets, relevés d'heures, paie et administration multisite avancée. Préserver les frontières utiles sans créer de routes factices ni de tables futures inutilisées.

**Critère de livraison : chaque fonction V1 possède un comportement réel, des droits vérifiés, des erreurs maîtrisées, des tests adaptés et une preuve de démonstration. Les écarts sont nommés ; aucune promesse de perfection ou de conformité intégrale ne découle de la seule architecture.**
