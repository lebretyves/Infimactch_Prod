# Recette des parcours client — 19 septembre 2026

## Résultat

**58 états et variantes, 174 contrôles de rendu** aux largeurs 320, 768 et 1440 pixels. Aucun échec de chargement final, aucune erreur JavaScript ni appel API sans fixture. Les 20 routes privées hors contrat sont couvertes ; la 21e, préparation du contrat, dispose de sa recette distincte de 31 contrôles.

Les réponses API et les sessions sont entièrement simulées dans un navigateur local. Aucun compte réel, aucune base et aucun envoi ne sont exercés par cette campagne. Les vérifications de permissions et la recette avec API réelle ont leurs preuves distinctes.

## Défaut trouvé et corrigé

Sur le profil candidat, le lien « Gérer mes disponibilités et ma mobilité » restait sur une seule ligne et portait le document à 366 pixels sur un écran de 320 pixels. Correction limitée à `frontend/src/pages/Profil.module.css` : piste de carte réductible et lien sur plusieurs lignes. Rejeu ciblé après compilation : **6/6 PASS**, sans débordement à 320, 375, 414, 768, 1024 et 1440 pixels. Aucun changement du matching ni des données.

## Inscription interactive

Trois parcours complets ont été exécutés : IADE à 1440 pixels, IBODE à 320 pixels, IADE + IBODE à 768 pixels. IDE est automatiquement coché et verrouillé ; son année 2015 et les années de spécialité 2017/2018 restent distinctes. Deux services IDE sont choisis, sans service imposé pour les spécialités. Les consentements sont obligatoires. Un premier retour API simulé en erreur conserve le formulaire ; la seconde tentative conduit à la confirmation et transmet le bon profil. La création réelle d’un compte et le contrôle RPPS ne sont pas prouvés par ces mocks.

## Calibration initiale conservée

Une première passe desktop comprenait 34 réussites et 24 échecs dus à des fixtures historiques obsolètes : endpoints absents, format de comparaison externe incorrect et ancien bouton horaire du formulaire besoin. Ces résultats sont conservés dans `report-desktop.json` et ne sont pas comptés comme des défauts produit ou des validations finales. Les fixtures ont été alignées sur les appels et types actuels sans modifier le produit pour les faire passer.

## Routes et états examinés

