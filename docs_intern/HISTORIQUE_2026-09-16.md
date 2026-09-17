# Historique de travail — 16 septembre 2026

Journal maintenu à la demande de l’utilisateur. Horaires en Europe/Paris sauf mention contraire. Les horaires exacts viennent des commits ou preuves ; les étapes sans horodatage fiable sont regroupées. Ne jamais inscrire de mots de passe, clés API, jetons, données de compte ou secrets dans ce journal. Les états « en cours » ne constituent pas une livraison.

## Matin — reprise, sécurité et environnement local

- Reprise des travaux V1/kick-off et récupération des branches de sécurité backend. Sauvegarde combinant backend et frontend dans la branche authentification. Commit de sauvegarde `afc6c4c` à 08:30.
- Corrections quota des PDF de confirmation et concurrence entre nettoyage et enregistrement ; exclusion des comptes désactivés des propositions et nouvelles affectations, révocation des sessions ; permissions minimales des bases et migrations sécurité.
- Validation isolée PostgreSQL/MongoDB/n8n, sauvegarde/restauration globale initiale et activation HTTPS local. Commits `5bb0477` à 08:54 et `9a74ed2` à 09:00. La première restauration contenait peu de données métier ; elle ne prouvait pas encore le déchiffrement d’un document représentatif.
- Audits V1, kick-off, dépendances et raccordements. Les bilans d’alors restent historiques : ils comportent des manques corrigés depuis.
- Imports France Travail/JobsPipe, programmation 00 h, 07 h, 09 h, 11 h, 13 h, 15 h, 17 h, exclusion CDI et garde-fou intersources. Aucun rattrapage ni nouvel appel fournisseur gratuit pour les tests du parseur.
- Diagnostic du parsing initialement invisible sur les fiches : prototypes et exemples limités ne suffisaient pas à généraliser son affichage.
- Diagnostic pgAdmin : confusion avec PostgreSQL/Odoo sur 5432 et utilisateur openpg. Connexion InfiMatch rétablie sur 127.0.0.1:55432 ; aucune modification de la base Odoo. Fenêtre pgAdmin laissée disponible.

## Généralisation du parsing et sept corrections V1

- Parseur version 4 stocké en JSONB, empreinte canonique, preuves textuelles et positions, versions, recalcul idempotent, API et affichage sur les offres importées.
- Améliorations métier : exigences/alternatives, primes distinctes du salaire et des horaires, indemnités transport, handicap candidat distinct des patients, médecine polyvalente, maternité, jours, permis et logiciels. Informations incertaines et passages à relire explicités.
- Export des exemples corrigé avec régénération de descriptionHash ; fiches réelles raccordées à l’API.
- Préférences de notifications, correspondance externe, recommandations personnalisées d’accueil, pagination agence au-delà de vingt profils et libellés d’informations manquantes corrigés.
- Migration et recalcul de 194 annonces après sauvegarde SQL privée ; second recalcul sans changement. Aucun nouvel appel fournisseur pour ce recalcul.
- Évaluation : 22/22 attentes ciblées après ajustement sur huit annonces ; lot indépendant supplémentaire de quatre annonces : 11/12. Limites documentées, aucune promesse de précision globale.
- Recettes navigateur desktop/mobile, préférence de notification et candidat 21. Identités simulées dans le navigateur pour ces scénarios, API/persistance testées séparément sur bases isolées.

## 14:17–14:24 — sessions et publication

- Délai d’inactivité choisi par l’utilisateur : 15 minutes. Avertissement à 14 minutes, bouton de prolongation, contrôle serveur, synchronisation entre onglets, lectures automatiques sans prolongation, durée absolue maximale huit heures.
- Tests d’expiration serveur et recette navigateur à horloge accélérée. Quota des signaux d’activité distinct de celui des connexions.
- Commit `e43cf98` à 14:17 : sept évolutions et expiration des sessions publiées sur authentification.
- Premier échec CI avant tests pendant l’initialisation PostgreSQL. Contrôle de disponibilité modifié pour attendre TCP, commit `b2b06a1` à 14:21 ; CI suivante verte.
- Vérification MongoDB avec les identifiants applicatifs Vault : ping authentifié et lecture réussis ; collection matchingruns présente, vide lors du contrôle. Aucun changement métier pendant cette vérification.
- Nettoyage du `.env` : doublon vide RPPS supprimé, toutes les valeurs effectives conservées ; cohérence avec Vault vérifiée. Secrets exclus de Git.

## 14:55–15:21 — nouveaux commits distants récupérés ensuite

