# État des lieux, décisions et suivi des correctifs

Date : 17 septembre 2026. Sources : les deux prompts fournis par le propriétaire, code local et dépôts, sujet extrait dans `docs/proofs/kickoff-source-extracted.txt`, cadrage V1 du dépôt, rapport local `InfiMatch_Bilan_SEO_Concurrents.html` daté du 15 septembre. Ce dernier porte un nom légèrement différent de celui cité dans le prompt ; aucun second rapport n’a été supposé.

Les consignes des documents constituent le périmètre de travaux demandé, pas une preuve de l’état actuel. Les décisions explicites précédentes du propriétaire restent applicables : Vercel, Vault local avec copie des seuls secrets serveur, deux dépôts, Discord, et publication directe par l’entreprise. L’ancien inventaire « toutes les bases sur le PC » est dépassé.

## Matrice initiale et corrections

| Lot | Existant observé | Écart / priorité | Correction et preuve |
|---|---|---|---|
| Parcours entreprise | Deux besoins conservés, publication auparavant réservée à l’agence | P0, suivi manquant | Corrigé dans le lot précédent ; recette entreprise publique, test intégration complet |
| Recommandations | Trois missions internes éligibles, tri score puis début | P1, « du moment » non défini | Diagnostic détaillé ; choix produit demandé, bloc inchangé |
| Qualité web | React/Vite, gros bundle, pas de PWA | P1 | Routes différées, installation, cache borné, pages qualité, métadonnées ; preuves frontend |
| Administration | CLI opérateur uniquement | P0 sécurité puis P1 écrans | Origine dédiée, MFA, sessions séparées, permissions, listes et actions contrôlées |
| Connexion professionnelle | Email/mot de passe, Google, annuaire RPPS | P1, pas PSC | Adaptateur OIDC, association explicite, repli ; désactivé sans accès ANS |
| Annuaire | Recherche exacte FHIR V2 et statuts | P1, identité et annuaire insuffisamment distingués | Raison, date, concordance de noms, état à examiner, quota distinct |
| Notifications | Outbox SQL, n8n cloud et Discord | P1 exploitation | Scénarios conservés ; suivi minimal par identifiant d’exécution, sans contenu personnel |
| Planification | Reprise/rappels cloud toutes les 30 min | P1 import quotidien absent | Actualisation quotidienne à 04:15 Europe/Paris activée séparément ; maintenance destructive non activée |
| Sauvegardes | Scripts de chiffrement préparés, code sur deux GitHub | P0 exploitation | Exécution et restauration de données de production attendent l’accord spécifique demandé ; aucune preuve inventée |

## Inventaire réel

| Composant | Usage / configuration | Hébergement / persistance | État et preuve | Limite / responsable |
|---|---|---|---|---|
| Frontend | React 19, Vite 7, `frontend/vercel.json` | Vercel, artefacts déployés | Build et parcours API publics testés | Propriétaire du compte Vercel |
| API | NestJS 12, Node 24, `backend/src/app.ts` | Fonctions Vercel, instances transitoires | Santé SQL, sessions et écritures vérifiées | Pas de processus permanent présumé |
| PostgreSQL/PostGIS | Décisions métier, sessions, événements, documents chiffrés | Neon ; compte applicatif DML limité | Migrations explicites, tests PostGIS/contraintes | Sauvegarde indépendante à vérifier |
| MongoDB | Explications de matching versionnées ; registre d’effacement cloud | Atlas Free | Écriture/lecture couvertes par recette isolée ; ping réel dans admin | Réseau Internet autorisé précédemment pour le POC, TLS + compte limité |
| Vault | Coffre principal et préparation des variables serveur | PC local, persistance et TLS existants | Choix explicite du propriétaire conservé | Non autonome PC éteint ; exploitation/récupération locale |
| Documents | AES-GCM, métadonnées SQL, stockage `postgres` | Neon, pas disque Vercel | Upload/déchiffrement/téléchargement autorisé testés publiquement | Démonstration : documents fictifs ; restauration avec clés non encore prouvée |
| Worker métier | Outbox transactionnelle, baux, reprises | Déclenchement borné Vercel après écriture + n8n périodique | Recettes événements/confirmations/rappels | Pas de daemon cloud ; délai possible jusqu’à prochaine reprise |
| n8n | Automatisations externalisées, appels backend authentifiés | n8n Cloud existant | Six workflows production actifs observés | Période d’essai limitée ; aucun abonnement souscrit ni gratuité permanente promise |
| Discord | Relais bot existant, préférences/destinations | Discord + n8n Cloud | Identité bot et relais testés précédemment | Aucune preuve de lecture d’un message Discord ; quotas à respecter |
| Google | Connexion | Google Cloud, origine Vercel ajoutée | Origine enregistrée ; repli mot de passe conservé | Session Google réelle dépend de l’utilisateur |
| Annuaire Santé | FHIR V2 `Practitioner` | ANS, secret serveur | Tests succès/vide/panne/discordance | Ne prouve ni identité détenue ni validation ordinale |
| PSC | Code OIDC, état lié à session, signature/claims vérifiés | Préparé côté API, désactivé | Fournisseur fictif signé testé | Accès BAS et recette CPS/e-CPS manquants |
| France Travail / JobsPipe | Imports bornés, provenance, dédoublonnage | API externes → SQL | Import public précédent réussi ; exports et tests disponibles | Import partiel ; absence dans un lot ≠ fermeture |
| FINESS | Référentiel public, noms/adresses/coordonnées | Instantané SQL, 174 621 lignes copiées lors de la migration | Recherche/référence utilisées par formulaires | Ne donne pas de droit d’accès à un établissement |
| Redis/broker | Aucun besoin découvert dans la file SQL actuelle | Non installé | Outbox SQL et n8n Cloud suffisants pour architecture retenue | Ne pas ajouter par supposition |
| Admin | React séparé, API commune | `infimatch-admin.vercel.app` | Build indépendant et tests UX/MFA isolés | Premier responsable à désigner et à enrôler |
| Email transactionnel | Aucun service configuré | Non disponible | Parcours existant ne doit pas annoncer un email envoyé | Pas d’offre payante souscrite ; récupération opérateur à documenter |

