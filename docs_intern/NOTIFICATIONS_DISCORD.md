# Notifications InfiMatch

Les notifications internes sont disponibles dans `/notifications` pour les int?rimaires, agences et ?tablissements. Discord est facultatif et d?sactiv? par d?faut. L?association personnelle demande un code re?u par message priv?. Les salons d?organisation doivent ?tre priv?s et configur?s par un membre poss?dant les droits Discord requis.

## ?v?nements

- Mission compatible, affectation confirm?e, annulation, mission non pourvue.
- Besoin cr?? ou modifi? ; mission publi?e, modifi?e, pourvue par un autre candidat ou termin?e.
- Candidature envoy?e, pr?s?lectionn?e, refus?e ou retir?e.
- Bienvenue, r?sultat RPPS, association Discord.
- Demande de cl?ture re?ue, annul?e ou approuv?e.

Les messages d?pendent du r?le et des destinataires concern?s par l?action. Les ?v?nements de compte restent personnels. Le message de bienvenue est interne puisque Discord n?est pas encore associ? ? l?inscription. Aucun email de bienvenue ou de r?initialisation n?est configur?. Apr?s effacement du compte, aucun message Discord suppl?mentaire n?est envoy?.

## Ex?cution

Appliquer les migrations puis lancer API et worker avec les scripts Vault existants. Le worker traite la file persistante, contr?le les pr?f?rences et la version de la destination, puis appelle le relais n8n. Les r?sultats incertains ne sont pas renvoy?s automatiquement afin de limiter les doublons.

`workflows/discord-relay.template.json` est un mod?le sans identifiants ni secrets. Configurer une authentification d?en-t?te et le credential Discord dans n8n avant activation. `scripts/vault/configure-discord-relay.mjs` peut provisionner le relais du projet depuis une session n8n authentifi?e dans le navigateur d?di?, accessible sur le port local 9223.

Secrets backend dans Vault : `DISCORD_RELAY_TOKEN` et les secrets existants de bases, sessions et services. Configuration : `DISCORD_RELAY_URL`, `NOTIFICATION_APP_ORIGIN`, `N8N_WEBHOOK_BASE`. Le credential du bot est conserv? dans n8n ; `DISCORD_BOT_TOKEN` reste une alternative serveur facultative. Ne jamais exposer ces valeurs dans une variable `VITE_*`.

## Validation et d?ploiement

- Tests isol?s PostgreSQL, MongoDB, n8n, unitaires, int?gration et r?gressions s?curit? : PASS.
- Compilation TypeScript et Vite : PASS.
- Envoi technique avec donn?es fictives backend ? n8n Cloud ? salon Discord priv? : r?ussi.
- Le relais n8n Cloud est actif ; les services et bases de l?application restent locaux.
- Frontend Vercel : variable publique `VITE_API_URL=/api/v1` configur?e. Le backend public renvoie encore 500 ; les bases et Vault ne sont pas h?berg?s. La configuration du routage API et le d?ploiement public restent ? terminer avec cette infrastructure.

Une sauvegarde Git contient le code, les migrations et le mod?le de workflow ; elle ne remplace pas une sauvegarde des bases, des documents, de Vault ou des credentials n8n.
