# Préparation du contrat et recette des pages — 19 septembre 2026

## Changements livrables

- Préparation d’un **brouillon** depuis une affectation confirmée : mission, dates, lieu, nom et prénom, organisation gestionnaire, établissement et taux horaire préremplis. Cinq champs de préparation enregistrables même incomplets, avec les informations manquantes explicites.
- Modification réservée aux membres actifs de l’organisation qui gère la mission. Le professionnel affecté et l’établissement concerné peuvent consulter ; une affectation annulée ou terminée est en lecture seule. Aucune signature, conclusion automatique de contrat, génération de nouvel email ou avenant.
- Contrôle de version côté serveur : les écritures concurrentes ne s’écrasent pas ; un rejeu identique ne duplique pas l’audit. Aucun détail bancaire du profil n’est exposé. Les brouillons sont supprimés lors de la clôture des comptes concernés.
- Suppression des pages de démonstration `/catalogue` et `/apercu-annonces`, avec redirection vers l’accueil. Retrait de 114 fichiers publics, environ16,9Mo. La recherche réelle `/missions` est conservée.
- Correction de livraison des médias d’aide admin : ils étaient remplacés par la page HTML de repli, malgré une réponseHTTP200.
- Correction ciblée du profil mobile à320px : le lien vers les disponibilités peut revenir à la ligne au lieu d’étirer la page.

## API et données

`GET` et `PUT /api/v1/assignments/{id}/contract-preparation`, authentification de session et protectionCSRF communes. Migration additive `ContractPreparation1789855200000`, table `contract_preparation`. Pas de modification du calcul du matching, des diplômes ni des missions existantes.

Une sauvegarde chiffrée de production a été réalisée avant migration dans le répertoire approuvé : `2026-09-19T21-12-43-020Z` (trois fichiers). Migration appliquée en production à21h27UTC ; droitsSELECT/INSERT/UPDATE/DELETE du rôle applicatif vérifiés. Les preuves des déploiements sont conservées séparément, indépendamment de la présence du code dansGit.

## Vérifications et limites

- Première campagne complète :462tests réussis, puis5scénariosSQL de sécurité. La revue indépendante a ensuite repéré que `notes:[]` devait être explicitement rejeté ; ajout de `@IsObject()` et de deux cas à la validation.
- Seconde campagne :308tests unitaires et154tests d’intégration exécutés ;461 réussites et un échec du sous-processusCLI de clôture, sans diagnosticstderr. Un diagnostic du statut/signal a été ajouté au test. Relance ciblée :38tests réussis (32parcours+6contrat), puis5scénariosSQL de sécurité réussis. Cette relance est conservée séparément et n’efface pas la trace de l’échec. Sa cause précise n’a pas été démontrée ; aucun changement de la logique de clôture n’a été effectué.
- Frontend :32tests,4testsPWA, contrôlesSEO et compilation. Préparation contrat :31contrôles navigateur avec API simulée et évaluation indépendantePASS.
- Administration :21routes en production avec le compte propriétaire autorisé, en lecture seule hors connexion/déconnexion ;96contrôles locaux de rôles avec API simulée. Contrôle des médias réels à refaire après déploiement.
- Site :42routes publiques ou protégées parcourues anonymement en production ;174états candidat/entreprise/inscription avec API simulée. Trois inscriptions interactives vérifient IDE+IADE, IDE+IBODE et les trois qualifications avec années distinctes. Le débordement du profil320px a conduit au correctifCSS décrit ci-dessus.
- Recette navigateur du brouillon avec PostgreSQL/MongoDB réels isolés :11contrôles réussis, dont connexion des trois rôles, sauvegarde/rechargement, refus d’écriture403 pour l’intérimaire, annulation viaAPI authentifiée puis lecture seule, trois largeurs sans débordement. Les données sont fictives ; aucune clé fournisseur ni email réel n’est utilisé.

Les preuves détaillées locales sont dans `E:/Interimatch/audits/2026-09-19-contract-release`, `2026-09-19-pages-admin`, `2026-09-19-contract-preparation` et `2026-09-19-contract-real-api`. Les rapports distinguent tests réels, simulations et contrôles de production ; aucune conformité totale ni recette sur téléphone physique n’est déduite de l’émulation responsive.

## Points extérieurs à cette livraison

- SMTP2GO : l’envoi existant et le suivi des événements de livraison sont distincts. Le transfert du secret dédié vers le webhook fournisseur reste soumis à l’autorisation précise demandée après refus du contrôle automatique. Aucune réception d’email en production n’est prouvée par ces tests.
- n8n : lors du contrôle, septworkflows actifs et737/1000exécutions consommées (neufjours d’essai affichés). Avec environ51déclenchements planifiés par jour, les263restantes représentent environ5,2jours hors événements supplémentaires. Une décision de continuité reste nécessaire ; aucun abonnement ou nouvel hébergement activé.
- JobsPipe : quota fournisseur épuisé (HTTP402), prochaine tentative enregistrée au1eroctobre. Les compteurs locaux ne constituent pas un solde officiel. FranceTravail reste configuré7h/15hParis, JobsPipe7h ; aucun appel fournisseur déclenché pendant l’audit.
- Branches : quatre reprises utiles identifiées, mais **aucune fusion effectuée** : plages horaires complètes, provenance détaillée, mesure de build, préférences d’accessibilité adaptées. Lecture vocale à examiner séparément. Anciennes versionsauth/Neon à ne pas réintroduire.
