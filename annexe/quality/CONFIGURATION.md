# Configuration du site et de l'administration

Inventaire documentaire revu le 21 septembre 2026, issu du code et des scripts de configuration. Les noms ci-dessous ne constituent pas une preuve de présence ou de validité d'un secret. Aucune valeur réelle ne doit être copiée dans ce document. Les exemples restent des placeholders.

| Variables | Composant / environnement | Nature | Emplacement | Vérification |
|---|---|---|---|---|
| `DATABASE_URL` | API, worker, local / production | Secret | Vault ; variable serveur Vercel pour Supabase | Santé, migrations et écritures publiques |
| `DATABASE_URL_UNPOOLED` | Opérateur production | Secret privilégié | Vault production uniquement | Script de migration ; jamais dans le frontend |
| `MONGODB_URI` | API / worker | Secret | Vault et serveur Vercel | Ping réel ; écriture/lecture des explications en recette isolée |
| `SESSION_SECRET` | API | Secret | Vault et serveur Vercel | Sessions séparées, révocation, cookies |
| `DOCUMENT_KEY`, `DOCUMENT_KEY_V<n>` | Documents et secrets MFA | Secrets de chiffrement | Vault, versions nécessaires côté serveur | Chiffrement/déchiffrement ; restauration reste à prouver |
| `DOCUMENT_KEY_VERSION` | API | Configuration interne | Vault / serveur | Version de clé documentaire |
| `DOCUMENT_STORAGE` | API | Configuration interne | Vercel : stockage PostgreSQL | Recette upload et ouverture autorisée |
| `DOCUMENT_DIRECTORY`, `DOCUMENT_QUOTA_BYTES` | API / local | Configuration interne | Vault / serveur ; répertoire uniquement local | Quota et stockage ; pas de disque Vercel présumé durable |
| `SERVICE_TOKEN` | API, n8n | Secret | Vault, serveur Vercel et identifiant sécurisé n8n autorisé | Rejet d'un appel sans jeton ; recette workflows |
| `APP_ORIGIN`, `NOTIFICATION_APP_ORIGIN` | API, liens | URL publiques | Vault / Vercel | CSRF/CORS et liens de notification |
| `ADMIN_ORIGIN` | API admin | URL publique distincte | Vault / Vercel | Cookies admin, CSRF, accès public admin |
| `TRUST_PROXY` | API | Configuration interne | Vercel / Vault | Cookies Secure et limiteur de requêtes |
| `NODE_ENV`, `NODE_OPTIONS`, `PORT`, `API_HOST` | Exécution Node | Configuration interne | Vercel ou lancement local | Build et démarrage effectif |
| `INFIMATCH_SECRET_SOURCE` | API | Configuration interne | Scripts Vault / serveur | Validation de configuration |
| `VERCEL`, `VERCEL_GIT_COMMIT_SHA` | API | Métadonnées de plateforme | Injectées par Vercel | Version exposée seulement à l'admin autorisé |
| `GOOGLE_CLIENT_ID` | Google / API | Identifiant public | Vault / serveur ; transmis par endpoint public | Client et origines Cloud ; connexion réelle utilisateur |
| `PSC_ENABLED`, `PSC_ENVIRONMENT` | API PSC | Configuration interne | Vault / Vercel | Désactivé sans raccordement ; environnement explicitement séparé |
| `PSC_CLIENT_ID`, `PSC_CLIENT_SECRET` | API PSC | Identifiant serveur / secret | À provisionner dans Vault puis serveur | Tests OIDC signés ; essai ANS BAS encore bloqué |
| `RPPS_ENABLED`, `RPPS_API_KEY` | Annuaire Santé | Activation / secret | Vault / serveur | Succès, vide, panne, quota, noms discordants |
| `FT_CLIENT_ID`, `FT_CLIENT_SECRET` | Import France Travail | Identifiant serveur / secret | Vault / Vercel | Import borné, dédoublonnage, état de source |
| `JOBSPIPE_API_KEY` | Import JobsPipe | Secret | Vault / Vercel | Import borné et tests de normalisation |
| `SMTP2GO_WEBHOOK_SECRET` | États email | Secret dédié | Serveur et webhook fournisseur | Authentification et dédoublonnage des reçus |
| `SMTP2GO_API_KEY`, `SMTP2GO_FROM` | Emails transactionnels | Secret / expéditeur | Variables serveur autorisées | Envoi et réception réels à distinguer |
| `N8N_WEBHOOK_BASE` | API vers n8n | URL interne, potentiellement sensible | Vault / Vercel | Webhooks actifs et appels de recette |
| `N8N_EDITOR_BASE_URL` | Exploitation | URL publique de console | Configuration locale / n8n | Lien de console ; authentification indépendante |
| `N8N_ENCRYPTION_KEY` | n8n local | Secret | Vault infrastructure ; n8n Cloud géré par fournisseur | Récupération locale ; non requis dans Vercel |
| `N8N_EXTRA_CA_CERTS` | n8n local | Chemin de certificat public | Configuration locale | TLS selon le réseau local |
| `DISCORD_RELAY_URL`, `DISCORD_RELAY_TOKEN` | API vers relais n8n | URL sensible / secret | Vault / serveur | Relais authentifié, pas de publication dans JS |
| `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_SECRET` | Discord | Secrets | Vault / identifiants n8n selon usage | Identité du bot et droits ; aucun token navigateur |
| `DISCORD_CLIENT_ID`, `DISCORD_TEST_GUILD_ID`, `DISCORD_TEST_CHANNEL_ID`, `DISCORD_TEST_USER_ID` | Configuration et recette Discord | Identifiants internes | Vault / environnement de recette | Destination fictive explicitement choisie |
| `REMINDER_DELAY_MINUTES` | Ancienne configuration | Variable héritée | Ne pilote pas les rappels actuels | Le délai de mission non pourvue est fixé à 24 h dans `automation/reminders.ts` |
| `MATCHING_WEIGHTS_JSON` | Matching | Configuration métier | Vault / serveur | Éligibilité bloquante indépendante du score |
| `MATCHING_RETENTION_DAYS`, `BUSINESS_HISTORY_RETENTION_DAYS` | Conservation | Politique interne | Vault / serveur | Nettoyage technique distinct de la conservation des historiques métier, dont la politique reste à valider |
| `ERASURE_LEDGER_DIRECTORY` | Effacement local | Chemin interne | Configuration locale | Registre cloud dans MongoDB ; procédures de restauration |
| `POSTGRES_PASSWORD`, `MONGO_PASSWORD` | Docker local | Secrets | Vault infrastructure, injectés dans le processus | Démarrage local ; non utilisés par Supabase/Atlas |
| `VITE_API_URL` | Frontend | Public uniquement | Vercel frontend / exemple local | `/api/v1`, proxy vers API |
| `VITE_ROUTER` | Frontend démo | Public | Build de démonstration seulement | Hash en démo ; routes navigateur sur le site |
| `API_PROXY_TARGET` | Vite local | URL de développement | Exemple frontend | Proxy local ; pas utilisé comme URL de production |

