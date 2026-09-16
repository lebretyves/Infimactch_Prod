# Mise en ligne de l application complete

Le depot contient backend/, frontend/, infra/, scripts/, workflows/ et la documentation. Les fichiers .env, secrets Vault, bases, documents utilisateurs et sauvegardes restent prives.

## Frontend Vercel

Importer ce depot, branche Backend. Root Directory : frontend. Framework : Vite. Installation : npm ci. Build : npm run build. Output : dist. Le fichier frontend/vercel.json configure les routes de navigation. Les chemins /api ne sont pas remplaces par du HTML.

Le projet Vercel existant detecte comme backend ne change pas automatiquement de Root Directory lorsque le frontend est ajoute. Creer un projet frontend distinct ou modifier explicitement ce parametre.

## Services encore locaux

PostgreSQL, MongoDB, stockage documentaire, worker et automatisations sont uniquement sur le PC. Leur code de configuration est fourni, mais ils ne sont pas heberges par une copie Git. Le backend necessite des services accessibles depuis son hebergement, les migrations et les variables privees de .env.example. Ne pas recopier les adresses localhost en production.

Pour le frontend, conserver /api/v1 et configurer un proxy /api vers le futur backend HTTPS sur la meme origine, afin de conserver les sessions par cookie. La destination du proxy sera ajoutee lorsque le backend en ligne sera disponible. APP_ORIGIN doit correspondre au domaine frontend final. Tester CSRF, cookies, Google et telechargements sur cette adresse.

Ne jamais placer des secrets dans VITE_ : ces valeurs sont publiques. Ne pas utiliser un stockage temporaire Vercel comme stockage durable des documents. Le worker et les taches planifiees locales necessitent un hebergement adapte.

## Statut

Copie du code complete ; mise en ligne fonctionnelle de bout en bout non realisee. Dernier lot backend encore en validation. Aucun frontend issu des deux commits refuses n est reintroduit : la version copiee est celle conservee dans main.
