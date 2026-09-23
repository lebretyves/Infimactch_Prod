# Connexions API, workflows n8n et preuves de tests

État documentaire vérifié le 23 septembre 2026 sur la version consolidée basée sur Main `7cc590a`, complétée par les tests unitaires. La présence d'une intégration dans le code ne garantit pas son activation actuelle en production.

## Connexions de l'application

| Connexion | Usage et destination | Source |
| --- | --- | --- |
| API InfiMatch | Frontend et administration vers `/api/v1` ; sessions et CSRF ; backend documenté : `https://infimactch-prod-backend.vercel.app` | `frontend/src/services/api.ts`, `docs/openapi.json` |
| Google Identity Services | Connexion Google, script `accounts.google.com/gsi/client`, validation serveur des jetons ; activation par `GOOGLE_CLIENT_ID` | `frontend/src/services/googleIdentity.ts`, `backend/src/auth/google.ts` |
| Annuaire Santé / RPPS | Vérification des professionnels via `gateway.api.esante.gouv.fr/fhir/v2/Practitioner` | `backend/src/profiles/rpps.ts` |
| Pro Santé Connect | OIDC optionnel ; domaine de production `auth.esw.esante.gouv.fr`, environnement de test distinct | `backend/src/auth/psc.ts`, `backend/src/auth/psc.module.ts` |
| France Travail | OAuth2 sur `entreprise.francetravail.fr`, offres sur `api.francetravail.io/partenaire/offresdemploi/v2/offres/` | `backend/src/public-data/france-travail-client.ts` |
| JobsPipe | Collecte via `api.jobspipe.dev/v1/jobs/search` | `backend/src/public-data/jobspipe.ts`, `backend/src/public-data/jobspipe-collection.ts` |
| Géoplateforme / IGN | Recherche et géocodage inverse : `data.geopf.fr/geocodage/search` et `/reverse` | `backend/src/listings/locations.ts`, `backend/src/listings/reverse-location.ts` |
| API des communes | Coordonnées et centres via `geo.api.gouv.fr/communes` | `backend/src/public-data/offer-geolocation.ts`, `backend/src/public-data/jobspipe-geolocation.ts` |
| SMTP2GO | Emails de récupération et de mission, PDF ; `api.smtp2go.com/v3/email/send`. Retours vers `/api/v1/internal/automation/smtp2go/webhook` | `backend/src/auth/recovery-mail.ts`, `backend/src/automation/mission-mail.ts`, `backend/src/automation/email-delivery.module.ts` |
| Discord | Notifications via `discord.com/api/v10`, bot direct ou relais n8n authentifié selon configuration | `backend/src/notifications/discord-client.ts` |
| n8n | Backend vers `N8N_WEBHOOK_BASE` ; n8n vers `/api/v1/internal/automation/*`, avec authentification de service | `backend/src/automation/automation.module.ts`, `docs/n8n/` |

FINESS fonctionne par import de référentiel gzip, avec provenance contrôlée sur `static.data.gouv.fr`, puis consultation en base : `backend/src/reference-data/finess.ts`. Ce n'est pas un appel externe à chaque consultation.

PostgreSQL/PostGIS, MongoDB et Vault sont des connexions d'infrastructure. Vercel héberge les applications. Le fichier d'essai Teams ne prouve pas une intégration Teams active. Resend ne doit pas être présenté comme le transport actuel sur la seule présence d'un ancien nom de variable.

## JSON n8n : environnements et différences

- `workflows/confirmation.json`, `matches.json`, `reminders.json` : workflows de recette isolée, utilisés par `scripts/security/isolated.mjs`. Confirmation et annulation partagent un workflow ; les rappels ont un déclenchement horaire.
- `docs/n8n/InfiMatch-production-*.json` : sept définitions destinées à n8n Cloud. Le configurateur retire les références de credentials lors de l'export ; il faut les associer à nouveau lors d'un import.
- `docs/n8n/maintenance-quotidienne.json` : maintenance séparée, dont l'activation n'est pas attestée dans l'audit des sept workflows.
- `docs/n8n/*-test.json` : essais manuels Discord / Teams. `discord-messages.json` est un catalogue, pas un workflow importable. Le relais Discord a son modèle dans `workflows/discord-relay.template.json`.

