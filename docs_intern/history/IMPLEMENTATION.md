# Journal de rÃ©alisation InfiMatch

## 14 septembre 2026 â€” initialisation et premier parcours
- Demande utilisateur : dossier InfiMatch, backend conforme Ã  100 % du pÃ©rimÃ¨tre validÃ©, historique de reprise, code vÃ©rifiÃ©.
- Sources copiÃ©es dans docs/references avec empreintes SHA-256. SynthÃ¨se des dÃ©cisions dans DISCUSSION.md ; ce n'est pas un export intÃ©gral de la conversation.
- Installation Node 24, NestJS, PostgreSQL/PostGIS/btree_gist, MongoDB, TypeORM. Docker Desktop dÃ©marrÃ© et bases locales dÃ©marrÃ©es.
- Ã‰chec initial npm : chaÃ®ne de certificats. CorrigÃ© en utilisant NODE_OPTIONS=--use-system-ca, sans dÃ©sactiver TLS.
- NestJS 11 prÃ©sentait une dÃ©pendance Multer vulnÃ©rable. NestJS 12 corrige cette dÃ©pendance mais utilise ESM, incompatible avec Jest 29 sans adaptation. Essai d'override npm non appliquÃ©, abandonnÃ©.
- Choix final vÃ©rifiÃ© : NestJS 12.0.2, Swagger 12.0.1, tests natifs Node 24 et assertions expect. Audit npm : zÃ©ro vulnÃ©rabilitÃ© lors de cette installation.
- Migration InitialSchema1789380000000 appliquÃ©e sur PostgreSQL rÃ©el : contraintes spatiales, unicitÃ© et exclusion des affectations, cohÃ©rence diffÃ©rÃ©e mission/affectation.
- Premier rÃ©sultat : 22 tests unitaires et 2 tests fonctionnels passent. Le test fonctionnel exerce une course Ã  deux affectations, des permissions inter-organisations, le rejeu idempotent, l'annulation et la reconfirmation.
- Les donnÃ©es RPPS positives du test fonctionnel sont des fixtures SQL explicitement isolÃ©es du code public. Aucun appel ANS authentifiÃ© rÃ©el n'a Ã©tÃ© rÃ©alisÃ©.
- Recherche, favoris, dashboards, stockage MongoDB et chiffrement documentaire ajoutÃ©s ensuite : compilation TypeScript rÃ©ussie, recette supplÃ©mentaire en cours.
- Ã€ poursuivre : tests et corrections, automatisations rÃ©elles n8n, acquisition publique rÃ©elle, contrÃ´les manquants, documentation de livraison et preuves.

## Parcours et sauvegardes compl?mentaires
- Trois workflows import?s, publi?s et r?ellement ex?cut?s dans n8n 2.38.7. Notifications, relance, PDF priv? et rejeux contr?l?s dans le test fonctionnel ; IDs d'ex?cution conserv?s sans corps de requ?te.
- 37 tests r?ussis sur la derni?re passe compl?te, compilation et typecheck r?ussis. Le taux de couverture actuel est dans coverage-totals.json ; il a chang? apr?s ajout du seed et des modules. Il ne faut pas reprendre le taux d'une ancienne passe.
- Adaptateur RPPS corrig? apr?s v?rification des syst?mes d'identifiant FR Core officiels. Test concurrent prouvant qu'une r?ponse ancienne n'?crase pas le num?ro courant.
- Lecture des r?sultats TypeORM normalis?e : correction d'une perte de version apr?s UPDATE RETURNING. Ajout des qualifications d?clar?es s?par?es, cl?s documentaires versionn?es et r?servation des confirmations.
- Les changements de profil et r?sultats RPPS produisent aussi des demandes de matching. Le worker a remis de vrais ?v?nements ? n8n et v?rifi? leurs re?us.
- Seed rejouable, trois comptes fictifs, secrets locaux ignor?s. Import France Travail test? sans cl?s : ?chec explicite, aucune acquisition fictive revendiqu?e.
- Sauvegarde PostgreSQL restaur?e dans une base s?par?e, coh?rence v?rifi?e. Historique Git et bundles ind?pendants des donn?es/clefs.
- Les ?carts de production, int?gration publique, lots/pagination et recette exhaustive restent ouverts dans REPRISE_BACKEND_V1.md. Ce point de reprise n'est pas une validation ? 100 % de la V1.

## Renforcements après le point e0defee
- Classement global des recommandations/candidats par lots, pagination validée, notifications et relances par lots sans coupure arbitraire.
- Même distance PostGIS pour recherche, matching, affectation et contrôle du profil ; pondérations configurables et versionnées par empreinte.
- Recherche commune interne/externe et favoris d'offre expirée vérifiés sur une source TEST_FIXTURE clairement synthétique.
- Reprises SQL bornées, panne MongoDB explicite avec audit, traces expirées/périmées rejetées, récupération STAGING et rotation des clés testées sur des fichiers fictifs.
- Session renouvelée à la connexion, session expirée refusée, routes de service interdites aux comptes ordinaires, clôture atomique et impossibilité de rouvrir une mission terminée testées.
- Dernière vérification : 44 tests réussis ; couverture 70,11 % lignes et 80,91 % branches. Audit npm : zéro alerte. Aucun accès public authentifié réel nouveau.
- Contrôle de secrets corrigé pour gérer nouveaux fichiers et suppressions ; aucune valeur de secret local détectée. Lanceur de vérification corrigé pour éviter le shell intermédiaire Windows.

