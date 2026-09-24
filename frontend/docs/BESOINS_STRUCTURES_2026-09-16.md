# Besoins de personnel structurés — 16 septembre 2026

> Note historique : depuis le 21 septembre 2026, ce formulaire séparé est retiré. Le parcours courant est décrit dans [Création et suivi des missions](../../annexe/ENTERPRISE_FOLLOW_UP.md). Les résultats ci-dessous concernent la version du 16 septembre.

## Correction

La page `/besoins` ne permettait auparavant de sauvegarder qu’un intitulé et une description. Le formulaire, le contrat API et PostgreSQL prennent maintenant en charge :

- établissement demandeur, intitulé, description et adresse du lieu de travail ;
- dates et heures de début et de fin, en heure de Paris ;
- raccourcis matin 06–14, après-midi 14–22 et nuit 22–06 le lendemain ;
- qualification IDE, IADE ou IBODE et service issu du référentiel backend ;
- nombre de professionnels, population, type de bloc et spécialité éventuelle ;
- compétences obligatoires et expérience minimale dans le service.

Les heures proposées restent modifiables. La période doit commencer dans le futur et se terminer après son début. Un besoin décrit une période continue : il ne génère pas un planning récurrent.

## Parcours et droits

L’établissement crée et modifie ses besoins. La modification recharge le besoin sauvegardé. Les anciennes demandes sans critères restent consultables avec « Critères à compléter » et peuvent être complétées par « Modifier le besoin ».

Une agence liée à l’établissement voit les détails et peut sélectionner « Préparer une mission ». Le formulaire de mission reprend les critères du besoin et l’établissement. La rémunération et les coordonnées géographiques restent à compléter ; aucune valeur n’est inventée.

Chaque brouillon concerne un professionnel, même si le besoin porte sur plusieurs personnes. Le nombre demandé est rappelé à l’agence. Il n’y a ni création automatique de plusieurs missions, ni publication automatique, ni synchronisation de l’état du besoin avec les missions créées.

Les annonces externes importées et les besoins internes restent deux sources distinctes. Un besoin n’est pas envoyé à France Travail.

## Backend et conservation

- POST `/api/v1/staffing-requests` : création avec détails obligatoires.
- GET `/api/v1/staffing-requests` et GET `/api/v1/staffing-requests/:id` : lecture limitée aux établissements propriétaires et agences liées.
- PUT `/api/v1/staffing-requests/:id` : modification par l’établissement propriétaire uniquement, sans transfert vers un autre établissement.
- Création et modification utilisent les clés d’idempotence existantes et produisent un événement d’audit.
- Migration additive `StaffingRequestDetails1789380600000` : colonnes `details` JSONB nullable et `updated_at`.
- Migration locale appliquée ; le besoin existant a été conservé, avec vérification du nombre de lignes et de l’empreinte des champs antérieurs.
- Dates normalisées en UTC côté serveur et affichées explicitement en heure de Paris. Les heures locales inexistantes ou ambiguës au changement d’heure sont signalées.

## Validation réalisée

- 90 tests unitaires backend réussis.
- 11 contrôles API réussis : création, répétition idempotente, qualifications, trois modifications, droits, retrait de lien agence, invalidités, demande ancienne et compatibilité avec un brouillon de mission.
- 14 contrôles navigateur réussis : formulaire à 1440/375/320 px, nuit, échec réseau puis nouvel essai, double clic, persistance de tous les critères, trois modifications, annulation, dates inversées, ancienne demande, agence et brouillon réellement sauvegardé.
- Test navigateur exécuté avec le fuseau America/Los_Angeles : les horaires restent ceux de Paris.
- 20 assertions sur les conversions de dates et 10 tests du client API réussis.
- Builds frontend et backend réussis. Vite signale le volume du paquet JavaScript principal, sans échec de compilation.
- Évaluation visuelle indépendante : PASS.
- Comptes et données des tests API/navigateur isolés puis annulés par rollback ; aucun compte de test conservé.

Preuves :

- `../../InfiMatch/annexe/proofs/staffing-details/backend.json`
- `proofs/staffing-details/browser.json`
- `proofs/staffing-details/form-1440.png`, variantes 375/320 px et vues agence/préparation de mission.

Catalogue mis à jour : besoins établissement, besoins agence, mission préremplie depuis un besoin. 56 états et 112 captures au total. Ces trois états ont été recapturés sans erreur ni débordement ; deux débordements déjà présents sur les listes de missions des organisations restent signalés dans le rapport global, hors de cette correction.

## Fichiers principaux

Frontend : `src/pages/Besoins.tsx`, `Besoins.module.css`, `MissionForm.tsx`, `src/services/needs.ts`, `src/lib/parisDateTime.ts` et traitement de l’erreur métier dans `src/services/api.ts`.

Backend : `backend/src/organizations/need.dto.ts`, `organizations.module.ts`, `backend/src/database/staffing-request-details.ts`, enregistrement de migration et documentation OpenAPI.

Tests réutilisables : `InfiMatch/scripts/test-staffing-details.mjs`, `backend/test/unit/staffing-request.spec.ts`, `infiMatch-front-end/scripts/test-paris-datetime.mjs`.