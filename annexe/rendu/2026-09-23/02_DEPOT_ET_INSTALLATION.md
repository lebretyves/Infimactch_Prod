# Dépôt, installation et lancement
Le [README principal](../../../README.md) décrit l'architecture. Cette synthèse reprend ses commandes ; elle ne prétend pas qu'une installation vierge a été refaite pendant cette rédaction.

Prérequis : accès GitHub au dépôt privé, Node.js 24, npm, Git, Docker et Compose.
~~~powershell
git clone https://github.com/EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1.git
cd D-WEB-901-PAR-9-1-InteriMatch-1
git checkout main
npm ci
npm ci --prefix frontend
npm run setup
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run finess:import
npm run seed -w backend
npm run build
npm run start -w backend
~~~
Autre terminal :
~~~powershell
npm run dev --prefix frontend
~~~
Application : http://127.0.0.1:5173 ; santé API : http://127.0.0.1:3100/api/v1/health ; documentation API : http://127.0.0.1:3100/api/docs ; n8n local : http://127.0.0.1:55678.

Vérifier la destination locale avant migration et seed. FINESS nécessite un accès réseau. Les services externes doivent être configurés séparément.

## Poste déjà équipé de Vault
Suivre le [guide Vault](../../VAULT_V1.md) sans réinitialiser le coffre. Les commandes prévues sont npm run start:vault et npm run vault:infra. Les configurations privées ne font pas partie du rendu.

## Tests
~~~powershell
npm run coverage:unit
npm test --prefix frontend
npm run test:isolated
~~~
La dernière commande prépare les services Docker de test isolés. Ne pas remplacer leur configuration par les bases de production.

## Arborescence
backend/src : API et règles ; backend/test/unit et integration : tests ; frontend : site et administration ; workflows : modèles de recette ; annexe/n8n/published-20260923 : exports publiés ; scripts : imports et exploitation ; annexe/proofs : preuves datées.
