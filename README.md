# InfiMatch — Backend V1

Backend NestJS / TypeScript : PostgreSQL + PostGIS, MongoDB, documents privés chiffrés et trois workflows n8n. Cette branche contient le code backend, ses tests et les fichiers techniques nécessaires au démarrage local.

## Prérequis

Node.js 24, npm, Git et Docker Desktop démarré. Les commandes suivantes sont à exécuter à la racine du dépôt, sur la branche Backend.

## Installation locale

```powershell
npm ci
npm run setup
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run seed -w backend
npm run build
npm run start -w backend
```

Sur un poste Windows nécessitant le magasin de certificats système pour npm, définir `NODE_OPTIONS=--use-system-ca` avant l'installation.

`npm run setup` génère la configuration locale depuis `.env.example`. Les secrets restent dans `.env`, exclu de Git. Le seed crée des comptes fictifs ; leurs identifiants sont enregistrés dans `data/demo-credentials-*.json`, également exclus de Git. Il ne fabrique pas de validation RPPS positive.

- API : http://127.0.0.1:3100/api/v1/health
- Swagger : http://127.0.0.1:3100/api/docs
- n8n local : http://127.0.0.1:55678

Démarrer le traitement des événements dans un autre terminal :

```powershell
npm run worker
```

Pour le développement : `npm run dev`.

## Services, applications et acc?s

Les bases tournent dans Docker. **pgAdmin et MongoDB Compass sont des applications de consultation compl?mentaires** ; les fermer n'arr?te pas les bases.

| Service | R?le dans InfiMatch | Acc?s depuis le poste local | Application |
|---|---|---|---|
| PostgreSQL + PostGIS | Profils, missions, candidatures, affectations et calculs g?ographiques | `127.0.0.1:55432`, base `infimatch` | pgAdmin |
| MongoDB | R?sultats et explications du matching interne, avec versions et expiration | `127.0.0.1:57017`, base `infimatch`, collection `matchingruns` | MongoDB Compass |
| Vault | Secrets d'acc?s aux services, cl?s de chiffrement et acc?s fournisseurs | https://127.0.0.1:58200/ui/ | Navigateur |
| n8n | Notifications, relances et confirmation PDF apr?s affectation | http://127.0.0.1:55678 | Navigateur |

Ces adresses pointent vers **l'ordinateur sur lequel les services sont d?marr?s**. Les ports PostgreSQL et MongoDB ne sont pas des pages web. pgAdmin et Compass s'installent s?par?ment ; aucun compte cloud n'est n?cessaire pour consulter ces bases locales.

### PostgreSQL avec pgAdmin

Cr?er une connexion serveur avec :

- H?te : `127.0.0.1`.
- Port : `55432`.
- Base de maintenance : `infimatch`.
- Utilisateur : `infimatch` pour la configuration Compose fournie.
- Mot de passe : valeur locale de `POSTGRES_PASSWORD`, ou celle de `DATABASE_URL` si les identifiants ont ?t? adapt?s.

Si Vault est configur?, `POSTGRES_PASSWORD` se trouve dans `kv/infimatch/v1/infra` et `DATABASE_URL` dans `kv/infimatch/v1/backend`. Une ancienne connexion PostgreSQL sur le port 5432 peut correspondre ? une autre application.

### MongoDB avec Compass

Cr?er une connexion nomm?e **InfiMatch local** et utiliser la valeur de `MONGODB_URI` fournie localement ou conserv?e dans Vault, sous `kv/infimatch/v1/backend`. Cette URI contient les identifiants : ne pas la copier dans Git, les tickets ou les captures partag?es.

Pour la configuration Compose fournie : h?te `127.0.0.1`, port `57017`, utilisateur `infimatch`, base d'authentification `admin`. Apr?s connexion, ouvrir **infimatch ? matchingruns**. Les bases techniques `admin`, `config` et `local` ne sont pas la base m?tier ? consulter.

Le backend calcule le matching puis enregistre son r?sultat dans MongoDB. MongoDB n'importe pas directement les annonces France Travail. Si l'historique ne peut pas ?tre enregistr?, le calcul peut ?tre retourn? avec `historyStatus: UNAVAILABLE` ; les explications archiv?es ne sont alors pas disponibles. La conservation est configurable, avec 30 jours par d?faut dans le code.

Les comptes de bases fournis pour le d?veloppement ont des droits ?tendus. Leur remplacement par des comptes applicatifs aux droits minimaux reste ? r?aliser avant livraison.

### Vault : d?marrage et connexion

Suivre [le guide Vault](docs/VAULT_V1.md) pour la premi?re installation. Sur une installation d?j? initialis?e :

```powershell
docker compose -f infra/vault/compose.yaml up -d
npm run vault:unseal
npm run vault:status
npm run vault:check
npm run start:vault
```

Dans un autre terminal : `npm run worker:vault`. Arr?ter l'ancienne instance de l'API avant d'en lancer une autre sur le m?me port.

Le backend utilise **AppRole**. Pour un acc?s humain, choisir **Userpass uniquement si un administrateur a cr?? un compte sur cette instance**. Le bootstrap ne cr?e pas de compte personnel et les comptes du poste d'un d?veloppeur ne sont pas fournis dans Git. Le mot de passe PostgreSQL n'est pas un mot de passe Vault.