- `f0439a6` puis `41e7057` : preuve contextualisée d’intérim JobsPipe, retrait des annonces explicitement fermées/expirées/non conformes et amélioration des journaux d’import.
- `af0720d` à 15:21 : premières commandes de purge/clôture et contrôles de restauration représentative.
- Les tâches France Travail et JobsPipe de 15 h ont toutes deux renvoyé le code de réussite 0 lors du contrôle ultérieur.
- Les commits frontend `f2f66ec` et `8eaf517` étaient également présents à distance. L’utilisateur les a explicitement refusés : ils n’ont pas été appliqués au frontend local.

## 16:15–16:24 — annulations frontend et sécurisation de la conservation

- Annulation des effets de `8eaf517` par `2a40b33` et de `f2f66ec` par `0d356bb`, à 16:15. Le dossier frontend publié retrouve exactement sa version précédente ; aucun changement du frontend local.
- Purge corrigée : événements référencés par reminder_window conservés, fichiers supprimés uniquement après commit et vérification sous verrou ; rollback sans perte de fichier.
- Clôture complétée : coordonnées, profil, expérience, disponibilités, préférences, favoris, notifications, sessions, Google, accès organisation et historiques MongoDB. Historique métier conservé explicitement ; pas de promesse d’anonymisation totale.
- Sauvegarde de recette privée avec base SQL fictive neuve, mission, affectation et confirmation PDF ; composants MongoDB/Vault/n8n issus d’une sauvegarde historique vérifiée.
- Restauration représentative réussie à 16:18 : 2 comptes fictifs, 1 mission, 1 affectation, 1 PDF déchiffré ; Vault et trois workflows restaurés. Correctif du script pour une installation vierge et comparaison avec l’instantané plutôt que la base locale courante.
- Campagne finale : 159 tests backend réussis, PostgreSQL/MongoDB/n8n isolés ; couverture 81,16 % lignes et 80,45 % branches. Simulation de purge locale : aucun élément à supprimer, aucune purge réelle déclenchée.
- Backend seulement synchronisé vers le projet local après sauvegarde des sources précédentes ; API et worker redémarrés, santé contrôlée. Commit `6fdc77c` à 16:24 ; push authentification et CI verte.

## 16:32 — sauvegarde sur main et bilan consolidé

- Main ne contenait que le commit initial. Intégration sans conflit de la version validée et publication du bilan consolidé, commit `abdc5c5` à 16:32. CI main backend/frontend verte.
- Vérification des raccordements déjà réalisés : recherche avancée, FINESS, calendrier, explications, préférences et pagination. Les anciens manques ont été retirés du bilan actuel.
- Sources locales comparées au dépôt : frontend identique ; seuls des sauts de ligne finaux diffèrent sur quelques scripts backend. Secrets et archives de bases conservés hors Git.

## Lot actuel — en cours, non encore publié

Demande : finaliser conservation/demandes de clôture/planification/sauvegardes, Google sur l’origine utilisée, fraîcheur des annonces et contrats OpenAPI. Vercel viendra ensuite.

- Ajout en cours d’une migration et d’API privées de demande de clôture : demande, consultation et annulation ; validation opérateur avant traitement. Registre d’effacement privé prévu pour empêcher une restauration de réintroduire les comptes clôturés.
- Ajout en cours d’une maintenance de fraîcheur : expiration connue ou non-observation pendant trente jours ; absence dans un import partiel jamais assimilée à fermeture fournisseur.
- Complément OpenAPI en cours : schémas de réponses, variantes Google, profils, matching, organisations, référentiels, téléchargements et en-têtes de sécurité. Compilation intermédiaire réussie ; tests complets restant à lancer.
- Préparation de durées de conservation techniques pour le POC fictif et de la maintenance quotidienne ; pas encore activée.
- Google Cloud ouvert dans Edge, connexion impossible signalée par l’utilisateur. À sa demande, Google Cloud ouvert dans Firefox. Connexion utilisateur et vérification des origines encore en attente ; aucune connexion Google réelle réputée validée.

## Règle de suivi

Ajouter une entrée à chaque étape significative : changement, test et résultat, migration/activation, commit/push, correction annulée ou obstacle. Indiquer les preuves ou commits et mettre à jour le statut du lot courant avant de terminer. Ne pas remplacer les preuves d’échec par une affirmation de réussite ; noter la correction et le nouveau résultat.

## Sauvegarde demandee sur Backend