| Fichier dans docs/n8n | Fonction / fréquence du JSON |
| --- | --- |
| `InfiMatch-production-matches.json` | Webhook de matching |
| `InfiMatch-production-confirmation.json` | Webhook de confirmation |
| `InfiMatch-production-cancellation.json` | Webhook d'annulation |
| `InfiMatch-production-reminders.json` | Webhook de rappels |
| `InfiMatch-production-reprise-et-rappels.json` | Reprise de file, disponibilité API et rappels par lots ; toutes les **4 heures** |
| `InfiMatch-production-import-France-Travail.json` | Import et reprise paginée ; **7 h et 15 h**, Europe/Paris |
| `InfiMatch-production-import-JobsPipe.json` | Import et reprise paginée ; **7 h**, Europe/Paris |

**Écart historique confirmé :** l'observation n8n du 19 septembre 2026 à 21:05 UTC relevait un déclenchement toutes les **30 minutes** pour « reprise et rappels » (`CDQaIucF4whGsJjg`), contre **4 heures** dans le dépôt et son générateur. Les noms des nœuds des six autres workflows et les horaires d'import concordent avec les métadonnées observées. Cela ne prouve pas l'égalité complète des paramètres et des connexions.

La comparaison directe du 23 septembre n'a pas abouti : Firefox est ouvert, mais sa session n'est pas accessible aux outils. Les captures évoquées ne sont pas disponibles dans le fil. Un export des versions actuellement publiées dans n8n Cloud reste nécessaire. Aucun workflow n'a été déclenché ou modifié pendant l'inspection. Les JSON du dépôt ne sont pas certifiés identiques à la production actuelle.

## Tests et preuves

| Élément | Emplacement | Portée |
| --- | --- | --- |
| Tests unitaires backend | `backend/test/unit/` | Sources des tests |
| Tests d'intégration backend | `backend/test/integration/` | Scénarios sur services isolés |
| Tests frontend | `frontend/package.json`, scripts associés | Tests unitaires, navigateur, administration |
| CI | `.github/workflows/v1.yml` | Exécution et artifacts ; seuil unitaire de 95 % des lignes |
| Résumé récent | `docs/unit-coverage-95.md` | 643/643 tests, 95,07 % des lignes backend |
| Preuves récentes versionnées | `docs/proofs/unit-coverage-20260923/` | Totaux JSON et journal du retest |
| Rapport HTML généré | `docs/proofs/unit-coverage/index.html` | Ignoré par Git ; généré par la commande de couverture |
| Totaux générés | `docs/proofs/unit-coverage/coverage-summary.json` | 11 639 / 12 242 lignes ; branches 89,97 % ; fonctions 82,31 % |
| Preuves historiques | `docs/proofs/`, notamment `v1-hardening/` | Vérifier la date et le périmètre avant citation |

Reproduire depuis la racine : `npm run coverage:unit`. Seuls les tests unitaires backend contribuent aux 95,07 %. Aucun test existant ni exclusion n'a été supprimé ; seuls les points d'entrée `src/main.ts` et `src/worker.ts` restent exclus comme auparavant.

La campagne consolidée sur `7cc590a` avait 367 tests unitaires backend, 68 frontend, 181 tests d'intégration, et 91,29 % de couverture backend **unitaires + intégration**. Ses preuves locales sont dans `E:/Interimatch/audits/release-final-summary.json` et `release-final-backend/`.

Attention : `docs/proofs/coverage-totals.json` contient l'ancien résultat 79,38 %, et `docs/proofs/v1-hardening/result.json` est daté du 17 septembre. Ils ne prouvent pas les 95,07 % récents. Le nouveau seuil de couverture ne constitue pas une nouvelle validation de la production ni des fournisseurs externes.

Le dossier documentaire local `E:/Interimatch/livrables/documentation-api-n8n-20260923/` contient les JSON du dépôt, les métadonnées n8n datées, un manifeste SHA-256 et les preuves. Les références aux credentials des essais Discord y sont retirées. Les métadonnées d'observation ne sont pas un workflow importable.
