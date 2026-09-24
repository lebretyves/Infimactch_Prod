# InfiMatch

Plateforme étudiante de mise en relation entre infirmiers (IDE, IADE, IBODE), établissements et agences d’intérim. React/Vite pour le site et l’administration, NestJS/TypeScript pour l’API, Supabase/PostgreSQL et MongoDB Atlas pour les données, n8n pour les automatisations.

## Accès en production

**[Ouvrir l’application InfiMatch](https://infimactch-prod-backend-l5bc.vercel.app)**

| Service | Adresse |
| --- | --- |
| Application | https://infimactch-prod-backend-l5bc.vercel.app |
| Administration — compte autorisé et MFA | https://infimatch-admin.vercel.app |
| Santé de l’API | https://infimactch-prod-backend.vercel.app/api/v1/health |
| n8n actuel — connexion opérateur requise | https://infimatch2.app.n8n.cloud/home/workflows |

Le compte n8n précédent est conservé pour retour arrière, avec ses workflows désactivés. [État des automatisations et JSON](docs/n8n/2026-09-24/README.md).

## Installation locale

Prérequis : **Node.js 24, npm, Git et Docker avec Compose**. Commandes depuis la racine du clone, sous PowerShell ou Linux/WSL :

```sh
npm ci
npm ci --prefix frontend
npm run setup
```

Avant de poursuivre, vérifier dans `.env` :

```dotenv
APP_ORIGIN=http://127.0.0.1:5173
ADMIN_ORIGIN=http://127.0.0.1:5175
```

Ouvrir les pages avec `127.0.0.1`, sans alterner avec `localhost` : ces origines servent aux contrôles de session et CSRF. `setup` ne remplace pas un `.env` existant. Conserver les bases locales sur les ports 55432 et 57017.

```sh
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run finess:import
npm run seed -w backend
npm run build
npm run start -w backend
```

Dans deux autres terminaux, lancer respectivement :

```sh
npm run dev --prefix frontend
```

```sh
npm run dev:admin --prefix frontend
```

Application : http://127.0.0.1:5173 · Administration : http://127.0.0.1:5175 · API : http://127.0.0.1:3100/api/v1/health · OpenAPI : http://127.0.0.1:3100/api/docs · n8n : http://127.0.0.1:55678.

**[Guide local complet](docs/INSTALLATION_LOCALE.md)** : premier OWNER et MFA, mode de démonstration RPPS, démarrage quotidien, arrêt et services externes. Ne pas rejouer le seed ni le bootstrap chaque jour. Le lancement de n8n ne configure pas automatiquement ses workflows ni les emails/Discord.

## Tests et preuves

| Contrôle | Commande |
| --- | --- |
| Tests unitaires backend | `npm test` |
| Couverture unitaire backend — seuil 95 % des lignes | `npm run coverage:unit` |
| Tests frontend | `npm test --prefix frontend` |
| Intégrations sur environnement isolé | `npm run test:isolated` |
| Garde du bootstrap administrateur local | `node --test scripts/bootstrap-local-admin.test.mjs` |
| Cohérence documentaire | `python scripts/check-repository-consistency.py` |

[Tests backend](backend/test) · [Preuves matching du 24 septembre](docs/proofs/top-partner-recommendations-20260924/README.md) · [Validation GitHub Yves](https://github.com/lebretyves/Infimactch_Prod/actions).

Les preuves datées ne remplacent pas une recette complète de la version courante. Un contrôle GitHub non exécuté faute de budget n’est pas un test réussi.

## Documents utiles

- [Dossier de rendu](docs/rendu/README.md) et [index documentaire](docs/README.md).
- [Coût de réalisation de l’application](docs/cout-projet/README.md) ; [exploitation et rentabilité](docs/business/2026-09-24/README.md).
- [Guide utilisateur](docs/GUIDE_UTILISATEUR.md), [architecture](docs/SCHEMA_ARCHITECTURE_V1.md) et [déploiement](docs/DEPLOIEMENT_PRODUCTION.md).
- [API OpenAPI](docs/openapi.json) et [configuration des services](docs/quality/CONFIGURATION.md).

Les scores indicatifs de « Vos matchs » ne prouvent pas l’éligibilité ; la validation d’affectation reste humaine. Les documents générés sont des confirmations applicatives, pas des contrats de travail signés. Ne jamais publier les secrets, exports privés Vault ou valeurs sensibles dans `VITE_*`.

Licence : [LICENSE](LICENSE).
