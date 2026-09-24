# Installation locale complète


Prérequis : Node.js 24, npm, Git et Docker avec Compose (Docker démarré). Les commandes ci-dessous fonctionnent dans PowerShell et dans un terminal Linux/WSL. Les exécuter depuis la racine du clone, sauf indication contraire.

### Première installation

```sh
npm ci
npm ci --prefix frontend
npm run setup
```

Avant de continuer, ouvrir le fichier `.env` créé à la racine et vérifier ces réglages :

```dotenv
NODE_ENV=development
PORT=3100
APP_ORIGIN=http://127.0.0.1:5173
ADMIN_ORIGIN=http://127.0.0.1:5175
DEMO_OPTIONAL_RPPS=false
```

`APP_ORIGIN` est l’origine du navigateur, pas celle de l’API. Utiliser `127.0.0.1` pour ouvrir l’application et l’administration : mélanger `localhost` et `127.0.0.1` provoque des différences d’origine et peut bloquer les sessions/CSRF. Vite transmet `/api` à `http://127.0.0.1:3100`. Ne pas désactiver les contrôles CSRF pour contourner une mauvaise configuration.

Pour une démonstration scolaire sans RPPS vérifié, choisir explicitement `DEMO_OPTIONAL_RPPS=true`. Ce réglage ne vérifie pas le profil. `setup` conserve un `.env` existant : après une mise à jour du dépôt, corriger les origines manuellement et redémarrer l’API.

Vérifier que `DATABASE_URL` et `MONGODB_URI` ciblent les conteneurs locaux (ports 55432 et 57017). Les migrations, le seed et les tests d’écriture suivants ne doivent pas viser la production.

```sh
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run db:migrate
npm run finess:import
npm run seed -w backend
npm run build
npm run start -w backend
```

Dans un deuxième terminal, à la racine :

```sh
npm run dev --prefix frontend
```

Dans un troisième terminal, à la racine :

```sh
npm run dev:admin --prefix frontend
```

| Service local | Adresse |
| --- | --- |
| Application | http://127.0.0.1:5173 |
| Administration | http://127.0.0.1:5175 |
| Santé API | http://127.0.0.1:3100/api/v1/health |
| OpenAPI interactif | http://127.0.0.1:3100/api/docs |
| n8n local | http://127.0.0.1:55678 |

### Premier administrateur local (OWNER)

Créer d’abord un compte dans l’application locale. Dans un autre terminal à la racine, remplacer l’adresse ci-dessous par celle de ce compte :

```sh
npm run admin:bootstrap:local -- votre-adresse@example.com
```

Cette commande utilise uniquement le `.env` de ce clone. Elle exige le mode développement et la base Docker locale `infimatch` sur le port 55432 ; elle refuse un second bootstrap si un administrateur existe déjà. Elle ne contacte pas Vault ni la production.

Ouvrir le fichier privé `data/admin/first-local-owner-invitation.json`, puis l’administration locale. Choisir « J’ai reçu une invitation », saisir l’adresse et le code, puis suivre la création du mot de passe administrateur et l’enrôlement MFA. Conserver les codes de secours. L’invitation expire après 24 heures ; aucun email d’invitation n’est envoyé automatiquement. Le fichier privé n’est pas à publier. Une fois connecté, inviter les autres administrateurs depuis l’interface.

Le bootstrap de production suit une [procédure distincte](quality/ADMIN_PSC_EXPLOITATION.md).

### Démarrage quotidien

Conserver le `.env` et les volumes Docker. Après arrêt du poste, redémarrer les services, puis l’API :

```sh
docker compose --env-file .env -f infra/compose.yaml --profile automation up -d
npm run start -w backend
```

Ouvrir deux autres terminaux pour `npm run dev --prefix frontend` et `npm run dev:admin --prefix frontend`. Après modification du backend, relancer `npm run build`, ou utiliser `npm run dev` pour la recompilation automatique. Ne pas rejouer le seed ou le bootstrap OWNER à chaque démarrage. Après récupération de nouveaux commits, installer les dépendances si les fichiers lock ont changé et appliquer les nouvelles migrations locales avant de relancer l’API.

Pour arrêter les conteneurs sans effacer leurs données :

```sh
docker compose --env-file .env -f infra/compose.yaml --profile automation stop
```

### Automatisations et services externes

Le démarrage de n8n local ne configure pas ses workflows ni leurs connexions. Les imports externes, Discord et SMTP2GO nécessitent leurs propres identifiants et destinations. Voir les [automatisations](AUTOMATISATIONS.md) et la [configuration des services](quality/CONFIGURATION.md). L’application locale de base peut démarrer sans ces services ; leurs fonctions ne sont alors pas opérationnelles. Le worker `npm run worker`, après compilation, traite les événements de la base configurée : ne le lancer que lorsque les destinations locales sont vérifiées.

Le [guide frontend](../frontend/README.md) complète les commandes de développement. Les documents référencés ici se trouvent dans `docs/` sur les deux branches principales ; `docs_intern/` appartient aux anciens états du dépôt Epitech.


