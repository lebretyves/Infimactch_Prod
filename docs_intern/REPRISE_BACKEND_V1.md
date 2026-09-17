# Reprise InfiMatch — 15 septembre 2026

## Vérification kickoff du 16 septembre 2026

Le [bilan actuel](audits/kickoff-2026-09-16/BILAN_BACKEND_KICKOFF_V1_2026-09-16.md) compare le code et les raccordements aux exigences du sujet : comptes, 62 opérations API, 40 exigences kickoff et limites restantes. 65 tests unitaires backend, 9 tests client API et les compilations ont été relancés ; aucune donnée métier créée. Les états et taux de couverture plus anciens ci-dessous restent historiques.

## État actuel

Le backend a été relu contre le prompt V1 puis retesté : **71 tests réussis**, compilation et typecheck réussis, couverture lignes 79,38 %, branches 84,33 %. Lire [le bilan complet](RECETTE_BACKEND_V1.md) avant de déclarer une fonctionnalité validée.

Sources figées et quatre empreintes contrôlées ; nouvelle numérotation du Word. Objectif 100 % de la V1, équipe de quatre et délai de onze jours. Aucun retrait de périmètre.

Node 24, NestJS 12/Express, PostgreSQL/PostGIS/btree_gist, MongoDB, n8n local et fichiers privés chiffrés. Quatre migrations appliquées, dont Finess1789380300000. API locale sur 3100 ; n8n 55678 ; PostgreSQL 55432 ; MongoDB 57017.

## Fournisseurs et référentiel

France Travail : authentification et import réel de 50 offres du lot vérifiés, avec provenance et rejeu sans doublons. FINESS : snapshot officiel daté du 1er septembre 2026, 174 621 EGE dont 104 752 actifs ; 120 663 paires géographiques exploitables. Les entrées sans coordonnées restent consultables.

ANS/FHIR : accès réel et cas NOT_FOUND puis FOUND vérifiés. Le cas positif utilise un identifiant public retourné par le fournisseur ; aucune identité en clair conservée dans la preuve, aucun profil réel modifié. Les statuts serveur restent FOUND/NOT_FOUND/PENDING/NOT_CHECKED ; aucune validation manuelle RPPS par l'agence.

## Corrections de la dernière recette

Pagination des listes secondaires ; classement limité aux admissibles ; commandes mission/candidature/besoin idempotentes avec clé obligatoire ; droits revérifiés sur rejeu ; confirmation conservée après clôture ; événement de recalcul après révision ; cache privé no-store ; confirmations non publiées masquées dans les listes ; EXHAUSTED et CLI retry-outbox ; contrats OpenAPI principaux complétés.

Les tests couvrent la réservation outbox expirée, l'absence de reçu final malgré HTTP 200, le rejeu concurrent d'une création, la révocation de droits et le remplacement d'une réservation PDF expirée. L'affectation reste une décision humaine de l'agence.

## Travail restant

1. Idempotence complète des dépôts documentaires/remplacements bancaires et purge des fichiers orphelins.
2. Compléter les réponses complexes OpenAPI et la recette de tous les endpoints.
3. Raffraîchissement complet des offres externes et cycle de retrait fournisseur.
4. Frontend et intégration des parcours, y compris recherche FINESS.
5. Déploiement TLS, privilèges des bases, audit des images, conservation/purge globale et restauration commune SQL/Mongo/fichiers/clés/n8n.
6. n8n Cloud reste non connecté ; les preuves concernent le local.
7. Livrables collectifs et validation du scénario métier.

Ne pas présenter la couverture ou les tests comme une conformité intégrale.

## Reprendre le travail

Lire git status, le README, le bilan et la matrice. Ne pas recréer les données. Démarrer l'API compilée, n8n avec les workflows publiés et le worker si nécessaire. Les commandes métier requièrent désormais Idempotency-Key ; conserver cette clé pour un rejeu réseau.

Un événement épuisé peut être repris explicitement avec `node backend/dist/cli.js retry-outbox --event UUID`. La commande refuse une réservation active et trace l'action. Ne pas relancer arbitrairement les événements terminés.

## Historique et sauvegardes

GitHub : https://github.com/lebretyves/Backend_Interimatch, branche master. Les clés et données locales restent ignorées. Après commit : push puis npm run snapshot. Le bundle sauvegarde le code et les documents, pas les bases, fichiers privés ou secrets.

La restauration isolée du premier dump PostgreSQL et la restauration/compilation du code 28923fc sont des preuves historiques, pas une restauration complète du dernier environnement. Lire docs/proofs et leurs dates.

Le [journal](history/IMPLEMENTATION.md) conserve les incidents et états antérieurs ; cette note décrit seulement le dernier état.


## Rectification France Travail du 15 septembre 2026

[Rectificatif du catalogue V1](RECTIFICATIF_CATALOGUE_V1.md) et [contrat des offres externes](OFFRES_EXTERNES_V1.md). Collecte multi-recherches, classement prudent, conservation des informations fournisseur et correspondance sans score complet. Lot Paris : 134 offres importees et rejeu sans doublon ; 120 IDE, 7 IADE, 1 IBODE, 6 non confirmees. Frontend et synchronisation exhaustive restent a completer.


## Comparaison partielle des annonces externes