| État | Rôle / contexte | Route | Contrôle final |
|---|---|---|---|
| inscription-finess | public | `/inscription?espace=etablissement` | 3 largeurs PASS |
| inscription-google | public | `/inscription?google=1` | 3 largeurs PASS |
| inscription-compte | public | `/inscription` | 3 largeurs PASS |
| inscription-etablissement | public | `/inscription` | 3 largeurs PASS |
| inscription-agence | public | `/inscription` | 3 largeurs PASS |
| inscription-identite | public | `/inscription/identite` | 3 largeurs PASS |
| inscription-localisation | public | `/inscription/localisation` | 3 largeurs PASS |
| inscription-qualification | public | `/inscription/qualification` | 3 largeurs PASS |
| inscription-mobilite | public | `/inscription/mobilite` | 3 largeurs PASS |
| inscription-disponibilites | public | `/inscription/disponibilites` | 3 largeurs PASS |
| inscription-rib | public | `/inscription/rib` | 3 largeurs PASS |
| inscription-consentements | public | `/inscription/consentements` | 3 largeurs PASS |
| inscription-google-consentements | public | `/inscription/consentements` | 3 largeurs PASS |
| confirmation-candidat | candidat | `/inscription/confirmation` | 3 largeurs PASS |
| dashboard-candidat | candidat | `/accueil` | 3 largeurs PASS |
| missions-candidat | candidat | `/missions` | 3 largeurs PASS |
| missions-profil-incomplet | candidat | `/missions` | 3 largeurs PASS |
| mission-detail | candidat | `/missions/:id` | 3 largeurs PASS |
| offre-externe | candidat | `/missions/:id` | 3 largeurs PASS |
| candidater | candidat | `/missions/:id/candidater` | 3 largeurs PASS |
| candidatures | candidat | `/candidatures` | 3 largeurs PASS |
| candidature-suivi | candidat | `/candidatures/:id` | 3 largeurs PASS |
| calendrier | candidat | `/calendrier` | 3 largeurs PASS |
| calendrier-mois | candidat | `/calendrier` | 3 largeurs PASS |
| profil | candidat | `/profil` | 3 largeurs ; profil corrigé et revérifié à 6 largeurs |
| dossier | candidat | `/dossier` | 3 largeurs PASS |
| favoris | candidat | `/favoris` | 3 largeurs PASS |
| etablissement-public | candidat | `/etablissements/:id` | 3 largeurs PASS |
| historique | candidat | `/historique` | 3 largeurs PASS |
| confirmation-etablissement | etablissement | `/inscription/confirmation-etablissement` | 3 largeurs PASS |
| dashboard-etablissement | etablissement | `/accueil` | 3 largeurs PASS |
| missions-etablissement | etablissement | `/missions` | 3 largeurs PASS |
| gestion-etablissement | etablissement | `/gestion/missions/:id` | 3 largeurs PASS |
| organisation-etablissement | etablissement | `/organisation` | 3 largeurs PASS |
| besoins-etablissement | etablissement | `/besoins` | 3 largeurs PASS |
| confirmation-agence | agence | `/inscription/confirmation-etablissement` | 3 largeurs PASS |
| dashboard-agence | agence | `/accueil` | 3 largeurs PASS |
| missions-agence | agence | `/missions` | 3 largeurs PASS |
| gestion-agence | agence | `/gestion/missions/:id` | 3 largeurs PASS |
| organisation-agence | agence | `/organisation` | 3 largeurs PASS |
| besoins-agence | agence | `/besoins` | 3 largeurs PASS |
| mission-nouvelle | agence | `/gestion/missions/nouvelle` | 3 largeurs PASS |
| mission-depuis-besoin | agence | `/gestion/missions/nouvelle?besoin=00000000-0000-4000-8000-000000000017` | 3 largeurs PASS |
| mission-modifier | agence | `/gestion/missions/:id/modifier` | 3 largeurs PASS |
| mission-brouillon | agence | `/gestion/missions/:id` | 3 largeurs PASS |
| mission-pourvue | agence | `/gestion/missions/:id` | 3 largeurs PASS |
| suivi-organisation | agence | `/candidatures/:id` | 3 largeurs PASS |
| session-expiree | public | `/inscription/confirmation` | 3 largeurs PASS |
| compte-candidat | candidat | `/compte` | 3 largeurs PASS |
| notifications-candidat | candidat | `/notifications` | 3 largeurs PASS |
| compte-agence | agence | `/compte` | 3 largeurs PASS |
| notifications-agence | agence | `/notifications` | 3 largeurs PASS |
| candidatures-agence | agence | `/candidatures` | 3 largeurs PASS |
| mes-etablissements-agence | agence | `/mes-etablissements` | 3 largeurs PASS |
| compte-etablissement | etablissement | `/compte` | 3 largeurs PASS |
| notifications-etablissement | etablissement | `/notifications` | 3 largeurs PASS |
| candidatures-etablissement | etablissement | `/candidatures` | 3 largeurs PASS |
| mes-etablissements-etablissement | etablissement | `/mes-etablissements` | 3 largeurs PASS |

## Preuves et reproductibilité

`E:/Interimatch/audits/2026-09-19-client-routes/` contient :

- `client-routes.mjs` : harness adapté hors dépôt, sans galerie publique.
- `report-all.json` : campagne de 174 contrôles avant correction CSS ; l’unique débordement reste visible.
- `report-profile-before.json` : éléments DOM responsables du débordement.
- `report-profile-after.json` : six largeurs après correction.
- `signup.cjs` et `signup.json` : trois parcours interactifs et vérification du payload.
- `summary.json` : inventaire rapproché des routes privées du routeur courant.
- `captures/` : captures avec données fictives.

Build frontend incluant la correction CSS : PASS. Chaque navigateur lancé par ce harness a été fermé après sa campagne.

## Limites

Cette recette couvre les chargements, les variantes indiquées et les trois inscriptions détaillées. Elle ne signifie pas que chaque bouton, chaque état d’erreur ou chaque combinaison de filtres a été exercé. Ni OAuth réel, ni délivrabilité email, ni certification RGAA ne sont déduits de ces contrôles. Les captures et fixtures restent des preuves de présentation et de comportement frontend.
