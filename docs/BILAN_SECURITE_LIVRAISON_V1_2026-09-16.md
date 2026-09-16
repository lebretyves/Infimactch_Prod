# S?curit? et livraison ? V1 kickoff ? 16 septembre 2026

## R?sultat
Les cinq priorit?s ont ?t? trait?es c?t? code et environnement local. Les deux migrations de s?curit? sont appliqu?es ? la base locale apr?s sauvegarde compl?te, recette sur base neuve et migration d'une copie restaur?e. Le site HTTPS local est https://localhost:8443 ; le frontend de d?veloppement reste http://127.0.0.1:5173.

Le d?ploiement public n?cessite encore le domaine et l'h?bergement : aucun n'a ?t? fourni. La configuration Caddy de production est pr?te, mais un certificat public et les flux r?seau d'un serveur distant ne sont pas d?clar?s valid?s.

## Alignement kickoff
- R10/R11 : sessions s?curis?es et HTTPS local v?rifi?s ; les documents restent chiffr?s AES-GCM. Le HTTPS navigateur ne chiffre pas les connexions PostgreSQL/MongoDB/n8n, confin?es ici ? la machine locale ; si ces services sont r?partis sur plusieurs h?tes, leur TLS devra ?tre configur? avant exposition.
- R14/R15 : comptes suspendus exclus des candidats, s?lections et nouvelles affectations. Les missions confirm?es restent inchang?es ; aucune affectation automatique ajout?e.
- R19 : les trois workflows n8n sont import?s et publi?s dans la recette isol?e. Le kickoff demande au moins deux automatisations, pas n8n Cloud.
- R29/R30 : PostgreSQL et MongoDB conserv?s, comptes applicatifs restreints et compte PostgreSQL de migration distinct.
- R31/R32/R36 : tests r?els, couverture, sauvegarde/restauration, CI et documentation de reprise.
- Le PDF demeure une confirmation fictive. Aucun contrat sign?, paiement, RIB r?el, MFA ou nouveau r?le produit ajout?. Ces corrections ne valent pas validation de toutes les exigences documentaires, RGAA/RGESN, SEO et soutenance de la matrice kickoff.

## Corrections
1. Le quota de 25 Mio ne compte que les documents utilisateur EVIDENCE et les RIB BANK non remplac?s. Les confirmations syst?me ne sont plus bloqu?es par ce quota. Les anciennes versions restent conserv?es ; ce m?canisme ne constitue pas une politique de purge ni un quota global de disque.
2. ?criture et r?conciliation prennent le m?me verrou transactionnel PostgreSQL par document. Le nettoyage ignore un fichier verrouill?, puis rev?rifie SQL et son ?ge sous verrou. Une transaction non commit?e ne peut plus perdre son fichier par ce nettoyage.
3. Matching et notifications filtrent account.active. S?lection/affectation prennent un verrou de lecture sur le compte actif dans la transaction m?tier, coordonn? avec la d?sactivation. Les affectations existantes sont pr?serv?es.
4. Les migrations DocumentSecurity1789380700000 et AccountSecurity1789380800000 ont ?t? ex?cut?es localement. Les anciennes sessions n?cessitent une reconnexion.
5. Caddy dessert le frontend et /api en HTTPS ; backend HTTPS en mode production sur loopback:3101 avec TRUST_PROXY=loopback et APP_ORIGIN exact. PostgreSQL infimatch_app n'a pas le droit de cr?er des tables ni d'administrer le moteur ; MongoDB infimatch_app est readWrite sur sa base seulement. infimatch_migrator est distinct. URLs applicatives synchronis?es dans Vault et le .env historique, sans changement des comptes utilisateurs du site.

## Validation
- 118 tests backend : 101 unitaires + 17 int?grations, sur PostgreSQL/MongoDB/n8n jetables. Couverture : 77,51 % lignes ; 84,53 % branches (hors scripts de r?gression compl?mentaires).
- R?gressions SQL r?elles : PDF lisible malgr? quota satur?, nettoyage pendant ?criture non commit?e, vrai orphelin supprim?, suspension/r?activation/r?vocation CLI multisession, absence dans les candidats et notifications, refus s?lection/affectation, conservation affectation existante. Remplacement RIB ? quota plein ?galement test?.
- HTTPS : certificat accept?, Secure/HttpOnly/SameSite=Lax, no-store, HSTS, protocole transmis normalis?, mauvaise Origin refus?e 403, profil anonyme refus? 401, frontend et sant? 200.
- 10 tests Vault r?ussis apr?s changement des acc?s. Le runtime applicatif restreint se connecte ? la base.
- Restauration dans conteneurs neufs : PostgreSQL et comptes/missions/documents compar?s, MongoDB restaur?, n8n SQLite restaur? et trois workflows export?s, snapshot Raft Vault restaur? puis d?verrouill? avec les cl?s d'origine et acc?s AppRole v?rifi?.
- La base utilisateur sauvegard?e comptait 2 comptes, 0 mission et 0 document : aucun document r?el ? d?chiffrer dans cette restauration. La lecture positive des PDF chiffr?s est test?e s?par?ment avec les fixtures isol?es.
- Une tentative interm?diaire a r?v?l? un probl?me de cycle de vie du serveur HTTP Supertest ; le serveur de recette ?coute d?sormais sur un port ?ph?m?re stable. Les premiers essais de restauration ont aussi n?cessit? une base template0 r?ellement vide. Les preuves finales remplacent ces essais, sans en tirer de conclusion sur les donn?es utilisateur.