Comparaison au profil connecte et option includeUncertainExternal implementees. Informations inconnues et indices restent distincts des incompatibilites connues. Aucun score externe complet. 71 tests reussis ; preuve complementaire avec offres reelles et profils fictifs dans docs/proofs/external-partial-live.json. [Explication a transmettre](EXPLICATION_MATCHING_DONNEES_MANQUANTES.md) et [contrat API](OFFRES_EXTERNES_V1.md). Integration frontend restante.


## Vault V1 et pr?paration V2 ? 15 septembre 2026

[Vault local : installation, acc?s, commandes et limites](VAULT_V1.md). TLS, KV v2 persistant, AppRoles backend/infra s?par?s et audit install?s. `npm run start:vault` et `npm run worker:vault` chargent les secrets sans repli vers `.env`. Le mode historique et son `.env` restent pr?sents. 10 tests Vault et 55 tests unitaires backend r?ussis ; reprise apr?s red?marrage et sant? API v?rifi?es. La restauration int?grale et la rotation r?elle des SecretID ne sont pas d?clar?es valid?es.

[Dossier V2](../V2/README.md) : p?rim?tre, backlog, architecture et recette pr?par?s ; aucune fonctionnalit? V2 d?velopp?e et aucun travail obligatoire V1 report?.


## Suivi permanent des interventions Vault

Consigne pour les prochaines interventions : apres toute modification autorisee des secrets ou de la configuration, comparer les valeurs attendues avec Vault sans les afficher. Synchroniser uniquement les changements voulus et valider les consommateurs concernes. Ne pas ecraser une divergence sans en comprendre la cause. Aucun service de synchronisation permanente n'est installe. Une mise a jour des valeurs KV ne change pas les mots de passe des serveurs et ne recharge pas les processus deja demarres. Les rotations AppRole restent une operation distincte.

Dernier controle : 11 secrets distincts identiques au .env ; aucune synchronisation necessaire. Details : docs/history/conversations/20260915-151237-suivi-vault-reste-v1.md


## Correction de l'ouverture de Vault - 15 septembre 2026

Cause observee dans Edge : ERR_SSL_CLIENT_AUTH_CERT_NEEDED. Le listener demandait un certificat client facultatif alors que cette installation utilise AppRole. Ajout de tls_disable_client_certs = true dans infra/vault/server.hcl ; HTTPS, verification du certificat serveur et authentification AppRole conserves. Redemarrage et deverrouillage effectues.

Verification : page Sign in to Vault affichee a https://127.0.0.1:58200/ui/vault/auth ; 10 tests Vault reussis. Aucune connexion utilisateur effectuee, aucun nouveau jeton permanent cree. Aucun secret KV modifie. Le constat anterieur d'interface blanche est resolu.

Reference : https://support.hashicorp.com/hc/en-us/articles/5714330338323-Disable-Prompt-for-Client-Certificate-When-Loading-UI


# Acces personnel Vault - cree le 15 septembre 2026

Apres autorisation explicite de recuperation administrateur, le compte lebre a ete cree avec Userpass. Connexion API et navigateur verifiees. Policy infimatch-personal-lebre : lecture des secrets backend et infra V1, navigation par metadonnees, session personnelle et changement de son propre mot de passe. Aucun droit de modification des secrets, V2 ou administration. Session 30 minutes, maximum 2 heures.

Mot de passe aleatoire remis uniquement dans data/vault/Acces-Vault.txt et userpass-lebre.json, proteges par ACL Windows (utilisateur courant et SYSTEM), ignores par Git. Ces fichiers ne sont pas inclus dans les sauvegardes de conversation. Ne pas copier leur contenu dans les documents. Une modification du mot de passe dans Vault ne met pas automatiquement ces fichiers a jour.

Le jeton root temporaire a ete revoque et son refus d'acces verifie. La configuration de recuperation a ete retablie ; la procedure generate-root sans authentification est de nouveau refusee. Aucun secret KV, mot de passe de base ou SecretID AppRole modifie. Les 10 tests Vault existants passent. Preuve : docs/proofs/vault-personal-account.json.

Connexion : https://127.0.0.1:58200/ui/ ; methode Userpass ; utilisateur lebre. Le compte est un acces utilisateur distinct des 11 secrets applicatifs KV. Les mentions anterieures de compte non cree sont historiques.


## 16 septembre 2026 ? R?cup?ration s?curit? et sessions

Les deux branches s?curit? sont int?gr?es au code local avec adaptations Google, Vault, migrations et frontend documents/RIB. 101 tests unitaires backend et 10 tests API frontend passent ; les deux compilations passent. Migrations et activation non effectu?es : Docker/Vault indisponibles. Les deux bugs documentaires et la recette compl?te restent ? traiter. Voir le [bilan apr?s r?cup?ration](BILAN_RECUPERATION_SECURITE_2026-09-16.md). Les ?tats ant?rieurs sont historiques.


## S?curit? V1 activ?e ? 16 septembre 2026

Quota/confirmations, nettoyage concurrent et suspension corrig?s et test?s sur bases isol?es. Sauvegarde/restauration SQL, MongoDB, Vault et n8n v?rifi?e ; migrations locales appliqu?es avec compte distinct ; comptes applicatifs restreints ; HTTPS local https://localhost:8443. 118 tests backend et 10 tests Vault passent. Voir le [bilan actuel](BILAN_SECURITE_LIVRAISON_V1_2026-09-16.md) pour les preuves, les commandes et les limites de livraison publique. Les anciens ?tats ? bugs ouverts ?, ? migrations non appliqu?es ? ou ? Docker indisponible ? sont historiques.
