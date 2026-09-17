# Deploiement autonome : etat constate et decisions

## Objectif

Application complete fonctionnant PC eteint : frontend, API, bases, documents, imports, matching, notifications et confirmations PDF.

## Etat verifie dans Vercel

Projet neotravel/infimactch-prod-backend : preset NestJS, Root Directory backend, Node 24, fichiers hors racine inclus. Aucun stockage raccorde visible. Le catalogue propose notamment Neon, Supabase, MongoDB Atlas et Blob. Aucune souscription effectuee.

## Travail necessaire

1. Deployer frontend et API avec routage /api sous la meme origine pour les cookies et CSRF ; conserver les routes SPA hors /api.
2. Provisionner PostgreSQL avec PostGIS et MongoDB, droits applicatifs limites et migrations via role operateur. Tester reseau, TLS et limites de connexions. Ne pas publier les secrets.
3. Remplacer le stockage local des documents par un stockage prive durable, en conservant chiffrement, autorisations, quotas, suppression apres commit et restauration.
4. Remplacer le worker en boucle permanente par des executions bornees et protegees, avec les verrous et garanties de reprise de l outbox.
5. Reporter les imports France Travail et JobsPipe selon les horaires Paris convenus, avec changement heure ete/hiver, sans doublons ni rattrapage des quotas.
6. Heberger n8n/Vault separement pour conserver la V1, ou decider explicitement de remplacer les workflows et le chargement Vault pour un fonctionnement centre sur Vercel.
7. Configurer maintenance, registre d effacement durable, sauvegardes et restauration cloud. Ne pas reutiliser le disque temporaire des fonctions.
8. Configurer domaine final, origine Google, emails, puis recette soignant/entreprise/agence, matching, PDF, sessions et droits.

## Decisions encore requises

Conservation de n8n/Vault ou remplacement ; offres d hebergement et couts exacts a presenter avant tout achat ; jeu de donnees a migrer. Le choix d un fournisseur de base doit verifier PostGIS et les besoins de sauvegarde, pas seulement son apparition au catalogue.

## Limites

Une copie Git ou un changement de Root Directory ne provisionne pas les services. La recette locale a reussi (162 tests backend et 12 frontend), mais cela ne valide pas le fonctionnement cloud. Aucune promesse de fonctionnement complet ni de cout nul avant validation des services.