`npm run vault:sync` copie explicitement les valeurs autoris?es du `.env` vers Vault. V?rifier les ?carts avant cette commande. Elle ne change pas les mots de passe des serveurs, ne recharge pas les processus d?marr?s et ne constitue pas une synchronisation permanente.

### V?rifier l'?tat local

```powershell
docker compose --env-file .env -f infra/compose.yaml --profile automation ps
npm run vault:status
npm run vault:check
```

Le statut Docker indique l'?tat des conteneurs ; v?rifier aussi la connexion dans pgAdmin/Compass et les parcours API concern?s. Les donn?es des volumes Docker et les secrets Vault n?cessitent leurs propres sauvegardes : un push Git sauvegarde le code et les documents techniques.

## Workflows n8n

Les trois fichiers dans `workflows/` assurent la notification de matching, la relance et la confirmation PDF après affectation humaine.

```powershell
docker cp workflows/. infimatch-n8n-1:/tmp/infimatch-workflows
docker exec infimatch-n8n-1 n8n import:workflow --separate --input=/tmp/infimatch-workflows
docker exec infimatch-n8n-1 n8n publish:workflow --id=InfiMatchMatches
docker exec infimatch-n8n-1 n8n publish:workflow --id=InfiMatchReminders
docker exec infimatch-n8n-1 n8n publish:workflow --id=InfiMatchConfirm
docker restart infimatch-n8n-1
```

Les workflows utilisent le secret de service fourni par Compose. L'éditeur doit rester privé. Les notifications sont internes à l'application. Le raccordement d'une instance n8n Cloud nécessite un backend accessible en HTTPS et une configuration dédiée.

## Fournisseurs et imports

Configurer localement `FT_CLIENT_ID`, `FT_CLIENT_SECRET` et `RPPS_API_KEY` selon les accès fournisseurs disponibles. Ne pas publier leurs valeurs.

```powershell
node backend/dist/cli.js import-offers --dry-run --limit 50
node backend/dist/cli.js import-offers --limit 50
node backend/dist/cli.js --help
```

Les jeux de données privés et snapshots locaux ne sont pas inclus. Les outils d'import et de normalisation se trouvent dans `backend/src/public-data`, `backend/src/reference-data` et la CLI.

## Contrat frontend

L'API est préfixée par `/api/v1`. Consulter Swagger pour les routes et schémas.

- Obtenir le jeton via `GET /auth/csrf` et conserver le cookie.
- Pour les écritures utilisateur : cookie, `Origin` égal à `APP_ORIGIN` et `X-CSRF-Token`.
- Après connexion ou inscription, utiliser le nouveau jeton CSRF retourné.
- Les commandes métier documentées requièrent `Idempotency-Key` : une clé par action, la même pour son rejeu réseau.
- Les profils, missions, candidatures et affectations sont contrôlés côté serveur. L'affectation finale reste humaine.
- Les annonces externes ont une comparaison partielle, sans score global ni disponibilité présumée ; candidature par redirection.

## Vérifications

```powershell
npm run typecheck
npm run build
npm test
npm run test:integration
npm run verify
npm run check:secrets
```

Les tests d'intégration nécessitent les bases locales, l'API et n8n avec ses workflows publiés. Utiliser un environnement dédié aux données fictives. `npm run verify` produit les rapports dans `docs/proofs/` ; la couverture HTML se trouve dans `docs/proofs/coverage/`.

Vérification de cette copie le 15 septembre 2026 : typage, compilation et **55 tests unitaires réussis** sur le code source identique. Les tests d'intégration et appels fournisseurs n'ont pas été relancés pour cette publication.

## Limites actuelles

Le déploiement fourni est local. Restent notamment HTTPS/proxy et sécurité de livraison, comptes de bases restreints, idempotence documentaire complète, purge/conservation, cycle complet de retrait des offres, restauration commune et recette frontend. Le calcul d'expérience actuel ne constitue pas un contrôle réglementaire complet en équivalent temps plein.

Les justificatifs et données bancaires sont fictifs. Aucun document patient ou clinique n'est prévu dans ce POC.

## Sauvegarde et structure

- `backend/src/` : API, domaine, migrations, imports, CLI et worker.
- `backend/test/` : tests unitaires et d'intégration.
- `infra/` : environnement Docker local.
- `workflows/` : exports techniques n8n sans identifiants secrets.
- `scripts/` : installation, vérification et sauvegarde Git.

Après un commit et avec un arbre propre, `npm run snapshot` crée un bundle Git vérifié. Il exclut les secrets, bases et fichiers privés : ceux-ci nécessitent une sauvegarde séparée.


## Vault et preparation V2

Le chargement des secrets depuis Vault est disponible : [installation, acces et maintenance](docs/VAULT_V1.md). Les commandes start:vault et worker:vault utilisent les valeurs du coffre sans repli vers .env.

Le [dossier V2](V2/README.md) contient le backlog, l’architecture et la recette a preparer ; aucune fonctionnalite V2 n’est declaree livree. Les exigences de securite V1 restent a terminer.

Verification de la publication Vault : typage, compilation et 55 tests unitaires passes dans cette copie ; 10 tests Vault passes sur l’installation locale avec les memes scripts. Le controle des secrets couvre les valeurs locales et les cles privees. La recette fonctionnelle complete n’a pas ete relancee.
