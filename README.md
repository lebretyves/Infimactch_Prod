# InfiMatch — backend V1

> État consolidé et reste à faire : [bilan V1 pour main](docs/BILAN_V1_MAIN_2026-09-16.md). Les bilans datés plus anciens sont historiques.
> [Historique de la journée et suivi des travaux](docs/HISTORIQUE_2026-09-16.md).
## Vérification kickoff du 16 septembre 2026

Le [bilan actuel](docs/audits/kickoff-2026-09-16/BILAN_BACKEND_KICKOFF_V1_2026-09-16.md) compare le code et les raccordements aux exigences du sujet : comptes, 62 opérations API, 40 exigences kickoff et limites restantes. 65 tests unitaires backend, 9 tests client API et les compilations ont été relancés ; aucune donnée métier créée. Les états et taux de couverture plus anciens ci-dessous restent historiques.

Monolithe modulaire NestJS 12 / Express, Node.js 24 / TypeScript, PostgreSQL + PostGIS + btree_gist, TypeORM, MongoDB/Mongoose et n8n.

Le périmètre cible reste **100 % de la V1 validée**. Ce dépôt contient une première réalisation exécutable et testée ; il ne constitue pas une déclaration de conformité intégrale ou de mise en production. Les écarts sont dans [la note de reprise](docs/REPRISE_BACKEND_V1.md).

## Documentation du projet

**Dernière recette : [bilan des corrections et manques V1](docs/RECETTE_BACKEND_V1.md).**

- [Requirements : exigences V1, acceptation et limites](docs/REQUIREMENTS_V1.md)
- [Architecture avec schéma intégré](docs/SCHEMA_ARCHITECTURE_V1.md) et [plan des fichiers](docs/PLAN_ARCHITECTURE_V1.md)
- [Flux : authentification, RPPS, matching, affectation et n8n](docs/FLUX_V1.md)
- [Matrice complète des exigences](docs/MATRICE_VALIDATION_V1.csv) et [contrat OpenAPI](docs/openapi.json)

Les schémas Mermaid sont inclus dans les fichiers Markdown et s'affichent dans un lecteur compatible. La [source architecture-v1.mmd](docs/architecture-v1.mmd) reste modifiable. Les documents distinguent le backend présent, les scénarios testés et les travaux restants.

Dernier code vérifié : voir docs/proofs/verification.json, **71 tests réussis**, couverture des lignes **79,38 %**. Les [preuves](docs/proofs/verification.json) conservent leur date ; une mise à jour documentaire ne constitue pas une nouvelle exécution des tests. Les accès ANS/RPPS (FOUND et NOT_FOUND), France Travail et FINESS sont vérifiés. Frontend et déploiement distant restent à valider.

## Démarrer sous PowerShell

Prérequis : Node 24, npm, Git et Docker Desktop démarré. Depuis ce dossier :

```powershell
# Sur ce poste, le registre npm nécessite le magasin de certificats système.
$env:NODE_OPTIONS='--use-system-ca'
npm ci
npm run setup
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run seed -w backend
npm run build
npm run start -w backend
```

API : http://127.0.0.1:3100/api/v1/health  
Documentation : http://127.0.0.1:3100/api/docs  
n8n local : http://127.0.0.1:55678

Les mots de passe des comptes **fictifs** créés par le seed sont dans `data/demo-credentials-*.json`, ignorés par Git. Le seed est rejouable et interdit lorsque NODE_ENV=production. Il ne fabrique jamais de résultat RPPS positif. Les comptes de test sont distincts de ces comptes.

Pour développer : `npm run dev`. TypeScript recompile avant chaque redémarrage. Pour traiter les événements en continu, ouvrir un autre terminal : `npm run worker`.

## Importer les trois workflows

```powershell
docker cp workflows/. infimatch-n8n-1:/tmp/infimatch-workflows
docker exec infimatch-n8n-1 n8n import:workflow --separate --input=/tmp/infimatch-workflows
docker exec infimatch-n8n-1 n8n publish:workflow --id=InfiMatchMatches
docker exec infimatch-n8n-1 n8n publish:workflow --id=InfiMatchReminders
docker exec infimatch-n8n-1 n8n publish:workflow --id=InfiMatchConfirm
docker restart infimatch-n8n-1
```