Les variables d'outillage (`INFIMATCH_VERCEL_CLI`, paramètres de scripts de test et chemins de sortie) restent locales. Les identifiants AppRole Vault et moyens de récupération sont dans le répertoire privé exclu de Git, pas dans `.env.example`. L'admin statique n'embarque aucun secret et utilise un proxy limité à `/api/v1/admin`.

## Application des changements

1. Modifier les secrets via Vault, avec le rôle opérateur existant, sans token root quotidien.
2. Valider la liste avec `scripts/vault/sync-production-vercel.mjs`, appliquer seulement les variables serveur autorisées, puis redéployer.
3. Compiler le backend, passer `npm run test:isolated`, appliquer les migrations additives via `scripts/vault/migrate-production.mjs`.
4. Déployer le frontend et l'API depuis `Main`. Pour l'admin, exécuter `npm run build:admin --prefix frontend`, lier `dist-admin` au projet `infimatch-admin`, puis déployer cet artefact.
5. Exécuter les scripts `verify-production*.mjs`. Ils utilisent des comptes fictifs et ne doivent pas afficher de données personnelles ou de secrets.

Le retour arrière applicatif consiste à promouvoir les derniers déploiements Vercel validés. Les migrations de ce lot ajoutent des tables et colonnes ; conserver ces ajouts lors d'un retour arrière, ne pas supprimer les données. Une restauration de base est une opération distincte nécessitant sauvegarde vérifiée et périmètre explicite.
