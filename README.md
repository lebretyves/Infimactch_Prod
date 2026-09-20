# InfiMatch

Plateforme étudiante de mise en relation entre professionnels de santé, établissements et agences d'intérim. Le projet comprend une application web, une API, une administration séparée et des automatisations n8n.

InfiMatch facilite la recherche et le suivi des missions. Les agences assurent l'emploi et la rémunération. Les PDF produits sont des confirmations ou annulations applicatives, pas des contrats de travail complets signés.

## Accès rapide

| Besoin | Document |
| --- | --- |
| Périmètre et critères d'acceptation | [Exigences du projet](docs/REQUIREMENTS_V1.md) |
| Préparer le rendu Epitech | [Livrables et recette finale](docs/rendu/README.md) |
| Trouver un guide technique | [Index documentaire](docs/README.md) |
| Comprendre les services déployés | [Déploiement](docs/DEPLOIEMENT_PRODUCTION.md) |
| Retrouver un ancien document | [Politique d'archivage](docs/ARCHIVES.md) |

## Fonctionnalités

- Inscription et connexion des candidats, établissements et agences ; profils et droits distincts.
- Qualifications, vérification RPPS, disponibilités et zone de recherche enregistrée.
- Recherche de missions, favoris, candidatures et matching explicable ; affectation après décision humaine.
- Agenda, documents privés et confirmations/annulations PDF.
- Notifications internes ; configuration Discord facultative après inscription et modifiable ensuite. Emails selon les services configurés.
- Import et nettoyage d'offres externes, contrôle des doublons, reprises et quotas.
- Administration : rôles, MFA, suivi des comptes, incidents, imports et journaux.

Le RIB reste facultatif. Le domicile et la zone de recherche/alertes sont distincts ; une recherche ponctuelle ne modifie pas les alertes enregistrées. Une correspondance RPPS ne certifie pas à elle seule l'identité du titulaire.

## Architecture

| Composant | Technologie / rôle |
| --- | --- |
| Application et administration | React 19, TypeScript, React Router, Vite ; builds séparés |
| API | NestJS, Node.js 24, TypeScript |
| Données structurées et géographie | PostgreSQL / PostGIS ; Supabase en production |
| Explications du matching | MongoDB |
| Automatisations | Workflows n8n et traitements backend |
| Documents | Chiffrement applicatif et stockage configuré côté serveur |

```text
backend/       API, règles métier, migrations et tests
frontend/      Application, administration et tests navigateur
infra/         Environnement local et configuration d'infrastructure
scripts/       Validation, imports, exploitation et sauvegardes
workflows/     Modèles de workflows n8n
docs/         Guides, exigences, preuves et préparation du rendu
```

## Installation locale

Prérequis : Node.js 24, npm, Git et Docker avec Compose. Exécuter depuis la racine d'un clone complet :

```powershell
npm ci
npm ci --prefix frontend
npm run setup
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run seed -w backend
npm run build
npm run start -w backend
```

Dans un second terminal :

```powershell
npm run dev --prefix frontend
```

| Service local | Adresse |
| --- | --- |
| Application | http://127.0.0.1:5173 |
| Santé API | http://127.0.0.1:3100/api/v1/health |
| OpenAPI interactif | http://127.0.0.1:3100/api/docs |
| n8n | http://127.0.0.1:55678 |

`setup` prépare l'environnement local. Vérifier les destinations avant migrations, seed ou tests d'écriture : ces commandes ne doivent pas cibler les données de production. Les exemples de configuration sont versionnés, jamais les valeurs privées. Un service externe absent peut rendre sa fonctionnalité indisponible sans invalider le reste du démarrage.

Pour le développement API avec recompilation : `npm run dev`. Le worker utilise `npm run worker` après compilation ; son exécution peut traiter des événements. Voir le [guide frontend](frontend/README.md) et la [configuration des services](docs/quality/CONFIGURATION.md).

## Validation

| Contrôle | Commande à la racine |
| --- | --- |
| Tests unitaires API | `npm test` |
| Compilation API | `npm run build` |
| Tests d'intégration | `npm run test:integration` |
| Couverture backend | `npm run coverage` |
| Tests frontend | `npm test --prefix frontend` |
| Typage frontend | `npm run typecheck --prefix frontend` |
| Build public | `npm run build --prefix frontend` |
| Build administration | `npm run build:admin --prefix frontend` |
| Recettes navigateur configurées | `npm run test:browser --prefix frontend` |
| Contrôle local des secrets connus | `npm run check:secrets` |

Les intégrations utilisent des bases isolées ; préparer leur environnement avant exécution. Les recettes navigateur nécessitent leurs serveurs et fixtures. Le contrôle des secrets connus ne constitue pas un audit exhaustif de l'historique.

## État de livraison et limites

État documentaire : **21 septembre 2026**. Dernier lot applicatif observé avant ce rangement : `fd68a37` ; déploiements frontend et API signalés réussis. Le QR code admin a été livré séparément. Les preuves conservées portent leur date et leur périmètre ; elles ne valident pas automatiquement toute modification ultérieure.

- Optimisation du matching testée sur bases isolées ; résultats et comparaisons conservés.
- Étape Discord facultative testée sur les trois familles de comptes avec API fictive ; aucune réception Discord réelle n'en est déduite.
- Recette complète publiée, deux résultats nocode actuels, enrôlement MFA réel et essais humains d'accessibilité restent à documenter.
- Identité du responsable des données, certaines durées et heures humaines de l'équipe restent à formaliser.
- La CI Epitech était bloquée par le budget de l'organisation au dernier constat ; ne pas l'assimiler à une CI réussie.

Le [dossier de rendu](docs/rendu/README.md) distingue livrables disponibles et validations ouvertes. Aucune conformité RGAA complète ni économie financière/carbone n'est revendiquée.

## API et exploitation

Les routes métier utilisent `/api/v1`. Les écritures authentifiées nécessitent les protections de session, d'origine et CSRF prévues par le client. Les droits sont contrôlés côté serveur. L'[export OpenAPI](docs/openapi.json) complète la documentation servie par l'application.

Les variables `VITE_*` sont publiques : ne jamais y mettre de secret. L'administration, le site et l'API ont des livraisons distinctes. Voir [le déploiement](docs/DEPLOIEMENT_PRODUCTION.md), [les sauvegardes](docs/quality/SAUVEGARDES_OPERATIONNELLES_2026-09-19.md) et [les automatisations](docs/rendu/README.md#automatisations).

## Contribution et documentation

Conserver les tests et preuves adaptés au changement. Mettre à jour les exigences lorsqu'un comportement produit évolue. Ne pas placer conversations, prompts, comptes rendus successifs ou secrets dans les branches actives. Les guides décrivent l'usage courant ; les preuves datées décrivent uniquement leur campagne. Voir [les archives](docs/ARCHIVES.md).

Licence : [LICENSE](LICENSE).
