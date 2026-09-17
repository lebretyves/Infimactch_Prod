# Recette des correctifs et de l'administration initiale

Contrôles effectués le 17 septembre 2026, vers 03:14–03:19 Europe/Paris. Ce bilan distingue ce lot livré de l'administration complète demandée, dont les étapes avancées restent ouvertes. Aucun résultat ne constitue un audit RGAA, une certification RGESN ou une validation ANS.

## Versions publiées

- Dépôt `lebretyves/Infimactch_Prod`, branche `Main` : `da63c49`.
- Dépôt `Ziwazou/infiMatch`, branche `fusion-front_Back` : `bac66fc`, même changement porté sans réécriture d'historique.
- Frontend : https://infimactch-prod-backend-l5bc.vercel.app ; déploiement `infimactch-prod-backend-l5bc-dc6nz5mxu-neotravel.vercel.app`, Ready.
- API : https://infimactch-prod-backend.vercel.app/api/v1 ; déploiement `dpl_9YyB9rKCfJHipfXCt1Kv3aCuMuvU`, Ready.
- Administration : https://infimatch-admin.vercel.app ; déploiement indépendant `dpl_CBwHcCCgqXGFZzCrfH3KhyNzkRYK`, Ready, bundle `admin-Dexefse0.js`.
- Installation : https://infimactch-prod-backend-l5bc.vercel.app/installer.
- Migrations Neon appliquées transactionnellement : `PlatformAdmin1789381700000`, `ProfessionalIdentity1789381800000`.

Vault reste local conformément à la décision du propriétaire. L'application publique utilise Neon, Atlas et ses variables serveur Vercel ; elle n'a pas besoin d'appeler ce coffre local à chaque requête. L'administration opérateur, la récupération des secrets et les procédures de sauvegarde ne sont pas entièrement autonomes du PC.

## Résultats réellement obtenus

| Contrôle | Environnement / méthode | Résultat / limite |
|---|---|---|
| Backend complet | Docker isolé, PostgreSQL/PostGIS, MongoDB, workflows n8n réels | 192 tests, 192 réussis, 0 échec ; régressions sécurité PASS |
| Couverture | c8, `src/**/*.ts`, exclusions `main.ts` et `worker.ts` | Lignes/instructions 81,51 %, branches 80,12 %, fonctions 77,83 % ; rapport `docs/proofs/v1-hardening/coverage.txt` |
| Profil et session | `verify-production.mjs`, compte fictif public | Inscription, cookie sécurisé, modification persistante, refus CSRF PASS |
| Document | Même recette, PDF fictif | Upload chiffré puis téléchargement identique autorisé PASS ; ne prouve pas une restauration de sauvegarde |
| Entreprise | `verify-production-enterprise.mjs`, organisation fictive | Besoin, tableau de bord, brouillon direct et suivi PASS ; brouillon correctement privé |
| Publication/candidature/affectation | Suite d'intégration isolée | Parcours et contrôles métier couverts ; pas de notification Discord envoyée à un vrai utilisateur lors de cette recette publique |
| Admin public | `verify-production-admin.mjs`, responsable fictif temporaire | Refus d'un compte ordinaire, enrôlement TOTP réel, session distincte, pages API, absence de secrets dans réponses, refus de code rejoué et déconnexion PASS |
| Droits admin | Intégration isolée | Rôles insuffisants, révocation, dernier responsable, réauthentification PASS |
| n8n | Lecture de configuration authentifiée | Six workflows production actifs, dont actualisation quotidienne à 04:15 Europe/Paris |
| Appel n8n vers backend | Rappel authentifié de recette | PASS ; corrélation `n8n-execution`, résultat `completed`, exécution `15`, action `reminders`, 01:18:05 UTC |
| Webhooks n8n | Appels sans identifiant | Quatre scénarios refusent l'accès sans jeton PASS |
| Discord | Relais authentifié, lecture de l'identité du bot | PASS ; ne prouve ni envoi de message ni lecture par son destinataire |
| Pages publiques | HTTP sur domaines déployés | Accueil, installation, accessibilité, écoconception : 200, titres spécifiques, résumés sans JavaScript ; URL inconnue : 404 |
| Admin statique | HTTP | Page et police : 200 ; en-têtes `noindex, nofollow, noarchive` |
| Qualité responsive/PWA | Edge 153 via Playwright, build public, API interceptées fictives | 18 contrôles sémantiques/adaptatifs à 320/768/1440 px PASS ; invitation simulée au clic, refus, cache sensible absent, repli hors ligne PASS |
| PWA / frontend local | Tests dédiés et raffinement après évaluation | Cache borné, purge après déconnexion, refus de mutations hors ligne, cinq pages sans JavaScript et affichage mobile PASS |
| PSC | OIDC local signé, tests de validation et repli UI | PASS sur fournisseur fictif ; production `enabled:false`, accès ANS BAS manquants |
| Annuaire | Tests de réponses et comparaison de noms | Variantes typographiques acceptées, discordance à examiner, pas de preuve d'identité déduite de l'annuaire |
| Secrets Git | Comparaison des fichiers à publier avec secrets réels Vault | PASS avant push ; aucune valeur secrète affichée |

