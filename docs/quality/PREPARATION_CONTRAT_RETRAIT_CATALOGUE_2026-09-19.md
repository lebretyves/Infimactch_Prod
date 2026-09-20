# Préparation du contrat et retrait des catalogues — 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

État : modifications locales, sans preuve de déploiement à ce stade. Recette frontend avec réponses API simulées ; les intégrations SQL du nouveau endpoint sont suivies séparément par l’agent backend.

## Préparation du contrat

Route privée `/affectations/:id/preparation-contrat`, liée depuis les affectations de GestionMission, CandidatureDetail et Historique. Les données mission, professionnel, employeur et établissement sont présentées en lecture seule. Les cinq champs de préparation restent facultatifs ; limite de 150 caractères pour le contact et 2 000 pour les autres champs. Seuls la version et ces champs sont envoyés à l’API.

L’édition exige `canEdit` et une affectation ACTIVE. Les missions annulées ou terminées restent consultables avec une explication. Le brouillon indique son état enregistré/non enregistré. Après conflit 409, la saisie est conservée ; seule l’action explicite de rechargement la remplace. Une fermeture de page avec modifications non enregistrées déclenche l’avertissement navigateur. L’enregistrement ne produit aucune signature, aucun contrat légal ni email.

Composition : identité bleue/cyan existante, récapitulatif et formulaire en deux colonnes sur bureau, une colonne sur mobile. Les champs manquants précèdent le brouillon. Chargement, erreur, reprise, consultation et concurrence ont des états dédiés. Route privée couverte par no-store et noindex ; aucun ajout au sitemap.

## Retrait des démonstrations

Pages ApercuAnnonces et Catalogue ainsi que leurs feuilles de style supprimées. Les URL `/catalogue` et `/apercu-annonces` redirigent vers l’accueil : remplacement d’historique côté React et redirection permanente Vercel, sous-chemins inclus côté Vercel. La vraie recherche `/missions` reste disponible.

114 anciens assets de galerie supprimés des fichiers publics, soit 16 890 801 octets. Leur historique reste dans Git. Le script historique de capture écrit désormais dans `frontend/docs/proofs/catalogue-archives`, hors publication. L’ancien guide est explicitement marqué comme archive. Aucun lien vers les deux anciennes pages n’a été trouvé dans les composants de navigation actifs.

## Vérifications réellement exécutées

- Build frontend et TypeScript : PASS.
- `npm test --prefix frontend` : 32 tests PASS, dont 3 sur les règles du brouillon.
- `npm run test:seo --prefix frontend` : 5 pages publiques, 21 routes privées, règle aide et retrait catalogue PASS. Contrôle des fichiers et de la configuration, pas de l’indexation Google.
- `npm run test:pwa --prefix frontend` : 4 tests PASS ; les anciens chemins consultent le réseau et sa redirection, jamais une galerie en cache.
- Recette Playwright locale avec API interceptée : 31 contrôles PASS. Employeur sauvegarde/version, conflit 409, saisie conservée et rechargement explicite ; intérimaire, établissement, annulation et fin en lecture seule ; chargement et erreur avec reprise. Largeurs 320, 768 et 1440 : aucun débordement horizontal. Deux redirections React vérifiées.

Preuves de cette recette : `E:/Interimatch/audits/2026-09-19-contract-preparation/browser.json`, harness `browser.cjs`, captures `contract-320.png`, `contract-768.png`, `contract-1440.png`. Données intégralement fictives, aucun accès aux comptes ou bases de production.

Limites : évaluation visuelle indépendante en cours ; redirections HTTP Vercel vérifiées dans la configuration, pas sur un nouveau déploiement. Pas de recette de signature ou d’envoi contractuel : ces fonctions ne font pas partie de cette page.