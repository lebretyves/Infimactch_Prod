# Agenda matin / après-midi / nuit — 16 septembre 2026

## Fonctionnement

- Heure de Paris : matin 06 h–14 h, après-midi 14 h–22 h, nuit 22 h–06 h le lendemain. Horaires validés par l'utilisateur.
- Chaque jour possède trois boutons, en vue semaine et mois. Cycle : non renseigné → disponible (vert) → indisponible (rouge) → non renseigné. Chaque clic est enregistré ; les couleurs sont accompagnées de libellés accessibles.
- Le formulaire multijours permet de choisir plusieurs créneaux et l'un des trois états, sans saisir d'heures.
- Les horaires partiels antérieurs sont affichés explicitement. Ils ne sont pas arrondis. Un clic sur un créneau partiel le rend entièrement disponible.
- Une nuit est rattachée au jour de son début. Les changements d'heure de Paris sont respectés, même si le navigateur utilise un autre fuseau.
- Les missions confirmées conservent leur lien et leur affichage distinct. Une modification rendant leur disponibilité incompatible est refusée.

## Backend et cohérence

`PATCH /api/v1/profile/availability` accepte `{ changes: [{ start, end, state }] }`, avec `state` parmi `available`, `unavailable`, `unset`.

Chaque action retire l'intervalle ciblé des deux listes, puis le place dans l'état choisi, sauf pour « non renseigné ». Les parties extérieures sont conservées et les intervalles voisins de même état sont fusionnés. Exemple : disponibilité 06–22 + indisponibilité 14–22 donne disponibilité 06–14 et indisponibilité 14–22.

La transaction verrouille le profil et ne modifie que les disponibilités. Identité, qualifications, RPPS, expérience et mobilité restent conservés. Les doubles clics simultanés sont bloqués côté interface et les changements indépendants sont appliqués côté serveur sans remplacer tout le profil.

Les anciennes déclarations contradictoires sont normalisées à la lecture, avec priorité à l'indisponibilité, sans réécriture massive des comptes. Toute nouvelle sauvegarde produit des listes sans chevauchement. Les écritures via l'ancien PUT du profil et l'inscription suivent aussi cette règle.

Limites explicites : 200 changements par requête et 200 périodes distinctes par état conservé. Un dépassement est refusé sans tronquer ni enregistrer partiellement les données.

## Validation

- 83 tests unitaires backend réussis, dont huit nouveaux tests sur le découpage, les frontières, les changements d'état, les nuits et 150 modifications comparées à un modèle de référence.
- 14 contrôles dédiés via API et PostgreSQL : sous-période, trois cycles répétés, nuit, conservation des autres champs, mission confirmée, validations, modifications simultanées, ancien PUT, anciennes données, limite atomique, isolation des comptes et authentification.
- 21 assertions sur les créneaux frontend et les changements d'heure sous Europe/Paris, America/Los_Angeles et Asia/Tokyo.
- 10 tests existants du client API réussis.
- 16 contrôles navigateur sur l'application et le backend réels isolés, avec enregistrements/rechargements répétés, matin/nuit distincts, formulaire multijours, panne/réessai, doubles clics, mission confirmée, vue mois/semaine, clavier, suppression et mobilité.
- Contrôle sans débordement horizontal à 1440, 768, 375 et 320 px.

Tests exécutés dans une transaction SQL annulée, avec sessions en mémoire : aucun compte utilisateur modifié.

## Fichiers et preuves

Frontend : `src/pages/Calendrier.tsx`, `Calendrier.module.css`, `src/lib/availabilitySlots.ts`, `src/services/profile.ts`, `src/services/api.ts`.
Backend : `backend/src/domain/availability.ts`, `backend/src/profiles/profiles.module.ts`, `backend/test/unit/availability.spec.ts`.

Rejouer les tests frontend : `npm run test:availability` et `npm test`. Test API/base : `node --use-system-ca scripts/test-availability-slots.mjs` depuis InfiMatch.

Preuves navigateur : `annexe/proofs/agenda-slots/browser.json`. Preuves backend : `InfiMatch/annexe/proofs/agenda-slots/backend.json`. Catalogue : vues semaine et mois.

Compilation finale TypeScript/Vite réussie, API locale relancée et santé vérifiée. Évaluation visuelle indépendante : PASS après amélioration de la largeur, de la lisibilité et de l'alignement des créneaux. Catalogue actualisé : vues semaine et mois.