## Synchronisation documentaire du 14 septembre 2026

README et REQUIREMENTS_V1.md relient les exigences, preuves, architecture et flux. Le plan décrit maintenant les fichiers présents. Les archives sources et le code restent inchangés ; les 44 tests renvoient au commit 28923fc. Les limites de recette, fournisseurs et production sont conservées.

## Actualisation des acces fournisseurs

France Travail : authentification et import reels reussis, 50 offres du lot relues en SQL avec provenance et rejeu sans doublons. Le blocage des identifiants France Travail est leve ; ANS reste non verifie en reel. FINESS : controle de l’archive realise, integration geographique en attente du systeme de projection source. Voir le [compte rendu et les preuves](../ACQUISITION_REELLE.md). Les mentions precedentes d’absence de cles France Travail decrivent l’etat anterieur.

## FINESS et fournisseurs - 15 septembre 2026

Acces France Travail reel teste. Source FINESS fournie puis snapshot officiel telecharge et importe. Premiere lecture JSON en memoire en echec sur la limite de chaine Node, remplacee par une lecture en flux avec empreinte. Migration additive Finess1789380300000. Correction des formats corses, routes de recherche et lookup, conservation des identites sans coordonnees. Import rejoue sans doublons et recette HTTP reussie. 48 tests passent ; couverture 68,52 % lignes, 80,12 % branches. Les anciennes preuves gardent leur portee historique.

## Acces ANS/FHIR verifie le 15 septembre 2026

La cle configuree a permis un appel reel a Practitioner : HTTP 200, Bundle FHIR de recherche et resultat NOT_FOUND sur le numero synthetique 00000000000. Aucun profil n'a ete modifie. Ce test valide l'acces et le cas absence, pas le cas FOUND sur un professionnel reel. Preuve : docs/proofs/ans-fhir-live.json (proofs/ans-fhir-live.json depuis docs).

Les anciens constats de cle manquante sont historiques. Restent notamment le controle positif sur un RPPS reel autorise et la recette complete du parcours. La cle et les fichiers .env restent exclus de Git.

## Revue et recette V1 du 15 septembre 2026

Demande utilisateur : retester, identifier les manques et corriger. Baseline 48 tests ; apres corrections 56 tests, 75,99 % lignes et 81,08 % branches. Correction de la pagination, des commandes metier rejouables, du classement admissible, de la confirmation apres cloture, du cache prive et de la reprise outbox. Tests ajoutes pour les reprises et conflits de reservation PDF. Cas RPPS FOUND reel confirme, sans profil reel modifie. Bilan detaille : docs/RECETTE_BACKEND_V1.md. Le client doit fournir Idempotency-Key sur les commandes documentees.


## 2026-09-15 - Rectification France Travail autorisee
Utilisateur : appliquer les propositions issues des essais IDE/IADE/IBODE et fournir le rectificatif du catalogue. Explication donnee : externe = source France Travail/partenaire, candidature par redirection ; interne = gere dans InfiMatch. Corrections et tests decrits dans ../RECTIFICATIF_CATALOGUE_V1.md. 62 tests reussis, import reel 134 offres et rejeu sans doublons. Incident du script de preuve HTTP : limite de taille de reponse du client de test, relance reussie apres augmentation explicite de cette limite. Aucun secret dans les preuves.


## 2026-09-15 - Comparaison partielle des annonces externes
Demande utilisateur : implementer la gestion des informations manquantes et fournir une explication transmissible. Comparaison privee au profil, champs a completer/a confirmer, incompatibilites connues, indices et option explicite de pistes incompletes. 71 tests passes ; HTTP prive et absence de fuite entre deux profils verifies. 134 offres reelles acquises, comparees a des profils fictifs sans mutation. Aucun score complet externe. Le catalogue original reste en attente de remplacement, bloque precedemment par Windows ; son etat nest pas change par cette livraison.


## 2026-09-15 - Schema architecture actualise
Demande utilisateur : refaire le schema fourni plus clairement et selon le backend actuel. Exports PNG/PDF/SVG et source de generation ajoutes. Roles RPPS, FINESS et France Travail separes ; worker et trois workflows n8n locaux visibles ; frontend, proxy HTTPS et n8n Cloud marques a integrer. Deux modes de matching et limite ETP explicites. Controle visuel effectue, aucune modification du backend.


## Architecture cible de la V1 finalisee
Demande utilisateur : montrer le schema lorsque le projet sera termine. Vue cible separee en PNG/PDF/SVG, avec frontend, proxy HTTPS et n8n Cloud raccordes. Controle visuel effectue. Aucun deploiement ni changement du backend realise dans cette mise a jour.


