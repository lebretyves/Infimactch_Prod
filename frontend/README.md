# Interface InfiMatch

Interface React 19 / TypeScript / React Router 7 / Vite pour les intérimaires, établissements et agences, avec une administration compilée séparément. Elle communique avec l’API réelle par `src/services/api.ts`; les fixtures et le build de démonstration ne décrivent pas le fonctionnement de production.

## Parcours

Le routeur `src/router.tsx` définit les écrans publics, l’inscription et la connexion, la recherche et les fiches missions, les profils, disponibilités, candidatures, affectations, documents et notifications. Les droits et validations restent contrôlés côté API. L’administration utilise son propre point d’entrée et client API.

Le [bilan des 42 scénarios](../docs/quality/MATRICE_42_TESTS_2026-09-19.md) indique ce qui est déployé, testé localement ou encore à valider. L’ancien inventaire d’écrans et les affirmations de simulation par défaut sont conservés dans [le README historique](../docs/history/README_FRONTEND_AVANT_2026-09-19.md).

## Développement

Depuis ce dossier, avec l’API locale démarrée :

```powershell
npm ci
npm run dev
```

Vite écoute sur `127.0.0.1:5173`. Le proxy `/api` cible par défaut `http://127.0.0.1:3100`; vérifier `vite.config.ts` et l’environnement pour une autre configuration. Les cookies de session et les jetons CSRF sont gérés par le client API. Aucun secret serveur ne doit être introduit dans une variable frontend ou dans le bundle.

## Commandes

```powershell
npm test
npm run typecheck
npm run build
npm run build:admin
npm run preview
npm run audit:a11y
npm run screenshots
```

Les recettes navigateur exigent un serveur démarré et, selon le script, des comptes fictifs et une API locale. Ne pas les diriger vers la production sans périmètre de recette explicite. `npm test` ne lance pas toutes les recettes OCR, caméra, disponibilité et inscription; consulter les scripts de `package.json` et la matrice des preuves.

## Données et documents

Le matching affiché provient du backend. Les préférences de recherche et la mobilité du profil ont des usages distincts. Les PDF de confirmation et d’annulation sont produits côté backend et téléchargés avec les droits du compte.

L’OCR CV/RIB utilise PDF.js et Tesseract dans le navigateur avec ressources préparées localement. L’utilisateur relit les propositions avant validation. L’extraction de CV ne constitue ni une certification de diplôme ni une prise en charge complète de tous les formats.

## Design et qualité

Les styles utilisent CSS Modules et les variables de [DESIGN.md](DESIGN.md), sans framework CSS. Les captures et audits automatiques fournissent des preuves ciblées; ils ne démontrent pas à eux seuls une conformité RGAA complète. Clavier, lecteurs d’écran, zoom, caméra mobile et erreurs réseau restent des scénarios de recette distincts.

Les pages publiques disposent de traitements SEO dédiés; les pages privées ne doivent pas exposer les données de compte à l’indexation. Les évaluations SEO et accessibilité doivent conserver leur date, leurs routes et leurs conditions de mesure.