Les exports ne contiennent aucun secret. Les appels sont authentifiés par un secret de service local fourni par Compose. L'accès aux variables d'environnement est activé pour ces workflows : l'éditeur n8n doit rester privé. Les nouvelles exécutions ne conservent pas leur corps ni leurs en-têtes. Les identifiants et statuts restent disponibles.

Le worker réserve les événements SQL, les remet à n8n et vérifie le reçu métier final. Cinq tentatives maximum, temporisation exponentielle, réservation avec expiration. Les notifications sont internes à InfiMatch : aucun email, Slack ou Teams n'est envoyé.

## API et parcours

Le contrat exporté est [docs/openapi.json](docs/openapi.json). La documentation servie est régénérée au démarrage.

1. GET /api/v1/auth/csrf : conserver le cookie et csrfToken.
2. Pour toute écriture utilisateur, envoyer le cookie, `Origin` égal à APP_ORIGIN et `X-CSRF-Token`.
3. POST /auth/register ou /auth/login renouvelle la session et retourne un nouveau csrfToken.
4. Infirmier : /profile, /profile/rpps, /me/matches, /listings/search, /me/favorites, /me/applications, /me/history.
5. Entreprise : /organizations/:id, /staffing-requests, /missions, /missions/:id/applications et /missions/:id/candidates.
6. L'agence affecte via POST /missions/:id/assignments avec applicationId et `Idempotency-Key`.
7. La confirmation se consulte via /assignments/:id/confirmation puis se télécharge avec la session sur /me/documents/:document_id.

Les routes sont préfixées par /api/v1. Les filtres de recherche utilisent un corps JSON validé sur POST /listings/search. Les dates comportent un décalage UTC explicite ; les intervalles sont semi-ouverts. Les montants sont en EUR bruts par heure. Une mission correspond à un poste continu.

L'inscription entreprise crée une organisation isolée. Pour autoriser une liaison de démonstration supplémentaire :

```powershell
node backend/dist/cli.js link-organizations --agency UUID_AGENCE --establishment UUID_ETABLISSEMENT
```

FINESS ne donne jamais accès à une organisation existante. L'établissement ne peut pas valider l'affectation finale.

## Accès externes

Renseigner localement RPPS_API_KEY et FT_CLIENT_ID / FT_CLIENT_SECRET dans .env. Ne pas transmettre ces clés dans une conversation ou un commit.

```powershell
node backend/dist/cli.js import-offers --dry-run --limit 50
node backend/dist/cli.js import-offers --limit 50
```

Sans accès ANS : PENDING, candidature/affectation interdites. Sans accès France Travail : échec explicite, aucune acquisition réelle revendiquée et aucune suppression des anciennes offres. Les simulations de fournisseurs dans les tests ne constituent pas une preuve d'accès public réel.