## 2026-09-15 — Bilan Word kick-off et sauvegarde de reprise
Demande : Word réalisé/reste à faire, intégration de la checklist utilisateur, lecture historique et reprise des sauvegardes de conversation. Livrable : docs/BILAN_BACKEND_KICKOFF_V1.docx. Sources recoupées : sujet, historique, preuves et code ciblé. 71 tests / 79,38 % lignes / 84,33 % branches sont les dernières preuves existantes, sans nouvelle exécution. Synthèse et échange joint archivés dans docs/history/conversations. Archive documentaire horodatée et manifeste SHA-256 dans E:/Interimatch/backups ; exclut secrets, bases et fichiers privés. Pas de planificateur permanent installé.


## 2026-09-15 ? D?tail des travaux s?curit?
Lecture cibl?e du code et configuration ; r?ponse d?taill?e actions/validation. Aucun code modifi? ni test relanc?. Synth?se de conversation : docs/history/conversations/20260915-114940-detail-securite.md. Sauvegarde documentaire locale v?rifi?e au jalon.


## 2026-09-15 ? Copie backend sur Ziwazou/infiMatch
Branche Backend publi?e : 08ef4c7. Code, tests, configuration, scripts et workflows ; README autonome. 55 tests unitaires, typage et compilation r?ussis. Documents de cadrage, preuves et conversations exclus apr?s refus automatique de la copie ?largie. Source locale conserv?e. Voir docs/history/conversations/20260915-115918-copie-github-backend.md.


## Connexion pgAdmin ? 15 septembre 2026
InfiMatch local ajout? par import officiel ; authentification v?rifi?e sans affichage des secrets. Actualisation de la fen?tre utilisateur n?cessaire. Voir docs/history/conversations/20260915-141602-pgadmin.md.


## pgAdmin r?cent ouvert ? 15 septembre 2026
Version 9.17 install?e s?par?ment ; connexion InfiMatch v?rifi?e dans l?interface. Raccourci E:/Interimatch/pgAdmin InfiMatch.lnk. Synth?se : docs/history/conversations/20260915-142715-pgadmin-recent.md.


## 2026-09-15 ? Vault V1 et pr?paration V2
Installation Vault locale et dossier V2 autoris?s. TLS, Raft, KV v2, audit et AppRoles op?rationnels ; 10 tests Vault et 55 unitaires backend passants. Recette de red?marrage et API v?rifi?e. .env historique conserv?. Rotation des SecretID non ex?cut?e apr?s refus du contr?le automatique ; restauration compl?te non d?montr?e. Voir docs/VAULT_V1.md, V2/README.md et docs/history/conversations/20260915-144917-vault-v1-v2.md. Sauvegarde locale sans secrets effectu?e.


## Ouverture Vault et contr?le .env
11 secrets distincts compar?s sans ?cart ; preuve docs/proofs/vault-env-comparison.json. Vault actif, interface Edge blanche. .env conserv?, aucune valeur secr?te affich?e, aucune rotation.


## Suivi permanent des interventions Vault

Consigne pour les prochaines interventions : apres toute modification autorisee des secrets ou de la configuration, comparer les valeurs attendues avec Vault sans les afficher. Synchroniser uniquement les changements voulus et valider les consommateurs concernes. Ne pas ecraser une divergence sans en comprendre la cause. Aucun service de synchronisation permanente n'est installe. Une mise a jour des valeurs KV ne change pas les mots de passe des serveurs et ne recharge pas les processus deja demarres. Les rotations AppRole restent une operation distincte.

Dernier controle : 11 secrets distincts identiques au .env ; aucune synchronisation necessaire. Details : docs/history/conversations/20260915-151237-suivi-vault-reste-v1.md


## Correction de l'ouverture de Vault - 15 septembre 2026

Cause observee dans Edge : ERR_SSL_CLIENT_AUTH_CERT_NEEDED. Le listener demandait un certificat client facultatif alors que cette installation utilise AppRole. Ajout de tls_disable_client_certs = true dans infra/vault/server.hcl ; HTTPS, verification du certificat serveur et authentification AppRole conserves. Redemarrage et deverrouillage effectues.

Verification : page Sign in to Vault affichee a https://127.0.0.1:58200/ui/vault/auth ; 10 tests Vault reussis. Aucune connexion utilisateur effectuee, aucun nouveau jeton permanent cree. Aucun secret KV modifie. Le constat anterieur d'interface blanche est resolu.

Reference : https://support.hashicorp.com/hc/en-us/articles/5714330338323-Disable-Prompt-for-Client-Certificate-When-Loading-UI


## Compte personnel Vault

Compte lebre et policy lecture V1 prepares, non appliques. Creation bloquee par controle automatique : autorisation explicite de recuperation administrateur requise. Voir VAULT_ACCES_PERSONNEL.md.


# Acces personnel Vault - cree le 15 septembre 2026

Apres autorisation explicite de recuperation administrateur, le compte lebre a ete cree avec Userpass. Connexion API et navigateur verifiees. Policy infimatch-personal-lebre : lecture des secrets backend et infra V1, navigation par metadonnees, session personnelle et changement de son propre mot de passe. Aucun droit de modification des secrets, V2 ou administration. Session 30 minutes, maximum 2 heures.

