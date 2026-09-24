# Planning de livraison V1 — 4 personnes, 11 jours
Contrainte confirmée par l’utilisateur : quatre personnes, onze jours, date de rendu fixe. Les rôles ci-dessous sont à attribuer aux membres ; ce ne sont pas des noms ni des disponibilités inventés.

## Répartition
| Responsable | Périmètre principal | Interfaces |
|---|---|---|
| A — backend métier | Auth, organisations, profils, missions, candidatures et affectations | Contrats API avec C, règles avec B |
| B — backend données | Référentiels, PostGIS, matching, MongoDB, RPPS et import d’offres/CLI | Modèle partagé avec A, recherche avec C |
| C — frontend | Parcours infirmier/entreprise, recherche, favoris, calendrier, dashboards et responsive | Contrats de A/B/D |
| D — intégration et automatisation | Compose/CI, documents chiffrés, confirmation PDF, trois workflows n8n et coordination recette | API métier A, notifications C |

Chaque responsable écrit les tests de ses modules. D coordonne les preuves ; il ne porte pas seul tous les tests ni la sécurité. Les favoris sont implémentés côté API par A et côté interface par C. Le matching reste chez B, l’affectation chez A.

## Calendrier
| Jour | A | B | C | D | Point d’intégration |
|---|---|---|---|---|---|
| J1 | Schéma métier et contrats auth/missions | Test accès API, schéma références | Parcours et composants communs | Démarrage local, CI, secrets de démo | Dépôt exécutable ; rôles attribués |
| J2 | Auth et affiliations | Référentiels, RPPS premier appel si accès | Inscription/connexion intégrées | Stockage privé et plan n8n | CDC, charge revue, risques et dépendances visibles |
| J3 | Profils et disponibilités API | Normalisation offres et CLI | Profils et calendrier | Chiffrement RIB/justificatif | Inscription → profil → pièce |
| J4 | Création/publication mission | Recherche géographique | Recherche, fiche mission et formulaire agence | Outbox et comptes techniques | Mission visible et recherchable |
| J5 | Candidature/retrait/sélection | Matching et traces MongoDB | Candidatures, favoris et états vides | Workflow notification de match | Recherche → matching → candidature |
| J6 | Consentement/affectation transactionnelle | RPPS états, reprise et cas limites | Dashboards et historique | Confirmation PDF et workflow | Affectation complète avec confirmation |
| J7 | Annulation/republication et concurrence | Import réel publié, dédoublonnage et manifeste | Intégration des trois acteurs | Workflow relance et idempotence | Trois workflows et import démontrables |
| J8 | Permissions et erreurs | Dates, distances, qualification, panne API | Responsive, clavier, SEO | TLS, sauvegarde et restauration | Recette complète ; versions stabilisées |
| J9 | Corrections issues de recette | Corrections issues de recette | Corrections UX/accessibilité | CI, couverture, SEC et preuves | Installation propre et parcours rejoués |
| J10 | README et explication métier | Source publique, CLI et preuve MongoDB | Parcours de démonstration | Exports, collecte preuves et incident fictif | Répétition collective, temps réels et écarts |
| J11 | Livraison et participation orale | Livraison et participation orale | Livraison et participation orale | Livraison et participation orale | Rendu à la date imposée |

Les travaux de marché, proposition de valeur, conformité du scénario et CDC sont répartis entre les quatre membres dès J1 ; chacun contribue à ses estimations et aux livrables. Les tests et la sécurité accompagnent chaque lot, même lorsqu’un contrôle consolidé apparaît à J8/J9.

## Règles pratiques
- Contrats et exemples API partagés dès J1/J2. Les mocks frontend temporaires portent ce statut et sont remplacés progressivement.
- Branche courte, revue croisée et intégration quotidienne ; une tâche n’est finie que lorsque le parcours intégré et ses droits fonctionnent.
- Utiliser les bibliothèques et composants maîtrisés ; aucune nouvelle infrastructure au-delà du socle retenu.
- Aucun développement V2. Les trois workflows F12 et le RPPS F18 restent en V1.
- Traiter les accès API dès J1 : le délai externe n’est pas résolu par plus d’heures de code.
- Réviser les estimations avec les temps réels à chaque intégration. La date fixe ne constitue pas une preuve que tout est déjà réalisable ou livré.
- Stabiliser dès J8, conserver J9/J10 pour les corrections et les preuves. Si une fonction reste bloquée, signaler son état réel au lieu de la déclarer réussie.

Ce planning est une répartition proposée sous contrainte fixe, pas un compte rendu de réalisation. Il remplace toute hypothèse antérieure d’équipe de cinq.


## Actualisation du 24 septembre 2026

Déclaration équipe : 5 personnes prévues (385 h), 4 effectives, 11 jours de 7 h et environ 2 h le soir, soit environ **396 h**, dont 88 h le soir. Cette déclaration actualise les mentions historiques de temps inconnus ; la ventilation par lot reste à établir. Valorisation employeur hypothétique et matériel amorti : **12 800,98 EUR**. Exploitation avec un salarié et matériel : **5 265,30 EUR/mois**. Détail et hypothèses : `docs/rendu/2026-09-23/09_COUTS_PRODUCTION.md`.