Les états « configuré », « connecté », « opérationnel » et « testé de bout en bout » sont distincts. L’administration ne déduit pas un service opérationnel de la seule présence d’une variable.

## Kick-off, V1 et demandes complémentaires

Le sujet exige deux types de comptes, profils, missions, matching, tableau de bord, source publique utile, deux automatisations au minimum, bases relationnelle/non relationnelle complémentaires, tests/couverture et une bibliothèque CLI. Commander est déjà utilisé. La V1 ajoute trois scénarios précis (correspondance, confirmation, relance) et les règles cliniques. L’admin global, PSC et PWA sont des compléments demandés ici, pas des obligations rétrospectives attribuées au Bootstrap.

Restent hors périmètre : paie, contrat juridiquement signé, signature électronique, chatbot, blog, RH multisite avancée, push, publication dans des stores, changement automatique de marque ou intégration Teams.

## Exploitation et limites explicites

- Les variables de production ne référencent pas les bases locales ; les migrations utilisent le compte opérateur depuis Vault, jamais le compte applicatif du navigateur.
- La file et les préférences restent SQL ; la panne n8n/Discord n’annule pas une candidature ou affectation validée.
- Les contrôles de disponibilité n8n appellent une URL fixe. Aucune fonction admin n’accepte une URL arbitraire.
- Les traces de corrélation contiennent seulement identifiants, action, date, durée et résultat. Le stockage intégral des exécutions n8n a été refusé par la validation automatique et reste désactivé.
- La maintenance quotidienne avec effacement/anonymisation n’est pas activée sans l’accord spécifique déjà demandé. Le rafraîchissement quotidien des offres est un workflow distinct.
- La sauvegarde chiffrée de production et son test de restauration nécessitent l’accord de transfert local déjà demandé ; ne pas les confondre avec les pushes Git.
- Le coffre local reste nécessaire pour l’administration opérateur et la récupération des secrets ; l’application déployée utilise ses variables serveur et ne l’appelle pas pour chaque requête.
- Aucun domaine personnel n’étant confirmé, l’admin utilise l’adresse attribuée par le compte Vercel existant.

## Démonstration proposée

1. Sur le site public : installation/aide, accessibilité et écoconception.
2. Sur comptes fictifs isolés : besoin → brouillon → publication → candidature → sélection → affectation → confirmation → annulation. Présenter l’historique, les contrôles d’organisation et les contraintes SQL.
3. Montrer source publique, provenance, qualification et informations manquantes sans inventer de dates.
4. Admin : refus d’un compte ordinaire, MFA, consultation selon rôle, révocation et reprise motivée. Ne pas exposer de vrais dossiers en capture.
5. Montrer la corrélation d’un événement avec n8n et distinguer livraison du canal et lecture.
6. Présenter les limites réelles : PSC BAS, appareils physiques, Vault local, sauvegardes/restauration, durée d’essai n8n.

Les temps réels historiques ne peuvent pas être reconstruits à partir des prompts. Le journal Git et les horodatages des preuves tracent les travaux, sans être assimilés à des heures humaines. Le tableau de charge du projet doit être renseigné par l’équipe avec ses temps réels ; aucune estimation n’est présentée comme du temps mesuré.
