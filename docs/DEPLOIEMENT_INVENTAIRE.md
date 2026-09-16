# Inventaire de d?ploiement InfiMatch

## Code ? livrer
- `frontend/` : interface Vite, routage SPA, configuration publique et proxy `/api/v1` ? raccorder au backend.
- `backend/` : API NestJS, migrations PostgreSQL, gestionnaire HTTP Vercel, d?pendances verrouill?es.
- `workflows/` : matching, rappels, confirmation et annulation, relais Discord.
- `scripts/` : migrations, imports de donn?es, entretien, sauvegarde/restauration, d?marrage Vault et worker.
- `infra/` : d?finitions PostgreSQL/PostGIS, MongoDB, n8n local, Vault et HTTPS. Ces fichiers d?crivent des services ; leur pr?sence dans Git ne cr?e aucun serveur.

## Services et ?tat constat?
- Frontend Vercel en production ; `/api/v1` n?cessite encore sa r??criture vers le backend.
- Backend Vercel d?ploy? ; configuration applicative et bases publiques absentes.
- Node.js 24 / NestJS 12 : `NODE_OPTIONS=--experimental-require-module` ajout? en production pour permettre le chargement ESM, conform?ment ? la documentation Vercel.
- Gestionnaire HTTP par d?faut ajout? ? `src/app.ts` ; test local : deux requ?tes simultan?es de sant? 200, notifications sans session 401.
- PostgreSQL avec PostGIS et MongoDB restent locaux ; h?bergement, r?les, migration et transfert des donn?es ? d?finir.
- Vault local utilise Raft, TLS et AppRole ; adresse et certificats locaux ne sont pas directement utilisables depuis Vercel.
- Documents chiffr?s stock?s actuellement sur disque local ; stockage durable compatible avec l?API ? mettre en place. Le disque ?ph?m?re d?une fonction ne remplace pas ce stockage.
- Worker de file d??v?nements en boucle locale ; ex?cution publique durable ou adaptation planifi?e ? pr?voir.
- n8n Cloud h?berge le relais Discord actif. Les workflows m?tier et leurs appels au backend doivent ?tre raccord?s ? la cible publique.
- Imports France Travail, JobsPipe et t?ches de maintenance planifi?s localement : leur ex?cution publique doit ?tre d?finie.
- Connexion Google : v?rifier les origines autoris?es pour le domaine final et le client public configur?.

## Configuration
- Frontend : uniquement valeurs publiques, actuellement `VITE_API_URL=/api/v1`.
- Backend : `DATABASE_URL`, `MONGODB_URI`, `APP_ORIGIN`, `TRUST_PROXY`, `SESSION_SECRET`, `DOCUMENT_KEY`, `SERVICE_TOKEN`, param?tres de conservation et de documents.
- Int?grations : `GOOGLE_CLIENT_ID`, `FT_CLIENT_ID`, `FT_CLIENT_SECRET`, `RPPS_API_KEY`, `JOBSPIPE_API_KEY`, `N8N_WEBHOOK_BASE`, `DISCORD_RELAY_URL`, `DISCORD_RELAY_TOKEN`, `NOTIFICATION_APP_ORIGIN`.
- Les valeurs priv?es et les donn?es ne doivent pas ?tre commit?es. Ne pas copier les adresses localhost de l?environnement local dans la production.
- Le projet Vercel backend pointe encore sa branche automatique de production sur `Backend`, alors que les modifications livr?es sont sur `Main` : corriger ce r?glage pour les prochains d?ploiements automatiques.

## Donn?es et continuit?
Sauvegarde coordonn?e PostgreSQL (avec r?les), MongoDB, documents chiffr?s, cl?s/version de chiffrement, snapshot Vault et configuration n8n. Valider une restauration et le choix des donn?es ? migrer avant bascule. Les backups priv?s restent hors Git.

## Recette finale
Sant? API, inscription/connexion, Google, CSRF et cookies, droits agence/?tablissement/int?rimaire, missions et candidatures, documents, notifications internes/Discord, imports, t?ches planifi?es et restauration. Un statut Vercel Ready signifie que le d?ploiement a ?t? construit ; il ne valide pas ces parcours.