Mot de passe aleatoire remis uniquement dans data/vault/Acces-Vault.txt et userpass-lebre.json, proteges par ACL Windows (utilisateur courant et SYSTEM), ignores par Git. Ces fichiers ne sont pas inclus dans les sauvegardes de conversation. Ne pas copier leur contenu dans les documents. Une modification du mot de passe dans Vault ne met pas automatiquement ces fichiers a jour.

Le jeton root temporaire a ete revoque et son refus d'acces verifie. La configuration de recuperation a ete retablie ; la procedure generate-root sans authentification est de nouveau refusee. Aucun secret KV, mot de passe de base ou SecretID AppRole modifie. Les 10 tests Vault existants passent. Preuve : docs/proofs/vault-personal-account.json.

Connexion : https://127.0.0.1:58200/ui/ ; methode Userpass ; utilisateur lebre. Le compte est un acces utilisateur distinct des 11 secrets applicatifs KV. Les mentions anterieures de compte non cree sont historiques.


# MongoDB : role, etat et acces

Verification locale : conteneur infimatch-mongo-1 actif et healthy ; connexion authentifiee reussie avec MONGODB_URI lu dans Vault. Serveur 127.0.0.1:57017, base infimatch, collection matchingruns, 243 documents au moment du controle. Volume Docker infimatch_mongo-data monte dans /data/db. Aucun document individuel ni mot de passe affiche.

MongoDB conserve les resultats et explications de matching interne, les versions des regles/profils/missions et une date d'expiration. Le calcul est fait par le backend. Retention par defaut du code : 30 jours, configurable, avec index TTL. Si MongoDB est indisponible, le calcul peut etre retourne avec historyStatus UNAVAILABLE ; les explications archivees sont indisponibles.

Acces humain possible via MongoDB Compass : utiliser MONGODB_URI conserve dans Vault, kv/infimatch/v1/backend ; utilisateur infimatch, authSource admin. Ce port MongoDB n'est pas une page web. Compass non detecte aux emplacements Windows habituels verifies. Le compte utilise actuellement le role root sur admin : creer un compte applicatif limite a la base reste un chantier de securite, non realise dans ce controle.


# Ouverture MongoDB Compass

Compass 1.50.0 Windows portable installe dans E:/Interimatch/outils/MongoDBCompass depuis la release officielle mongodb-js/compass. Signature Authenticode valide, editeur MongoDB Inc. Application ouverte et connexion InfiMatch local enregistree et verifiee. URI lue depuis Vault en memoire sans affichage dans les journaux. Base infimatch visible ; aucun document modifie. Le compte MongoDB utilise reste le compte existant : aucun changement de permissions ou de mot de passe serveur effectue.

Raccourci : E:/Interimatch/MongoDB Compass InfiMatch.lnk. Lanceur sans port de diagnostic : outils/Ouvrir-MongoDB-Compass.ps1. Le lanceur retire ELECTRON_RUN_AS_NODE de son propre environnement pour permettre le demarrage graphique. Choisir InfiMatch local, puis infimatch, puis matchingruns.

pgAdmin et Compass sont complementaires : le premier consulte PostgreSQL, le second MongoDB. Vault conserve les secrets d'acces. Aucun nouveau compte cloud necessaire.


# Push Backend et verification MongoDB

Push reussi : https://github.com/Ziwazou/infiMatch/tree/Backend ; commit a5ce5feed756c2d4a3c4a0704108a53646443467, tete distante verifiee. 22 fichiers techniques Vault, documentation equipe et preparation V2. Aucun .env, cle privee, donnees de bases, acces personnel ou conversation publie.

Typecheck, build et 55 tests backend passes dans la copie de publication. 10 tests Vault passes sur l'installation locale avec scripts identiques verifies. Controle contre les secrets locaux reussi. Recette fonctionnelle complete non relancee.

MongoDB : healthy, ping authentifie reussi, 243 documents dans infimatch.matchingruns. Compass rouvert, connexion sauvegardee retrouvee. Fenetre initialement sur admin, repositionnee sur infimatch ; tableau matchingruns affichant 243 documents. Aucune donnee modifiee.

Bundle local verifie : E:/Interimatch/backups/InfiMatch_Backend_a5ce5fe.bundle. Sauvegarde du code et documents techniques, pas des bases ni secrets.


# README des services publie

Commit 13589daf3850a4b35422bdac28e080ca9368f971 pousse et verifie sur Ziwazou/infiMatch, branche Backend. README complete : roles PostgreSQL/PostGIS, MongoDB et Vault ; applications pgAdmin et Compass ; ports, bases, source des identifiants sans leurs valeurs ; Userpass conditionne a un compte personnel cree ; commandes de demarrage/verification et limites des sauvegardes Git.

Verification documentaire : diff sans erreur, liens locaux presents et controle des secrets passe. Aucun changement de code ou de secret. Bundle local InfiMatch_Backend_13589da.bundle verifie.


# Recuperation locale du frontend

Source : branche front-end, commit 8a4134b1b6cc45ce01b0b707061ccffd97642e2d (feat:AUTH), auteur Git ziwazou. Le dernier commit a supprime 14 fichiers de missions, candidatures et composants associes. Ils ont ete recuperes depuis son parent 348b07a sur la branche locale recuperation-ecrans-front.

