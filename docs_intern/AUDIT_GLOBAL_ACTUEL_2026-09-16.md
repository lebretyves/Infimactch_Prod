# Audit global du projet actuel ? 16 septembre 2026

Verdict : modifications et validations restantes avant livraison. Base V1 fonctionnelle en local ; ouverture publique non prete. Confiance elevee sur les constats code/commandes ci-dessous, limitee sur les parcours non rejoues et services distants.

## Perimetre et preuves

Sources : InfiMatch (backend) et infiMatch-front-end. Comparaison avec publication-backend, branche distante Infimactch_Prod/Main 38cf7e9 et Ziwazou/infiMatch/fusion-front_Back b5f2c63. Kick-off original extrait et architecture V1 recoupes. Aucun achat, purge, envoi externe ou modification produit effectue pour cet audit.

Derniere campagne isolee : 164 tests backend passes, 0 echec, couverture 81,99 % lignes / 80,34 % branches, regressions PostgreSQL et workflows n8n passes (docs/proofs/v1-hardening/result.json et coverage.txt dans InfiMatch). Douze tests frontend et compilation passes lors de la derniere integration locale ; aucun changement frontend depuis. Bundle principal ~628 ko. Audit npm --omit=dev execute pendant cet audit : zero vulnerabilite connue signalee pour les dependances de production des deux projets, pas une certification de securite ni un audit des images Docker.

Trois etats distincts : sources locales testees, processus locaux deja demarres, commits distants. La derniere correction des destinataires account.active n est pas encore activee dans les processus ni poussee. Les derniers correctifs OpenAPI ne sont pas encore dans les commits distants. Les deux executions GitHub du commit 38cf7e9 sont en echec ; ne pas les presenter comme vertes sur la base des tests locaux.

## Ce qui fonctionne ou est implemente avec preuve

- Authentification classique, sessions, controle d inactivite 15 minutes, droits organisationnels et comptes desactives : couverture par tests et parcours API isoles.
- Missions, candidatures, affectations humaines, conflits, confirmations PDF et telechargements proteges : parcours isoles reussis.
- PostgreSQL/PostGIS, MongoDB et Vault locaux healthy ; n8n running. API et HTTPS locaux controles lors de l integration.
- Trois workflows n8n actifs verifies par list:workflow --active=true : matching, relance horaire, confirmation. Pas de noeud Teams dans les exports. active=false dans les exports ne decrit pas l activation runtime.
- File outbox, verrous, tentatives/reprises et recus metier. Au controle local, aucun evenement en attente ou epuise dans les resultats observes ; base sans notification lors du controle precedent, donc pas de preuve d usage reel.
- Imports France Travail et JobsPipe, normalisation, exclusion CDI et dedoublonnage ; deux taches Windows presentes. Aucun appel fournisseur declenche par cet audit. 220 offres actives locales, aucune active non observee depuis plus de 30 jours au moment du controle.
- Parseur stocke/versionne avec preuves, affichage classe et correspondance partielle. Page /apercu-annonces ouverte dans Edge : trois exemples classes visibles, aucune erreur JavaScript relevee. Cette page de demonstration ne constitue pas une recette exhaustive de toutes les annonces.
- Migration PrivacyRequests appliquee localement. API de demande de cloture et commandes operateur presentes.
- Sauvegarde privee recente complete ; exercice de restauration representatif historique reussi (2 comptes, 1 mission, 1 affectation, 1 PDF). A refaire avec les derniers changements de registre d effacement.
- Aucun secret configure detecte dans les fichiers suivis par le controle local execute.

## Defauts et manques prioritaires