- Sauvegarde du backend, scripts et documentation sur la branche existante `Backend` de `Ziwazou/infiMatch`, en conservant son historique. Aucun fichier frontend ajoute a cette sauvegarde.
- Le lot conservation, fraicheur et OpenAPI reste en cours : compilation reussie mais la derniere campagne isolee a termine en echec dans la commande coverage. Les preuves de cet echec sont conservees ; validation et activation restent a terminer.
- Google : connexion Firefox et verification des origines toujours en attente. Vercel non commence.

## Copie vers le depot de production

- A la demande utilisateur, copie exacte de la branche Backend de Ziwazou/infiMatch vers le depot vide lebretyves/Infimactch_Prod, avec historique Git. Commit distant verifie : a9eda6f3fd5e2d3e46411f54fe9bb674692e6db7.
- Droits ADMIN confirmes sur le depot destination ; Backend definie comme branche par defaut. Aucun deploiement Vercel effectue. Le statut de validation du lot reste inchange.

## Diagnostic du premier deploiement Vercel

- Deploiement GitHub Production du commit a9eda6f confirme. Utilisateur signale FUNCTION_INVOCATION_FAILED (500). URL de deploiement protegee : controle HTTP externe redirige (302), pas de validation de sante possible sans acces.
- Code inspecte : configuration obligatoire au demarrage (DATABASE_URL, MONGODB_URI, SESSION_SECRET, DOCUMENT_KEY, SERVICE_TOKEN, APP_ORIGIN, TRUST_PROXY en production), connexion PostgreSQL immediate. Secrets locaux exclus du depot par conception.
- CLI Vercel non authentifiee ; journal runtime demande pour distinguer configuration manquante, connexion base et erreur de runtime. Cause exacte non encore confirmee. Branche Backend sans interface frontend ; stockage documentaire local et worker demandent une configuration de production specifique. Aucun correctif ni redeploiement affirme.

## Ajout de l application complete au depot de production

- Ajout du frontend valide (version conservee sur main), de la CI et du guide DEPLOIEMENT_PRODUCTION.md. Configuration Vercel frontend avec navigation SPA et exclusion des chemins API.
- Utilisateur confirme que tous les services sont uniquement locaux. Hebergement des bases, documents, worker et automatisations encore necessaire. Aucun service cloud provisionne.
- Premier build dans la copie sans dependances a echoue ; apres npm ci dans la copie de production, compilation frontend reussie. Douze tests frontend reussis avant copie ; nouvelle execution sur la copie de production. Avertissement de taille du bundle principal (~628 ko).

## Comparaison local / branche production 38cf7e9

- HEAD distant Backend verifie : 38cf7e9b43f9f60bf96e2197985fe25ba78e93bf. Deploiement GitHub associe termine selon Vercel ; cela ne prouve pas le fonctionnement runtime. Reglages internes Vercel non accessibles faute de session CLI.
- Frontend : 493 fichiers identiques au projet local, configuration frontend/vercel.json supplementaire. Infrastructure : sept fichiers identiques.
- Docker : PostgreSQL/PostGIS 17-3.5, MongoDB 8.0.5 et Vault 2.1 running/healthy ; n8n 2.38.7 running sans healthcheck. Conteneurs issus des fichiers Compose de InfiMatch/infra. Ports lies a 127.0.0.1 uniquement (55432, 57017, 55678, 58200).
- Backend : 80 fichiers identiques, huit modifies et cinq nouveaux sur la branche. Changements conservation/cloture, fraicheur et OpenAPI encore en validation et non synchronises avec le runtime local. Scripts : restauration modifiee, trois nouveaux scripts de maintenance ; trois autres differences limitees aux fins de fichier.
- API locale 3100 /api/v1/health repond ok ; ports 3101, 5173 et 8443 egalement en ecoute. Front, API et worker ne sont pas des services definis dans Compose. Aucun Dockerfile applicatif trouve dans infra.
- Compose configure le fonctionnement local (n8n vers host.docker.internal:3100 et cookies non securises pour son acces local). Ce fichier ne constitue pas un deploiement cloud de l application complete. Volumes, secrets et certificats prives ne sont pas dans Git.

## Verification GitHub et Vercel apres changement de branche

- La branche distante est desormais Main (majuscule), branche par defaut ; Backend absente. Commit inchange 38cf7e9, contenant front et back.
- Controle Vercel success et dernier deploiement termine pour ce commit, sans preuve de fonctionnement runtime.
- CI precedente 35114246881 : frontend succes, compilation backend succes, test:isolated echec. Nouvelle CI 35122667024 sur Main : frontend succes, backend encore en cours lors de la verification. Le depot ne peut donc pas etre declare entierement vert.

## Sauvegarde fusion-front_Back