## Recupere

Recherche et filtres de missions, detail, formulaire de candidature, liste des candidatures, cartes, types et donnees de demonstration. Routes restaurees sous ProtectedRoute et navigation completee. Les nouvelles pages d'authentification, le contexte Auth et les etapes d'inscription du dernier commit sont conserves. Calendrier et profil restent des pages d'attente ASuivre.

## Verification

Compilation TypeScript/Vite reussie avant et apres recuperation. Navigateur : /missions sans session affiche la connexion ; apres connexion simulee, /missions, /missions/1842, /missions/1842/candidater et /candidatures affichent leurs ecrans. Aucune candidature envoyee, aucun compte backend cree. Demonstration locale : http://127.0.0.1:5173.

## Manque encore pour l'integration reelle

- Auth : le frontend simule une connexion quand VITE_API_URL est absent. Il attend un token Bearer dans localStorage et un champ motDePasse ; le backend utilise une session cookie, un jeton CSRF et password. Definir l'URL seule ne suffit pas.
- Inscription : adapter family NURSE/ENTERPRISE, organizationType, termsVersion et l'enregistrement du profil aux routes existantes. Le frontend conserve notamment des champs bancaires en stockage local dans sa simulation : utiliser uniquement des donnees fictives.
- Session : recuperer /api/v1/auth/csrf, transmettre les cookies et X-CSRF-Token pour les ecritures, harmoniser l'origine/proxy. Ne placer aucun secret Vault dans les variables VITE_ exposees au navigateur.
- Mot de passe oublie : ecran et simulation presents ; aucun envoi reel demontre.
- Missions, favoris, candidatures, notifications, explications du matching, documents et tableaux de bord : remplacer les donnees et etats simules par les appels API autorises. Gerer Idempotency-Key pour les commandes concernees.
- Completer les ecrans non implementes et les parcours entreprise/agence, puis recette commune frontend/backend.

Cette recuperation restaure du code existant ; elle ne declare pas le frontend connecte au backend. Aucun push sur front-end ou Backend effectue dans cette intervention.

Copie locale : E:/Interimatch/infiMatch-front-end. Bundle Git verifie : E:/Interimatch/backups/InfiMatch_front_recuperation.bundle.


## 16 septembre 2026 ? R?cup?ration s?curit? et sessions

Les deux branches s?curit? sont int?gr?es au code local avec adaptations Google, Vault, migrations et frontend documents/RIB. 101 tests unitaires backend et 10 tests API frontend passent ; les deux compilations passent. Migrations et activation non effectu?es : Docker/Vault indisponibles. Les deux bugs documentaires et la recette compl?te restent ? traiter. Voir le [bilan apr?s r?cup?ration](../BILAN_RECUPERATION_SECURITE_2026-09-16.md). Les ?tats ant?rieurs sont historiques.


## S?curit? V1 activ?e ? 16 septembre 2026

Quota/confirmations, nettoyage concurrent et suspension corrig?s et test?s sur bases isol?es. Sauvegarde/restauration SQL, MongoDB, Vault et n8n v?rifi?e ; migrations locales appliqu?es avec compte distinct ; comptes applicatifs restreints ; HTTPS local https://localhost:8443. 118 tests backend et 10 tests Vault passent. Voir le [bilan actuel](../BILAN_SECURITE_LIVRAISON_V1_2026-09-16.md) pour les preuves, les commandes et les limites de livraison publique. Les anciens ?tats ? bugs ouverts ?, ? migrations non appliqu?es ? ou ? Docker indisponible ? sont historiques.

## 17 septembre 2026, 21 h 34 — Reprise du diagnostic France Travail et JobsPipe

Demande : retrouver les travaux déjà effectués, expliquer le faible volume et mettre à jour l'historique. Travaux retrouvés : imports réels du 15 septembre, dédoublonnage du 16, audit du 17 et correction pagination/reprise/localisation/actualisation au commit e9bf037 (21 h 24). Il ne faut pas refaire ces collecteurs comme s'ils étaient absents.

Vérification réelle : France Travail annonce 4 802 résultats pour infirmier/MIS (recherches non additionnables), contre 254 actives en production. JobsPipe : 108 résultats parcourus sur 5 pages, 54 acceptées par le normaliseur existant, 25 rejets CDI et 29 intérim non confirmé, contre 1 active en production. Première page : 1 seule acceptée ; ancien import limité à 10. Douze rejets perdent une ligne « Intérim » lors du nettoyage et doivent être réexaminés.

À 21 h 32, last_started_at et collection_state sont NULL pour les deux sources : aucun cycle du nouveau collecteur enregistré. Coordonnées présentes : 40/254 France Travail, 0/1 JobsPipe. L'export local de reprise ne contient pas l'appel refresh-offers ; l'état cloud reste à vérifier. Diagnostic sans import/modification d'annonces, 109 résultats JobsPipe acquis dans le budget existant. Rattrapage et validation de production restent à faire.

Rapport et preuves : docs/quality/DIAGNOSTIC_VOLUME_API_2026-09-17.md, DIAGNOSTIC_VOLUME_API_2026-09-17.json et DIAGNOSTIC_JOBSPIPE_PAGES_2026-09-17.json. Aucun nouveau lot fictif FINESS ni PDF de missions généré dans ce diagnostic.