Références vérifiées : [ANS, accès API](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/getting-started/get-api-key.html), [recherche Practitioner](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/resources/practitioner.html), [identifiant RPPS FR Core](https://hl7.fr/ig/fhir/core/2.2.0/StructureDefinition-fr-core-practitioner.html), [catalogue France Travail](https://francetravail.io/produits-partages/catalogue/offres-emploi/documentation).

## Vérifier

Les bases, n8n, ses workflows publiés et l'API sur le port 3100 doivent être démarrés pour la recette fonctionnelle. Les tests créent des données fictives ; utiliser l'environnement local dédié InfiMatch.

```powershell
npm test
npm run test:integration
npm run verify
npm run check:secrets
```

verify exécute typecheck, build et coverage et enregistre les sorties dans docs/proofs. Le rapport HTML est généré dans docs/proofs/coverage/index.html. Les tests des workflows interrogent le vrai n8n local et vérifient notifications, reçus SQL et document privé. Le processus API appelé par n8n est distinct du processus instrumenté : ses lignes ne sont pas comptabilisées dans cette couverture.

## Historique et récupération

- [Décisions de conversation](docs/history/DISCUSSION.md), [journal de réalisation](docs/history/IMPLEMENTATION.md), [reprise et écarts](docs/REPRISE_BACKEND_V1.md).
- Git conserve les changements et leurs commits.
- Après un commit et avec un arbre Git propre, `npm run snapshot` crée et vérifie un bundle dans backups/.
- Restaurer le code dans un **nouveau dossier** avec `git clone CHEMIN_DU_BUNDLE NOUVEAU_DOSSIER`.
- Le bundle exclut .env, les dépendances, les bases et les fichiers privés. Les dumps de bases et les clés nécessitent une sauvegarde séparée.
- Un dump PostgreSQL et sa restauration dans infimatch_restore_20260914 ont été vérifiés. La restauration complète MongoDB + fichiers + clés + n8n reste à valider.

Les justificatifs utilisent AES-256-GCM, un nonce aléatoire et un contexte lié à leur identifiant. Les fichiers sont privés dans data/documents. DOCUMENT_KEY_VERSION vaut 1 par défaut ; lors d'une rotation, les anciennes clés sont fournies par DOCUMENT_KEY_V1, etc. Ne pas retirer une ancienne clé tant que des documents l'utilisent. Aucun mécanisme ne sauvegarde en clair en cas d'échec. Le RIB de démo emploie un identifiant volontairement non bancaire comportant DEMO ; il est masqué en lecture.

Compose est un environnement local, avec ports liés à 127.0.0.1. HTTPS/TLS interservices, rôles SQL/Mongo de production et restauration complète ne sont pas encore validés : ne pas exposer ce déploiement tel quel sur Internet.

## Paramètres et récupération après interruption

MATCHING_RETENTION_DAYS configure la rétention des explications (30 par défaut, entre 1 et 365). MATCHING_WEIGHTS_JSON permet une configuration C/Z/D/E totalisant 1 ; l'empreinte des pondérations entre dans la version visible des règles. Une explication d'une ancienne version est signalée périmée.

Les recommandations et candidats utilisent limit (20 par défaut, maximum 50) et offset ; le classement porte sur l'ensemble des résultats parcourus par lots. Les distances des décisions utilisent PostGIS comme la recherche.

Après une interruption pendant l'enregistrement d'un fichier, exécuter :

```powershell
node backend/dist/cli.js reconcile-documents --minimum-age-minutes 5
```

La commande ne rend READY qu'un fichier dont le chiffrement et la taille ont été vérifiés. Un fichier absent, une clé manquante ou un tag invalide laisse le document en attente. Le rapport livré est aussi disponible dans [coverage-report.zip](docs/proofs/coverage-report.zip).

## Contrat client apres recette V1

Les creations/modifications/transitions de mission, candidatures et creations de besoins requierent `Idempotency-Key` en plus du cookie, Origin et CSRF. Generer une cle pour une nouvelle commande ; reutiliser la meme pour son rejeu reseau. Une cle absente donne 400, un contenu different avec la meme cle donne 409. Les droits sont controles a nouveau sur rejeu.

Les listes secondaires acceptent `limit` (20 par defaut, maximum 50) et `offset` (0 a 10000), en conservant leur forme de reponse. Les propositions classent seulement les dossiers admissibles. `excluded` indique le nombre exclu et `rppsStatus` explique la situation RPPS du professionnel.

Apres cinq echecs, un evenement est signale EXHAUSTED. Reprise explicite et tracee :

```powershell
node backend/dist/cli.js retry-outbox --event UUID_EVENEMENT
```

Le depot et le remplacement documentaire ne disposent pas encore du meme protocole complet d'idempotence. Voir le bilan pour les autres limites.

## Fournisseurs et sauvegarde GitHub

[Acquisition reelle et FINESS](docs/ACQUISITION_REELLE.md). Le RPPS positif est demontre dans [la preuve ANS](docs/proofs/ans-fhir-positive.json), sans modification de profil reel.

Depot : https://github.com/lebretyves/Backend_Interimatch ; branche master. Apres verification et commit : `git push origin master`, puis `npm run snapshot`. Les cles, bases et fichiers locaux ignores ne sont pas sauvegardes par Git.


## Rectification France Travail du 15 septembre 2026

[Rectificatif du catalogue V1](docs/RECTIFICATIF_CATALOGUE_V1.md) et [contrat des offres externes](docs/OFFRES_EXTERNES_V1.md). Collecte multi-recherches, classement prudent, conservation des informations fournisseur et correspondance sans score complet. Lot Paris : 134 offres importees et rejeu sans doublon ; 120 IDE, 7 IADE, 1 IBODE, 6 non confirmees. Frontend et synchronisation exhaustive restent a completer.


## Comparaison partielle des annonces externes

Comparaison au profil connecte et option includeUncertainExternal implementees. Informations inconnues et indices restent distincts des incompatibilites connues. Aucun score externe complet. 71 tests reussis ; preuve complementaire avec offres reelles et profils fictifs dans docs/proofs/external-partial-live.json. [Explication a transmettre](docs/EXPLICATION_MATCHING_DONNEES_MANQUANTES.md) et [contrat API](docs/OFFRES_EXTERNES_V1.md). Integration frontend restante.


## Vault V1 et pr?paration V2 ? 15 septembre 2026

[Vault local : installation, acc?s, commandes et limites](docs/VAULT_V1.md). TLS, KV v2 persistant, AppRoles backend/infra s?par?s et audit install?s. `npm run start:vault` et `npm run worker:vault` chargent les secrets sans repli vers `.env`. Le mode historique et son `.env` restent pr?sents. 10 tests Vault et 55 tests unitaires backend r?ussis ; reprise apr?s red?marrage et sant? API v?rifi?es. La restauration int?grale et la rotation r?elle des SecretID ne sont pas d?clar?es valid?es.

[Dossier V2](V2/README.md) : p?rim?tre, backlog, architecture et recette pr?par?s ; aucune fonctionnalit? V2 d?velopp?e et aucun travail obligatoire V1 report?.


## 16 septembre 2026 ? R?cup?ration s?curit? et sessions

Les deux branches s?curit? sont int?gr?es au code local avec adaptations Google, Vault, migrations et frontend documents/RIB. 101 tests unitaires backend et 10 tests API frontend passent ; les deux compilations passent. Migrations et activation non effectu?es : Docker/Vault indisponibles. Les deux bugs documentaires et la recette compl?te restent ? traiter. Voir le [bilan apr?s r?cup?ration](docs/BILAN_RECUPERATION_SECURITE_2026-09-16.md). Les ?tats ant?rieurs sont historiques.


## S?curit? V1 activ?e ? 16 septembre 2026

Quota/confirmations, nettoyage concurrent et suspension corrig?s et test?s sur bases isol?es. Sauvegarde/restauration SQL, MongoDB, Vault et n8n v?rifi?e ; migrations locales appliqu?es avec compte distinct ; comptes applicatifs restreints ; HTTPS local https://localhost:8443. 118 tests backend et 10 tests Vault passent. Voir le [bilan actuel](docs/BILAN_SECURITE_LIVRAISON_V1_2026-09-16.md) pour les preuves, les commandes et les limites de livraison publique. Les anciens ?tats ? bugs ouverts ?, ? migrations non appliqu?es ? ou ? Docker indisponible ? sont historiques.

## Dernier lot V1

Voir [les sept évolutions parsing et frontend](docs/LIVRAISON_SEPT_EVOLUTIONS_V1.md), leur migration, la commande de recalcul et les limites de validation.


## Checkout authentification : frontend inclus

Le frontend de ce checkout est dans `frontend/`. Depuis la racine : `npm ci`, puis `npm run build`. Dans un second terminal : `cd frontend`, `npm ci`, `npm run dev`. Pour compiler le frontend : `npm run build` dans ce dossier. Le lanceur HTTPS local retrouve automatiquement `frontend/dist`. Les configurations et secrets prives sont a creer localement : ils ne sont pas livres dans Git.
