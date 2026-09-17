# Recommandations mixtes : fonctionnement valide

Choix du proprietaire le 17 septembre 2026 : deux groupes independants de trois cartes au maximum.

- Missions internes compatibles : prerequis stricts inchanges, score decroissant, publication (audit MISSION_OPEN) decroissante, debut puis identifiant. Seules les missions ouvertes et futures sont retenues. Aucune compensation des prerequis par un score.
- Offres externes France Travail / JobsPipe : offres actives non expirees, criteres connus compatibles en premier, puis date de publication fournisseur valide decroissante. Une date absente ou future n'est jamais remplacee par la date d'import. La mise a jour fournisseur est affichee separement. Les ecarts connus sont visibles ; il ne s'agit pas d'une eligibilite clinique certifiee.
- GET /api/v1/me/recommendations fournit les groupes separement et leurs etats. Une erreur d'un groupe ne supprime pas l'autre. Les profils incomplets recoivent une selection externe generale clairement annoncee.
- La disponibilite nocturne et les changements d'heure sont couverts par les tests. Les offres fermees, expirees, inactives et missions passees sont exclues. Le dedoublonnage d'import existant reste applique.
- Aucun stockage persistant des recommandations dans la PWA, ni score global invente pour les offres externes. Les cartes conservent les liens details et favoris.

Implementation : backend/src/listings/recommendations.ts, frontend/src/components/MixedRecommendations.tsx. Tests : integration/enterprise-flow.spec.ts, unit/recommendations.spec.ts, frontend/scripts/test-mixed-recommendations.mjs.

## Diagnostic historique avant modification

# Recommandations — diagnostic du 17 septembre 2026

Décision produit en attente. Le bloc `frontend/src/pages/Accueil.tsx` n’a pas été modifié dans ce lot : titre, sources, classement et trois cartes conservés.

## Chaîne réelle

`Accueil.tsx` → `services/market.ts` (`matches`, puis trois appels `detail`) → `GET /api/v1/me/matches` → `backend/src/matching/matching.module.ts` → PostgreSQL `mission`, `profile`, `assignment` → `domain/matching.ts`, `domain/rules.ts` et distance PostGIS. Les explications sont écrites dans MongoDB `MatchingRun`, avec versions du profil, de la mission et des règles ; l’API d’explication contrôle leur propriétaire et leur obsolescence.

Le bloc utilise seulement des missions internes, ouvertes et dont le début est futur. Ni France Travail, ni JobsPipe, ni liste statique n’alimente ces cartes. Des missions de démonstration éventuellement créées dans une base sont néanmoins des lignes de cette base : l’interface ne constitue pas une preuve de provenance réelle.

Le moteur exclut les profils non éligibles avant classement : qualification, RPPS, géographie/rayon, disponibilités, indisponibilités et chevauchements, horaires acceptés, compétences obligatoires et expérience. Les conditions cliniques supplémentaires dépendent de la qualification et du contexte bloc. Un score ne compense pas un prérequis bloquant.

Les poids par défaut sont C=0,45, Z=0,25, D=0,20, E=0,10 ; une configuration valide doit totaliser 1. Le tri est score décroissant, début de mission croissant puis UUID. La date de publication n’est pas un critère du tri actuel. Le frontend garde les trois premiers résultats. Il n’existe pas de remplacement silencieux par des offres externes ou incompatibles.

La qualification exacte est recherchée dans le tableau du profil. `validateProfile` exige la déclaration explicite d’IDE avec une spécialisation IADE/IBODE ; le parcours valide permet donc les missions IDE à ces professionnels, tout en conservant les autres prérequis. Aucune règle implicite supplémentaire n’a été ajoutée.

## États et limites

- Profil incomplet/RPPS en attente : les missions peuvent toutes être exclues. Le bloc comporte un état vide ; l’ensemble du tableau de bord dépend encore de plusieurs requêtes et utilise un état d’erreur commun.
- Offre passée/fermée : exclue à la sélection ; le détail et la candidature recontrôlent l’état métier. Une fermeture entre les requêtes peut provoquer une erreur récupérable.
- Source externe en panne : sans effet direct sur ce bloc, puisque ces sources ne sont pas utilisées. MongoDB indisponible : score calculé mais absence d’explication persistée explicitement indiquée par le backend.
- Doublons : un UUID interne n’est sélectionné qu’une fois. Le dédoublonnage France Travail/JobsPipe concerne l’import et la recherche générale, pas ces trois cartes.
- Cache : pas de cache persistant de recommandations ; résultats rechargés par `useRemote`. Les réponses authentifiées portent `no-store`. Le nouveau service worker ignore toutes les API.
- Dates : les cartes présentent les dates de mission. Elles ne doivent pas être interprétées comme dates de publication. Les offres externes distinguent import/provenance/expiration dans les données ; aucune date fournisseur absente ne sera inventée.
- Coût : le moteur parcourt les missions par lots de 100 et persiste les explications de la page demandée ; le frontend n’affiche que trois résultats. Réduire cette charge sans changer la sélection est une optimisation à mesurer séparément.

## Choix soumis au propriétaire

| Option | Avantage | Limite |
|---|---|---|
| Offres récentes personnalisées | Parcours centré sur les possibilités du professionnel | Peu ou pas de résultats avec profil incomplet ; les annonces externes incomplètes ne peuvent pas prouver l’éligibilité |
| Offres récentes générales | Donne rapidement une vue du marché | Nécessite un titre non personnalisé ; aucune promesse de compatibilité |
| Présentation mixte, recommandée | Sépare les missions internes éligibles des annonces externes récentes | Deux groupes à garder compacts et explicitement nommés |

Questions envoyées : option retenue ; sources incluses ; priorité entre pertinence, date de publication réelle et proximité du début. Sans réponse, le lot reste inchangé, conformément aux deux documents du propriétaire.