## 2026-09-17 — Collecte nationale publiée et vérifiée

Les corrections nationales sont en production (Main 2ebb08c ; Epitech Backend 73a9cd0). À 22:03 : 4 843 offres externes actives (4 773 France Travail, 70 JobsPipe), dont 4 692 localisées. Cycles complets : 4 823 identifiants uniques France Travail examinés sur 127 pages ; 353 JobsPipe examinés. Aucun doublon d'identifiant ni doublon exact entre sources détecté. Les 18 annonces hors métier infirmier ont été retirées du catalogue après accord explicite, avec conservation des lignes source. 151 offres restent sans coordonnées exploitables. 188 tests unitaires et 4 tests PostgreSQL réussis ; pagination publique vérifiée jusqu'à la dernière page.

Préférence de livraison explicitement autorisée par l'utilisateur : publier les corrections sur lebretyves/Infimactch_Prod, branche Main, et également EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1, branche Backend, comme précédemment et pour les prochaines livraisons. Cette préférence ne justifie pas d'écraser les modifications étrangères au travail.

Bilan détaillé : quality/COLLECTE_NATIONALE_PRODUCTION_2026-09-17.md (chemin relatif à la racine documentaire).


## 2026-09-17 — Capture et analyse automatiques du RIB

Demande : reconnaître les coordonnées dans la caméra, prendre automatiquement la photo et remplir les cases correspondantes. La caméra effectue désormais des lectures OCR locales successives ; deux lectures consécutives du même IBAN avec clé valide déclenchent une seule photo. Le texte de cette image remplit IBAN, BIC, titulaire et banque lorsqu'ils sont reconnus. Les codes banque, guichet, compte et clé RIB restent dérivés de l'IBAN français valide. Une nouvelle image ou un PDF importé déclenche également l'analyse sans clic supplémentaire. Le bouton manuel reste disponible en secours.

Les traitements sont annulés à la fermeture ou au changement de caméra/document. Après 60 secondes sans détection, la prise de photo manuelle reste proposée. Aucun champ manquant n'est inventé, aucune sauvegarde n'est automatique : vérification et confirmation restent nécessaires. L'analyse et les images de prévisualisation restent locales.

Validation : build frontend et TypeScript réussis ; test navigateur avec moteur Tesseract réel sur image, PDF texte et flux caméra synthétique. Vérification du remplissage des quatre champs, absence de capture pour une clé IBAN invalide, arrêt des pistes caméra, absence d'enregistrement implicite, relecture après échec et affichage mobile/bureau. Caméra physique non testée dans cet environnement. Livraison sur Main et Backend conformément à l'autorisation persistante de l'utilisateur.


## 2026-09-17 — Informations personnelles verrouillées après inscription

Demande utilisateur : prénom, nom, e-mail, ville, téléphone, date de naissance et adresse postale modifiables uniquement après demande administrateur. Les champs du profil sont désormais en lecture seule, code postal inclus ; le serveur refuse les changements et suppressions de ces valeurs, ainsi que le changement de display_name, par PUT /profile. La création atomique du profil à l'inscription conserve les valeurs initiales. Les qualifications, expériences et disponibilités restent modifiables.

Une demande structurée peut être créée depuis le profil : un champ, sa nouvelle valeur, une seule demande en attente. Aucun changement n'est appliqué à l'envoi. L'administration dispose d'une page Corrections personnelles pour consulter, valider ou refuser. La validation exige accounts:write, une authentification administrateur récente et la confirmation d'une vérification d'identité. Les décisions sont journalisées et visibles par le demandeur. Les requêtes concurrentes, doubles décisions et valeurs devenues obsolètes sont contrôlées en transaction. Le changement d'e-mail contrôle l'unicité, ferme les sessions et invalide les demandes de récupération existantes ; les associations Google existantes restent liées au même compte. La correction du nom/prénom réinitialise la vérification RPPS. L'anonymisation supprime les demandes contenant des données personnelles.

Migration additive PersonalCorrections1789382300000 appliquée, sans modification des profils existants. Validation : 191 tests unitaires, 5 tests PostgreSQL sur base jetable et recette navigateur utilisateur/administrateur réussis ; TypeScript, build utilisateur et build administrateur réussis. La recette vérifie le refus des modifications, l'enregistrement professionnel, l'absence de modification lors d'une demande et la confirmation administrateur.


## 2026-09-17 — Import de CV pour les expériences passées

Ajout d'un import PDF/JPEG/PNG dans Qualifications et expérience. Extraction PDF/OCR français-anglais et API interne de structuration des périodes, établissements et services, sans fournisseur payant ni transfert à une API tierce. Vérification explicite avant ajout au formulaire, sauvegarde du profil séparée, doublons exacts écartés. Les dates approximatives sont signalées ; périodes en cours et invalides restent à compléter manuellement. Aucun changement des informations personnelles verrouillées ou des diplômes. Le parseur à règles ne garantit pas une lecture exhaustive des CV complexes ; DOCX à exporter en PDF. Limites : 5 Mo, cinq pages, une minute. 198 tests serveur et recette navigateur PDF/image/OCR réussis, ainsi que la régression RIB. Comparatif des API et détails : quality/IMPORT_CV_EXPERIENCES_2026-09-17.md.