## Commandes et exploitation
```powershell
npm run start:vault
npm run start:https
npm run worker:vault
npm run test:isolated
npm run db:migrate:vault
```
Le frontend doit ?tre compil? (`npm run build` dans son dossier) avant Caddy. `start:https` utilise le certificat localhost de l'autorit? Vault locale ; son expiration et son renouvellement doivent ?tre suivis. Pour un nouveau poste, installer l'autorit? locale avec `npm run vault:trust`. Ne pas d?sactiver la v?rification TLS.

Pour une sauvegarde, arr?ter API (3100 et 3101) et worker, puis `npm run backup:full -- --quiesced`. Le script suspend n8n pendant la capture. Les sauvegardes contiennent des secrets et sont prot?g?es par ACL Windows ; elles restent ignor?es par Git. Exemple de v?rification : `npm run restore:verify -- E:/Interimatch/InfiMatch/backups/full-v1-<date>`. La restauration de test n'?crase jamais les volumes utilis?s par le site.

Apr?s restauration compl?te sur une nouvelle machine, restaurer les composants du m?me jeu, appliquer les migrations avec le compte d?di?, v?rifier Vault puis les parcours ; ne pas m?langer les cl?s d'une sauvegarde avec les documents d'une autre. Pour une base de production neuve, l'administrateur doit pr?installer les extensions PostgreSQL requises avant les migrations non-superutilisateur.

Le script database-roles.mjs est un outil op?rateur pour l'environnement local existant (noms de conteneurs et compte d'administration connus), pas un installateur universel. Les identifiants de migration se trouvent dans le chemin Vault infimatch/v1/migration accessible ? l'op?rateur ; le r?le backend ne peut pas le lire.

## Reste pour une livraison publique compl?te
- Fournir le domaine et le serveur ; configurer APP_DOMAIN, DNS, pare-feu, chemins et service de d?marrage. `start-https.mjs --production` utilise Caddyfile.production et l'?mission automatique du certificat public.
- Ajouter l'origine HTTPS choisie dans Google Cloud si la connexion Google y est utilis?e. L'origine de d?veloppement existante est conserv?e ; la connexion Google sur le nouveau port HTTPS n'est pas d?clar?e valid?e.
- Tester les flux interservices sur la topologie finale (TLS si distants), la restauration sur le mat?riel cible, le renouvellement des certificats et une sauvegarde hors machine. Une copie sur le m?me disque n'est pas une protection contre sa perte.
- D?finir les dur?es de conservation/purge avec le p?rim?tre V1 et mettre en place l'ex?cution correspondante ; les anciens RIB restent conserv?s et les fichiers syst?me demandent une surveillance d'espace disque.
- Terminer les autres ?carts de la matrice kickoff (fonctionnels, accessibilit?, SEO, livrables humains) ; aucun n'est r?put? r?solu par ce lot s?curit?.

## Sources techniques et preuves
Preuves : docs/proofs/v1-hardening/ et docs/proofs/coverage/. CI : .github/workflows/v1.yml ; r?sultat distant ? v?rifier sur le commit publi?.
Documentation primaire utilis?e : https://caddyserver.com/docs/caddyfile/directives/reverse_proxy ; https://caddyserver.com/docs/caddyfile/directives/tls ; https://caddyserver.com/docs/automatic-https ; https://docs.n8n.io/hosting/cli-commands/.

## Cl?ture de la v?rification locale
CI GitHub r?ussie sur le commit 5bb0477b5082857e4cd3cb9925a1858e07a60324 : https://github.com/Ziwazou/infiMatch/actions/runs/35065893024 (backend et frontend). Contr?le Edge : page HTTPS r?ellement ouverte ; capture https-home.png.

Derni?re sauvegarde compl?te apr?s migration : E:/Interimatch/InfiMatch/backups/full-v1-2026-09-16T06-57-23-866Z. 26 fichiers, dont r?les SQL, donn?es, secrets de reprise et configuration ; restauration isol?e r?ussie. Sauvegarde priv?e, non publi?e dans GitHub. V?rification des acc?s PostgreSQL/MongoDB et de la concordance Vault/.env enregistr?e dans database-roles.json.
