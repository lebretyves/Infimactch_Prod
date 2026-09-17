# Diplômes et pagination des offres — 16 septembre 2026

## Corrections

- Suppression du champ libre « Intitulé du diplôme » dans l’inscription et le profil. La sélection IDE/IADE/IBODE porte un libellé complet, partagé entre les deux écrans. Les valeurs historiques `details.diploma` sont conservées.
- Les routes `GET /listings/external` et `POST /listings/search` renvoient désormais `items`, `total`, `limit`, `offset`. Le total et la page sont calculés dans la même requête SQL avec les mêmes critères, y compris lorsque la page est vide.
- Paramètre optionnel `q` limité à 150 caractères, recherche globale sur titre, service, localisation/adresse. Paramètres SQL liés ; caractères `%` et `_` littéraux. Les qualifications détenues continuent à limiter la recherche authentifiée.
- La page Missions présente le total, la plage et la page active, avec accès direct par numéros, ellipses, première/dernière page, précédent/suivant. La recherche est soumise explicitement et remet la page à 1. Filtres et page sont conservés dans l’URL ; une page trop élevée revient à la dernière page valide.
- Libellé France Travail lisible, filtres rangés, états vide/erreur/reprise. Le total concerne les offres présentes dans InfiMatch, pas toutes les annonces disponibles sur France Travail.
- En-tête connecté corrigé à 320 px : le prénom peut se raccourcir sans imposer une largeur excessive à toute la page.

## Validation

- Compilation frontend et backend réussie ; avertissement Vite préexistant sur le bundle >500 Ko.
- 65 tests unitaires backend et 9 tests client API réussis.
- 14 contrôles backend supplémentaires sur PostgreSQL en transaction READ ONLY : totaux, pagination stable, texte global, caractères littéraux, validation DTO et contrôleurs réels. Le profil qualifié est uniquement simulé en mémoire ; aucune fixture n’est insérée en base.
- HTTP réel via le proxy frontend : 184 offres uniques parcourues en quatre pages de 50 (34 sur la dernière), recherches filtrées, entrées invalides et page hors borne vérifiées.
- Navigateur isolé : pages 1/2/10, recherche d’une offre initialement en dernière page, qualification, retour navigateur, page9999, zéro résultat et reprise après erreur réussis. Vérifications 1440/768/375/320 px sans débordement.
- Trois enregistrements de profil simulés dans le navigateur : ancien diplôme conservé. Inscription passant à Mobilité avec diplôme sélectionné et année, sans champ texte redondant.
- Parcours navigateur connecté à l’API publique réelle testé avec identité/profil simulés localement : total184 et accès direct page2. Aucun compte ni donnée métier réels modifiés.
- Évaluation visuelle indépendante : PASS au second passage après la correction320px.
- Catalogue : huit captures actualisées, ordinateur/mobile pour inscription qualification, profil et les deux variantes candidat de la liste des offres.

## Fichiers et preuves

Backend : `src/listings/listing-page.ts`, `listings.module.ts`, `search.ts` ; contrôle reproductible `scripts/test-listing-pagination.mjs` à exécuter après `npm run build` avec Vault local disponible. Preuves : `docs/proofs/missions-pagination/backend-readonly.json` et `http.json`.

Frontend : `src/pages/Missions.tsx`, son CSS, `src/services/market.ts`, `src/data/professional.ts`, `src/pages/Profil.tsx`, `src/pages/inscription/Qualification.tsx`, `src/ui/MissionCard.tsx`, `src/layouts/AppLayout.module.css`, fixtures et aperçus catalogue. Preuves navigateur : `infiMatch-front-end/docs/proofs/missions-pagination/checks.json` et captures associées.

## Portée

Modifications actives en local, API relancée via le lanceur Vault existant. Aucun déploiement Vercel. La limite serveur préexistante d’offset10000 demeure ; le catalogue actuel est de184 offres. Cette intervention ne modifie pas l’import France Travail, les règles de candidature ni l’authentification Google. Les anciens débordements des listes entreprise/agence signalés dans le catalogue global ne sont pas couverts par cette correction candidat.