## 2026-09-17 — Installation sur l’accueil et retrait du catalogue

Le bouton Installer l’application est proposé dans le premier bloc de l’accueil public, avec accès au parcours d’installation existant. Le lien d’installation est retiré de la navigation connectée. Les liens Catalogue des pages sont retirés de l’accueil et de l’espace connecté ; /catalogue redirige vers /. Compilation frontend et trois contrôles PWA réussis, vérification navigateur mobile/bureau et navigation connectée effectuée.


## 2026-09-17 — Autocomplétion de la ville de mobilité

Demande : reconnaître la ville ou le code postal dès la saisie dans Ma zone de mobilité. Suggestions après 350 ms, trois lettres ou code postal complet, choix au clavier ou au clic. Le service IGN existant est interrogé avec type=municipality et fournit les coordonnées du centre de commune. Aucun nouvel abonnement ni dépendance.

La commune et son code postal sont stockés dans details.mobilityCity, séparément de la ville personnelle verrouillée. Latitude/longitude sont enregistrées pour le calcul réel du rayon et reprises dans la recherche des missions. Modifier la saisie efface l’ancienne position ; une ville non sélectionnée ne peut pas être enregistrée. GPS et saisie manuelle des coordonnées restent disponibles et effacent l’ancien libellé. Réponses obsolètes annulées, erreurs et absence de résultat expliquées.

Validation : compilation frontend/backend ; 199 tests unitaires backend ; six tests SQL sur base PostGIS isolée, dont conservation de Paris comme ville personnelle avec centre de mobilité Nantes ; tests navigateur de saisie, sélection clavier, coordonnées sauvegardées, annulation des réponses lentes et affichage 375/1440 px ; régression recherche des missions. Appels réels IGN vérifiés pour 44000 et Nan. Publication autorisée sur Main et Backend selon accord antérieur.


## 2026-09-17 — Candidatures possibles malgré les divergences de correspondance

Demande utilisateur (avec autre agent) : remplacer le refus de candidature pour compétences, expérience et disponibilités divergentes par une alerte adaptée et permettre l’envoi. Agent dédié au backend ; intégration et interface par l’agent principal.

GET /missions/:id/application-check fournit les avertissements actualisés et leurs détails. L’écran affiche les compétences non renseignées, les mois renseignés/demandés dans le service, la période de disponibilité, ainsi que les éventuels écarts d’horaires ou de mobilité. Le bouton devient « Envoyer quand même ma candidature ». POST enregistre la candidature, conserve les avertissements dans l’audit et la réponse idempotente, puis affiche une confirmation explicite. Une indisponibilité du précontrôle ne bloque pas le POST, qui revérifie les critères côté serveur.

Le changement porte uniquement sur l’envoi : les contrôles qualification/RPPS, compte actif, conflit d’affectation, état et début de mission, version du consentement restent effectifs, ainsi que l’éligibilité stricte lors de l’affectation. Aucun changement des scores ou recommandations et aucune migration.

Validation : builds frontend/backend ; 203 tests unitaires backend ; deux tests SQL sur PostgreSQL/PostGIS isolé (avertissements, audit, envoi, absence de doublon, rejeu idempotent, blocages conservés et affectation stricte) ; test Playwright avec API fictives interceptées sur 375/1440 px, libellés détaillés, consentement, envoi malgré trois écarts, confirmation, indisponibilité du précontrôle et version obsolète. Publication sur Main et Backend conformément à l’autorisation permanente.

## 2026-09-17 — Recherche, accueil et calendrier compact

Recherche regroupée : poste, lieu, rayon ; critères métier, disponibilités et autres critères repliables. Tri global par publication, correspondance, distance ou début, filtres de publication et compatibilité des disponibilités avant pagination. Parcours complet par lots de 500 dans une transaction cohérente ; les dates externes inconnues ne sont pas inventées et la date d'import ne remplace pas celle de publication. Aucun pourcentage de correspondance fabriqué pour les offres externes.

Accueil : offres prioritaires, suivi puis paramètres secondaires ; disponibilités en dates françaises, fuseau Paris, sans heures et dédupliquées avant limitation. Les horaires des missions confirmées restent présents.

Calendrier : mois compact sur sept colonnes et nombre réel de semaines. Trois traits matin/après-midi/nuit ; vert disponible, rouge indisponible, bleu mission confirmée. Inspiration : photos Appel Médical fournies localement, non publiées. Éditeur au choix du jour avec navigation clavier ; mobilité et gestion des nuits conservées.

Validation : builds frontend/backend ; 208 tests unitaires backend ; 6 tests SQL PostGIS isolés incluant 5 006 offres pour vérifier le tri au-delà du premier lot ; tests navigateur 375/768/1440 px, recherche, accueil, disponibilité, changement d'heure et mobilité. Évaluations visuelles indépendantes. Aucune migration ni création de données de production.