- Copie exacte du contenu de Infimactch_Prod/Main (38cf7e9) sur Ziwazou/infiMatch fusion-front_Back. Historique destination conserve via commit de fusion b5f2c6394efcc32d3eca2ecdb82633aefd6c813d ; egalite des arbres Git verifiee avant push. Aucun secret ou fichier prive local ajoute. Statut de validation backend inchange.


## Integration dans l application locale et retest complet

- Sources backend/scripts synchronisees vers E:/Interimatch/InfiMatch. Anciennes sources sauvegardees dans data/before-local-sync-1789577171. Sauvegarde privee complete apres arret API/worker : backups/full-v1-2026-09-16T16-48-20-024Z (26 fichiers).
- Correction de la reponse OpenAPI GET /facilities/{id} manquante. Lecture HTTP du document dans les deux tests effectuee avec fetch et delai maximal explicite, sans retrait des assertions. Corrections recopiees dans les deux dossiers de publication, pas encore poussees.
- Campagne isolee reussie : 162 tests backend, zero echec ; couverture 81,31 % lignes / 80,37 % branches ; regressions PostgreSQL et workflows n8n reussis.
- Migration PrivacyRequests1789381100000 appliquee a la base locale. API 3100 et 3101, proxy HTTPS et worker redemarres. Sante des deux API ok ; accueil et OpenAPI HTTPS 200 ; cloture sans session 401 attendu.
- Frontend local : 12 tests reussis et build reussi, avertissement bundle principal ~628 ko. Accueil et connexion verifies dans un navigateur Edge dedie ; pas de nouvelle connexion Google reelle testee.
- Aucun traitement de purge ni planification destructive active. Une commande regroupee de diagnostic a ete refusee par la revue automatique car elle incluait des commandes nommees purge/retirement ; seules les verifications HTTP ont ensuite ete executees. Aucune suppression effectuee.
- Vercel et ses services distants restent a configurer ; les tests locaux ne prouvent pas que l erreur 500 distante est resolue.

## Verification de l hypothese architecture Vercel

- Machine locale verifiee : win32 x64. Aucun node_modules, binaire .node ni .vercel/output suivi dans la copie Git. Les logs fournis montrent une installation et une construction sur Vercel depuis GitHub. Hypothese Apple Silicon ARM non etayee pour ce projet.
- Documentation officielle FUNCTION_INVOCATION_FAILED accessible ; erreur generique de runtime, non preuve de conflit architecture. Diagnostic definitif toujours conditionne aux journaux runtime. Dernier deploiement Preview reference encore 38cf7e9.

## Prise en main Vercel demandee

- Session navigateur dediee vercel-setup ouverte sur les reglages du projet neotravel/infimactch-prod-backend ; redirection vers connexion Vercel. Connexion utilisateur demandee directement dans la fenetre, sans transmission de mot de passe.
- Depot distant confirme : lebretyves/Infimactch_Prod, branche Main, commit 38cf7e9 ; dossier frontend et configuration Vite presents. Reglages Vercel non modifies tant que la connexion n est pas effectuee.

## Objectif precise : application autonome sur Vercel

- Utilisateur demande l application complete sans dependance au PC. Session Vercel connectee ; reglage confirme NestJS / backend / Node24. Aucun stockage raccorde visible ; catalogue PostgreSQL, MongoDB Atlas et Blob inspecte, aucune creation ni souscription.
- Plan detaille dans docs/DEPLOIEMENT_AUTONOME.md. Decision demandee sur conservation n8n/Vault heberges separement ou remplacement pour Vercel ; aucune adaptation supprimant ces composants effectuee sans choix utilisateur.

## Recherche solution autonome gratuite

- Comparaison documentee Oracle Always Free, Vercel, Render et Koyeb. Proposition : frontend Vercel et pile V1 complete sur VM Oracle ARM, sous disponibilite et quotas. Aucun service cree. Image PostGIS actuelle uniquement amd64 verifiee : adaptation ARM necessaire. Proposition detaillee dans SOLUTION_HEBERGEMENT_GRATUIT.md ; hebergement API hors Vercel a valider.

## Verification V1 / n8n / Teams et ordre de travail