| Priorite | Constat | Localisation | Action / preuve attendue |
|---|---|---|---|
| P1 | Correctif notifications present dans les sources mais non active et non pousse | backend/src/automation/automation.module.ts, backend/test/integration/journey.spec.ts | Synchroniser les copies, redemarrer puis pousser et attendre une CI verte |
| P1 | CI distante en echec sur ancienne version | Infimactch_Prod/Main 38cf7e9 | Publier les corrections deja testees ; verifier les jobs du nouveau commit |
| P1 | Aucune livraison Teams, aucun destinataire Microsoft associe ni etat de livraison externe | workflows/*.json, automation.module.ts | Canal de test autorise, OAuth Microsoft, destinataires, minimisation des messages, suivi erreurs/reprises et doublons |
| P1 | Preferences limitees aux soignants et utilisees pour MATCH ; aucune politique par canal/entreprise | organizations.module.ts getPreferences/preferences, automation.module.ts | Clarifier notifications de service vs optionnelles ; definir Teams sans supposer que enabled=false coupe toute notification |
| P1 | Pas de tache quotidienne de maintenance installee | scripts/security/install-maintenance-schedule.ps1 ; taches Windows | Valider les purges en base isolee, puis programmer explicitement. Aucun nettoyage reel lance pendant l audit |
| P1 | Conservation metier fixee a 365 jours pour le POC ; pas de justification d exploitation reelle | backend/src/security/retention.ts | Politique documentee par type de donnee ; tests du graphe historique avec documents/affectations et sauvegardes avant activation |
| P1 | Procedure de cloture encore incomplete pour l exploitation | security/closure.ts, privacy.module.ts, cli.ts | Interface ou canal utilisateur documente ; approbation auditee ; verifier reprise si SQL termine mais Mongo/fichiers indisponibles et ne pas bloquer toutes les demandes sur la premiere erreur |
| P1 | Cloture ne constitue pas un effacement integral des historiques/PDF/organisations partagees | security/retention.ts anonymizeAccount | Expliciter les elements conserves et raisons, acces et delais ; tester restauration avec effacement reel a rejouer |
| P1 | Sauvegardes recentes sur le meme PC, autonomie apres panne non acquise | backups/, scripts/security/backup.mjs | Copie independante, rotation controlee, restauration recente avec le registre d effacement |
| P1 | Demarrage et fonctionnement permanents non assures PC/serveur redemarre | worker.ts, infra/compose.yaml, lanceurs Windows | Services supervises, politiques de redemarrage, procedures Vault/unseal et verification apres reboot |
| P1 | Google reel non valide sur l origine finale | auth/google.ts, console Google | Connexion de bout en bout apres fixation du domaine ; ne pas deduire sa reussite des tests de jetons |
| P1 | Installation distante non realisee | Vercel / services externes | Ne pas confondre build et runtime ; base, stockage, secrets, domaine, routage et supervision a configurer |
| P2 | Fraicheur exposee dans API mais non affichee par le frontend ; retrait par age non planifie | public-data/freshness.ts, offer-quality.ts, frontend | Etat utilisateur clair et planification ; conserver la protection contre les imports partiels |
| P2 | Contrats OpenAPI complets en presence ne prouvent pas toutes les valeurs reelles | openapi-contracts.ts, journey.spec.ts | Validation de schemas sur reponses representatives ; tests d erreurs et nullabilite |
| P2 | Message de demarrage masque le diagnostic precise | backend/src/main.ts | Journal de diagnostic classe sans secrets pour configuration, DB ou module natif ; utile au 500 Vercel |
| P2 | SEO incoherent : domaine infimatch.fr impose, /missions authentifie dans sitemap, /inscription dans sitemap mais interdit robots | frontend/public/sitemap.xml, robots.txt, src/router.tsx | Aligner domaine et pages effectivement publiques/indexables |
| P2 | Mot de passe oublie visible mais non implemente | frontend/src/pages/MotDePasseOublie.tsx | Decider perimetre : parcours reel ou information explicite ; pas une exigence explicite du kick-off |
| P2 | Pas de recette navigateur exhaustive recente par role/metier/appareil | frontend et parcours V1 | IDE/IADE/IBODE, agence/etablissement, clavier, mobile, PDF, annulation et autorisations avec preuves |
| P2 | Plusieurs dossiers et bilans contradictoires | docs/, publication-*, InfiMatch | Definir dossier de travail canonique, documenter version active, synchroniser matrices et preuves sans ecraser historique |

## Points a ne pas surinterpreter

RPPS FOUND verifie un identifiant exact retrouve, pas l identite du porteur, l activite professionnelle actuelle ni tous les diplomes. FINESS/SIRET identifie une structure, pas l autorisation de la personne a la representer. Verification email, recuperation/mise a jour autonome des identifiants et Pro Sante Connect restent a arbitrer ; ne pas les declarer exigibles du seul kick-off.

Le parseur necessite encore un corpus independant plus large avec faux positifs et omissions. Dedoublonnage strict ne garantit pas l identification de toutes les reformulations. Les extraits incertains ne doivent pas devenir automatiquement des exigences d admissibilite.

Redis n est pas necessaire pour la V1 actuelle. Le kick-off impose SQL + NoSQL, deja remplis par PostgreSQL et MongoDB. Vercel et Teams sont des choix de deploiement/canal, pas des exigences nommees par le sujet.

## Hebergement

Configuration Docker locale concordante, mais n inclut pas de services applicatifs API/frontend/worker et depend de host.docker.internal, chemins de donnees et certificats locaux. Pour une VM Oracle ARM, l image PostGIS actuelle inspectee ne propose que linux/amd64 : une adaptation testee est necessaire. Aucun serveur Oracle cree et aucune disponibilite gratuite acquise. Vercel actuel pointe backend/NestJS ; aucune base raccordee observee. Ne pas lancer de migration publique sur la base du seul code dans Git.

## Livrables kick-off

A verifier avec l equipe : preuve du cadrage J+2, etude de marche et proposition de valeur, roadmap et temps estimes/reels, exports n8n, script de nettoyage, README depuis clone vierge, rapport de couverture, deux pratiques d ecoconception, recette accessibilite/SEO, support de pitch et demonstration de chaque membre. La presence d un fichier ne prouve pas sa validation ou sa remise.

## Ordre de travail propose

1. Finaliser le lot backend en cours, aligner sources/runtime/Git et obtenir une CI verte.
2. Valider conservation, reprises, fermeture et restauration avant planification destructive.
3. Recette complete des trois parcours et trois workflows locaux, puis Teams sur canal autorise.
4. Installer la pile autonome sur hebergement disponible, puis Google/Teams avec les vraies origines.
5. Finaliser SEO, accessibilite, README et dossier kick-off avec preuves.

Audit realise sur code, tests et controles cibles ; ce n est ni un pentest, ni une certification de conformite, ni une validation de tous les parcours distants.