Audit des anciennes missions : 49 missions fictives retrouvées dans deux sauvegardes, FINESS fictif 000000001. Leur nettoyage est documenté le 16 septembre. Aucune preuve d'un lot utilisant de vrais FINESS. PDF d'inventaire produit dans docs/quality ; cet inventaire historique ne constitue pas une lecture actuelle de la production.

Publication sur Main (Infimactch_Prod) et Backend (Epitech), conformément à l'autorisation utilisateur persistante.

## 2026-09-18 — CV et expériences en fiches

Demande utilisateur : champs qualifications renseignés en gris clair après inscription ; expériences en lecture avec Modifier/Supprimer ; corriger un import CV ne reconnaissant aucune période. L'interface conserve l'édition des qualifications. Une expérience se modifie dans un brouillon avec Enregistrer/Annuler ; le bouton global persiste le profil et reste bloqué pendant un brouillon ouvert.

Le parseur reconnaît les dates coupées sur plusieurs lignes, MM-YYYY, espaces OCR, tirets typographiques et titres professionnels étendus. Lecture PDF reconstruite selon les positions x/y ; séparation des colonnes lorsque des titres de sections distincts le permettent, conservation de dates et postes alignés. Si zéro résultat, aperçu du texte lu replié, non stocké, effacé au prochain import/annulation. Les expériences en cours restent signalées séparément sans inventer de fin ; les mises en page complexes nécessitent une vérification. Le CV réel de l'utilisateur n'a pas été reçu ni certifié : le fichier initial n'est pas conservé.

Recherche de solutions : Affinda propose un essai limité, Eden AI facture les analyses réelles ; Docling est libre mais nécessite hébergement et structuration métier. La solution existante PDF.js/Tesseract et parseur InfiMatch reste sans transmission à un service tiers et sans nouveau coût d'API.

Validation : builds frontend/backend ; 211 tests backend dont 10 CV ; 2 tests géométriques ; navigateur avec vrai PDF multicolonnes, périodes multilignes, image OCR, vrai parseur, propositions éditables, ajout explicite, sauvegarde, doublons, diagnostic sans stockage. Profil évalué indépendamment PASS 375/768/1440 : gris lisible, Annuler, suppression, persistance. Aucun changement en production des données utilisateur pendant ces tests. Publication Main et Backend autorisée dans la session.

Question notification : l'action PERSONAL_CORRECTION_REQUESTED est auditée et visible dans l'administration, mais n'est pas reliée au routeur de notifications actuellement. Aucun envoi de notification affirmé ni déclenché lors du contrôle.

## 2026-09-18 — Dossier de contrôle de 1 000 demandes de démonstration

Voir docs/quality/MISSIONS_DEMONSTRATION_2026-09-18.md : 646FINESSréels,101départements,400demandesdu18au27septembre,PDF/Excel/JSONlivréslocalementetrevusparunsecondagent. Aucunimportenproduction. Les correctionsCV/profil sont publiées Main ead96b1 et Backend d5e2aff ; déploiements frontend/backend READY et recetteCV/profil rejouée sur interfacepublique avecAPIfictives, sansécrituredeproduction.

## 2026-09-18 — RIB : analyse automatique complète et audit import matching

La capture automatique après IBAN stable lance désormais une lecture complète du fichier si le texte caméra est partiel. OCR français/anglais avec seconde segmentation automatique si champs requis manquants ; libellés titulaire/BIC/banque multilignes reconnus. Import de fichier immédiatement analysé, bouton fichier natif redondant masqué, relance disponible après échec. Aucune correction de chiffres inventée ; confirmation explicite avant enregistrement conservée.

Validation : build frontend, suite réelle PDF.js/Tesseract/caméra et test dédié aperçu IBAN seul puis vraie analyse de la photo, sans clic Analyser ni écriture bancaire.

Audit indépendant du lot de démonstration : 1000 demandes / 3092 vacations ; 666 demandes / 2067 vacations avec GPS et champs métier valides sous réserve des UUID établissements et droits ; 334 demandes / 1025 vacations sans GPS. 2067 cas positifs, 16251 négatifs et 4 créations DRAFT en PostGIS jetable. Aucun import production. Défaut fuseau DOM identifié (115 vacations) : Europe/Paris persisté par défaut ; non corrigé dans cette livraison RIB. Rapport local livrables/missions-500/AUDIT_IMPORT_MATCHING.md.

## 2026-09-18 — Lecture automatique des notifications

Demande utilisateur : aucune validation manuelle après consultation. Bouton Marquer comme lue retiré ; les liens Consulter et les nouveaux liens envoyés via Discord portent l’identifiant de notification. Sur page authentifiée visible, lecture enregistrée automatiquement via POST protégé existant, lié au destinataire et idempotent. Paramètres et ancre préservés, marqueur retiré après succès. Échecs réseau non bloquants avec reprises limitées, aucun faux statut lu. La simple ouverture du message dans Discord n’est pas observable via les événements publics du bot (documentation officielle Discord Gateway Events). Les anciens messages Discord ne sont pas réécrits.

Validation : builds frontend/backend ; navigateur avec API simulée, consultation/direct link, absence de bouton, paramètres/ancre, identifiant invalide et échec réseau. Aucun message Discord ni donnée réelle envoyés pendant les tests.