- Verification en lecture seule : n8n list:workflow --active=true confirme InfiMatchConfirm, InfiMatchMatches et InfiMatchReminders actifs localement. Les exports active=false sont des fichiers d import, pas la preuve de l etat runtime. Relances planifiees chaque heure.
- Notifications internes MATCH, REMINDER et CONFIRMATION implementees ; worker/outbox avec verrous, tentatives et recus. Aucun noeud Teams dans les trois workflows. Base locale sans notification au moment du controle, aucun evenement en attente/exhausted dans les resultats affiches.
- Ecarts : matching verifie account.active et notifications_enabled ; destinataires relance/confirmation filtrent membership.active mais pas explicitement account.active dans ces requetes. Preference par canal Teams et livraison externe a concevoir avant activation. Un recu interne ne prouve pas un envoi Teams.
- Documentation V1 prevoit notifications internes de base et canal externe de demonstration optionnel ; Teams correspond a la demande supplementaire utilisateur. Commencer par definir un canal Teams de test autorise, evenements et destinataires, puis corriger ciblage, ajouter livraison Teams tracee et tester echec/reprise/doublons sur donnees fictives avant migration cloud. Aucun message externe envoye.

## Relecture du kick-off original

- Source lue : docs/proofs/kickoff-source-extracted.txt (extraction du sujet), pages physiques 3 a 7 ; architecture V1 section 10 recoupee. Kick-off exige deux automatisations minimum et conseille Slack/Discord, ne prescrit pas Teams, Redis ou Vercel. V1 retient trois workflows dont la confirmation.
- Contraintes : backend Node TypeScript, SQL + NoSQL, auth classique securisee, chiffrement, missions/profils/matching/tableau de bord, donnees publiques nettoyees et utilisees, CLI, tests unitaires/fonctionnels avec couverture et exports workflows/README.
- Correction notifications en cours : filtrage account.active pour relances/confirmations et deux tests ajoutes. Premiere campagne 164 tests : echec de fixture utilisant une colonne membership.role inexistante ; fixture corrigee et campagne relancee. Aucun envoi Teams ni push.

## Audit global actuel

- Rapport AUDIT_GLOBAL_ACTUEL_2026-09-16.md cree : exigences kickoff, sources, runtime, Git, notifications, retention, front, dependencies et exploitation. 164 tests backend PASS (81,99 % lignes / 80,34 % branches) ; npm audit production backend/frontend zero alerte connue. CI distante toujours rouge sur 38cf7e9. Trois workflows actifs, pas de Teams ni maintenance programmee. Aucun changement applicatif ni envoi externe pendant cet audit.

## Point 1 ? alignement et publication des correctifs testes

- Synchronisation des correctifs OpenAPI et ciblage des notifications depuis le backend local teste (164 tests PASS). Compilation locale reussie puis redemarrage API 3100, API HTTPS et worker. Accueil et sante HTTPS verifies 200.
- Controle des fichiers de publication contre les secrets prives locaux : aucun secret configure detecte. Publication sur Infimactch_Prod/Main et fusion-front_Back en conservant leurs historiques. CI distante a suivre apres ce commit ; anciens rapports decrivent leur date de verification.

## Point 1 termine ? CI verte sur les deux depots

- Infimactch_Prod/Main : 774ef7e1df1287e99fac4351a3a89a4316de8567 ; CI 35129806860 completed/success (frontend et backend).
- Ziwazou/infiMatch/fusion-front_Back : 19253dac7d3596229e129ff74e7343c988e34456 ; CI 35129813604 completed/success (frontend et backend).
- Egalite des contenus Git verifiee par diff sans ecart. Tous les fichiers backend de publication identiques aux sources locales apres normalisation des fins de ligne. API et worker recompiles/redemarres ; accueil et sante HTTPS 200.
- Les constats anterieurs du rapport global sur la CI rouge et la correction notifications non activee sont desormais resolus. Cette entree de verification finale reste locale apres les pushes ; aucun deploiement cloud fonctionnel declare.

## Point 2 ? conservation et preparation des utilisateurs reels

- Historique metier sans purge automatique par defaut ; BUSINESS_HISTORY_RETENTION_DAYS exige une duree explicite a valider. Politique detaillee dans CONSERVATION_UTILISATEURS_REELS.md, sources CNIL consultees. Pas de declaration de conformite ni activation de purge reelle.
- File SQL document_erasure atomique avec suppression SQL, reprise des fichiers apres panne ; approbation cloture auditee ; echec individuel isole et code de sortie CLI non nul si lot incomplet. Registre privacy ajoute aux sauvegardes, registre de recette separe lors de restauration.
- 167 tests backend PASS, couverture 82,11 % lignes / 80,54 % branches. Premiere compilation des nouveaux tests corrigee (ordre des arguments store), puis campagne complete PASS. Restauration representative avec verification effective de l effacement d un compte dans la base restauree PASS.
- Sauvegarde privee pre-migration full-v1-2026-09-16T18-49-11-878Z (27 fichiers). Migration ErasureRecovery1789381200000 appliquee localement ; API/worker/HTTPS redemarres. Aucune tache de purge installee.
