# InfiMatch

Projet étudiant de mise en relation entre soignants intérimaires, établissements de santé et agences. Le dépôt contient l’API NestJS, l’interface React, une administration séparée et les workflows n8n.

## État vérifié

Le [bilan du TODO et la matrice des 42 scénarios](docs/quality/MATRICE_42_TESTS_2026-09-19.md) distinguent les fonctionnalités présentes, les tests réellement exécutés et les validations restantes. La livraison PDF `41706fe` constitue le point de départ de cette consolidation. Le code versionné et les preuves locales ne prouvent pas, à eux seuls, son déploiement : vérifier le SHA publié et l’état READY dans Vercel. Aucun taux global de conformité ou de couverture n’est déduit du nombre de fonctions présentes.

Les anciens bilans, nombres de routes, résultats de tests et limites sont conservés dans [le README historique](docs/history/README_BACKEND_AVANT_2026-09-19.md). Ils décrivent leur date, pas l’état courant.

## Fonctionnalités

- Comptes, inscription IDE/IADE/IBODE avec diplômes distincts, vérification RPPS, organisations et droits par rôle.
- Profil, services d’exercice, mobilité, disponibilités, recherche de missions internes et externes, favoris et matching explicable.
- Candidatures, affectations transactionnelles, protection des chevauchements, fermeture des candidatures incompatibles et agenda.
- Documents privés, confirmations et annulations PDF. Ces PDF ne constituent pas une signature de contrat de travail.
- Notifications internes, automatisations n8n et emails de confirmation/annulation via SMTP2GO lorsque configuré. L’acceptation par le fournisseur ne prouve pas la lecture du mail.
- Import France Travail et JobsPipe, dédoublonnage, contrôle de fraîcheur, reprises et limites de quota.
- Lecture de CV PDF/image/DOCX avec propositions à relire ; BIC facultatif quand un IBAN valide est renseigné.
- Statistiques de conversion par organisation, aide par rôle, tickets privés et guides de navigation sous-titrés.
- Administration, journaux et outils d’exploitation. Suivi des états de livraison, récupération autonome du compte et limitation partagée des appels ; le suivi SMTP nécessite la configuration du webhook fournisseur.

Architecture : Node.js 24 / TypeScript, NestJS / Express, PostgreSQL avec PostGIS et btree_gist, TypeORM, MongoDB/Mongoose, n8n; frontend React 19 / React Router / Vite. La production PostgreSQL utilise Supabase. Les bases locales de développement restent distinctes.

## Installation locale

Prérequis : Node.js 24, npm, Git et Docker Desktop. Depuis la racine :

```powershell
npm ci
npm run setup
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run seed -w backend
npm run build
npm run start -w backend
```

`setup` prépare la configuration locale. Les clés externes se configurent dans un environnement sécurisé ou Vault, jamais dans Git. Le seed crée uniquement des comptes fictifs locaux et refuse `NODE_ENV=production`; il ne simule pas de résultat RPPS positif. Ne pas lancer seed, migrations ou tests d’écriture contre une base de production.

- API : `http://127.0.0.1:3100/api/v1/health`
- Swagger : `http://127.0.0.1:3100/api/docs`
- n8n local : `http://127.0.0.1:55678`

Dans un second terminal :

```powershell
npm ci --prefix frontend
npm run dev --prefix frontend
```

Le frontend utilise l’API réelle via son proxy de développement; voir [son README](frontend/README.md). `npm run dev` à la racine démarre le backend. `npm run worker` traite les événements selon la configuration locale; les exports n8n sont dans `workflows/`.

## API, sécurité et automatisations

Les routes métier ont le préfixe `/api/v1`. Les sessions utilisent des cookies; une écriture utilisateur requiert un `Origin` autorisé et le jeton `X-CSRF-Token` obtenu via `/auth/csrf`. Les droits de l’organisation sont vérifiés côté serveur. Une mission représente un poste continu; les dates portent un décalage explicite et les chevauchements utilisent des intervalles semi-ouverts.

La documentation active est générée par l’application; [docs/openapi.json](docs/openapi.json) est son export versionné. Le script `scripts/export-openapi.cjs` exporte depuis une base de test isolée sur `127.0.0.1:55433/infimatch_test`, après compilation et migrations; il refuse les autres destinations.

Les appels internes n8n utilisent leur authentification de service. **Exception distincte :** le webhook JSON SMTP2GO `POST /api/v1/internal/automation/smtp2go/webhook` utilise uniquement `Authorization: Bearer <SMTP2GO_WEBHOOK_SECRET>` pour son secret dédié. Ne pas lui substituer `X-InfiMatch-Token` ni la clé API d’envoi. Le champ de corrélation `X-InfiMatch-Email-ID` relie l’événement à l’envoi; le suivi des ouvertures et clics n’est pas nécessaire.

Les relances de missions non pourvues sont des notifications internes aux organisations concernées, avec délai après publication, espacement, plafond et exclusion des anciens lots. Elles ne constituent pas un catalogue complet de relances par email. Les imports ont leurs [horaires et limites dédiés](docs/quality/IMPORTS_SOBRIETE_2026-09-19.md).

## Vérification

```powershell
npm test
npm run build
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
npm run test:seo --prefix frontend
npm run build:admin --prefix frontend
npm run check:secrets
```

Les intégrations utilisent des bases locales isolées et peuvent créer ou supprimer des données fictives : vérifier leur environnement avant `npm run test:integration` ou les recettes navigateur. La présence d’un script ne prouve pas qu’il a été exécuté; la matrice contient les campagnes datées et leurs limites. Les contrôles automatiques d’accessibilité ne remplacent pas l’audit manuel complet.

## Documentation

- [Configuration et services](docs/quality/CONFIGURATION.md)
- [Exigences V1](docs/REQUIREMENTS_V1.md), [architecture](docs/SCHEMA_ARCHITECTURE_V1.md), [flux](docs/FLUX_V1.md)
- [Matrice actuelle des tests et du reste à faire](docs/quality/MATRICE_42_TESTS_2026-09-19.md)
- [Récupération autonome](docs/quality/RECUPERATION_AUTONOME_2026-09-19.md)
- [README frontend](frontend/README.md)

Les documents historiques peuvent contenir des propositions non retenues et des limites corrigées depuis. Confronter leurs affirmations à la date, au code et aux preuves de déploiement avant de les présenter comme actuelles.

## Preuves de cette consolidation

- [Campagne backend et couverture](docs/quality/CAMPAGNE_FINALE_2026-09-19.md).
- [Lecture de CV avec revue utilisateur](docs/quality/LECTURE_CV_ENRICHIE_2026-09-19.md).
- [Aide, support et guides](docs/quality/AIDE_SUPPORT_GUIDES_2026-09-19.md).
- [Indicateurs entreprise](docs/quality/CONVERSIONS_ENTREPRISE_2026-09-19.md).
- [Sauvegardes et limites opérationnelles](docs/quality/SAUVEGARDES_OPERATIONNELLES_2026-09-19.md).
- [Continuité n8n proposée](docs/quality/N8N_CONTINUITE_2026-09-19.md).
- [Dossier et support de soutenance](docs/presentation/DOSSIER_SOUTENANCE.md).

Les responsabilités juridiques, la politique de conservation métier et les informations humaines de soutenance ne sont pas inventées. MFA, changement d’hébergement n8n, catalogue de missions publiques et contrat/signature restent des décisions distinctes. Aucun bouton de validation RPPS fictive n’est ajouté.