Les comptes, rôles et documents fictifs créés par les trois recettes publiques ont été supprimés. Un ancien compte de recette de notifications du 16 septembre a été identifié et laissé intact : il ne faisait pas partie des fixtures de ce lot.

## Suivi des étapes encore ouvertes

| Élément | État exact | Prochaine action |
|---|---|---|
| Premier responsable réel | Aucun droit attribué par supposition | Le propriétaire désigne un compte existant ; bootstrap limité puis enrôlement MFA par son titulaire |
| Recommandations | Diagnostic livré ; sélection, titre et tri conservés | Réponse produit exigée : personnalisé, général ou mixte ; sources et sens de « du moment » |
| Administration complète | Administration initiale livrée ; consultation et actions minimales opérationnelles | Après validation du socle : détail des explications matching, rattachements métier administrables, contrôle professionnel manuel encadré, actions de connecteurs et incidents plus détaillés |
| Vérifications de dossiers | Métadonnées et statut disponibles ; aucun téléchargement global admin | Affiner les responsabilités métier et les écrans détaillés ; conserver les autorisations documentaires existantes |
| MFA de récupération | Second responsable recommandé ; aucun contournement HTTP | Désigner/enrôler les responsables et formaliser l'identification opérateur avant toute réinitialisation exceptionnelle |
| PSC réel | Intégration préparée, désactivée | Raccordement ANS BAS, identifiants, essais CPS/e-CPS, déconnexion fédérée et recette de l'environnement cible |
| Sauvegarde/restauration | Scripts de sauvegarde chiffrée et contrôle d'intégrité préparés ; aucune restauration production prouvée | Accord de copie locale déjà demandé, puis restauration isolée PostgreSQL/MongoDB et ouverture d'un document chiffré avec clés de récupération |
| Conservation/effacements planifiés | Workflow destructif non activé | Accord spécifique déjà demandé et politique validée ; actualisation des offres reste séparée |
| Déclenchement horaire | Planification cloud active | Observer la prochaine exécution automatique à son horaire ; un appel manuel de recette ne la remplace pas |
| n8n durable | Instance Cloud existante en période d'essai | Choisir sa continuité avant expiration ; aucun abonnement payant souscrit |
| Installation réelle | Mécanismes et aide testés dans le navigateur | Installation Android/iOS réelle et retour OAuth dans l'app installée |
| Qualité complète | Contrôles ciblés et limites publiés | Lecteur d'écran, audit RGAA complet si requis, données terrain Web Vitals et gouvernance RGESN |
| Contact/mentions et temps projet | Aucune identité de contact ni heures humaines inventées | Le porteur fournit les informations légales/contact et les temps réels à comparer aux estimations |

La validation automatique a refusé la conservation intégrale des exécutions n8n sans accord explicite pour leurs données sensibles. Cette conservation reste désactivée. Le suivi mis en place enregistre uniquement les identifiants, l'action, la date, la durée et le résultat, sans corps de message ni secret.

Les sauvegardes Git sont vérifiées séparément des sauvegardes de données. Le simple test `pg_restore --list` du script existant ne doit jamais être annoncé comme une restauration complète.
