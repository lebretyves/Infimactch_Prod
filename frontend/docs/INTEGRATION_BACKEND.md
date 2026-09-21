# Raccordement de l'interface à l'API

Référence au 21 septembre 2026. Les parcours utilisent les services du backend ; leur présence dans le code ne vaut pas recette complète en production.

## Développement local

Le frontend Vite utilise `http://127.0.0.1:5173`. Le proxy `/api` cible l'API locale sur le port 3100 par défaut. `APP_ORIGIN` doit correspondre à l'origine réelle du navigateur. Suivre [l'installation à la racine](../../README.md) puis, depuis `frontend/`, utiliser `npm run dev`.

`npm run typecheck` et `npm run build` vérifient l'interface. Les recettes d'intégration nécessitent leurs serveurs et des comptes fictifs autorisés ; ne pas les diriger implicitement vers la production.

## Contrats et parcours

- `src/services/api.ts` : cookies de session, CSRF, erreurs et idempotence.
- `src/services/auth.ts` : authentification et inscription ; récupération dans les pages dédiées.
- `src/services/market.ts` et `profile.ts` : missions, candidatures, profils et préférences.
- `src/router.tsx` : routes réellement exposées, protection des pages connectées et écran d'erreur public.
- Documents et vérifications : justificatifs, RPPS et RIB facultatif.
- Notifications : activité interne, préférences et configuration Discord facultative après inscription.
- Administration : point d'entrée et client API distincts, droits et MFA côté serveur.

Google n'est proposé que si le backend fournit sa configuration publique. La première association suit les contrôles du compte InfiMatch ; elle ne nécessite jamais de saisir un mot de passe Google dans un formulaire InfiMatch.

## Production

Site, API et administration ont des déploiements Vercel distincts. Les bases sont Supabase/PostGIS et MongoDB Atlas ; les variables publiques du frontend ne doivent contenir aucun secret serveur. Voir [l'architecture](../../docs_intern/SCHEMA_ARCHITECTURE_V1.md), [le déploiement](../../docs_intern/DEPLOIEMENT_PRODUCTION.md), [Google](../../docs_intern/FRONTEND_AUTH_GOOGLE.md) et [le guide utilisateur](../../docs_intern/GUIDE_UTILISATEUR.md).
