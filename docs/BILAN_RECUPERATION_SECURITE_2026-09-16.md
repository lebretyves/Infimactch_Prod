# Bilan apr?s r?cup?ration des branches s?curit? ? 16 septembre 2026

## ?tat
Les changements de `backend-securite-livraison` (19efe48ec12ac7041d1f6d9b6447d8e1ba26b65f) et `backend-permissions-sessions` (4bbe41193eed0da89c529ca706dbda24c49954c5) ont ?t? int?gr?s aux fichiers locaux. La deuxi?me branche contient la premi?re. Int?gration s?lective depuis le socle 13589daf3850a4b35422bdac28e080ca9368f971, sans ?craser les fonctionnalit?s locales r?centes.

Ce bilan remplace les mentions ? non int?gr? localement ? de l'audit initial. Il ne signifie pas que la s?curit? est activ?e sur une instance en fonctionnement : aucune migration ex?cut?e, aucun red?marrage, commit, push ou d?ploiement effectu?. Le d?p?t comportait d?j? de nombreux changements non commit?s, conserv?s.

## R?cup?r?
- Configuration TRUST_PROXY et quota documentaire configurable ; configuration du proxy Express.
- Initialisation des permissions de la cl? TLS Vault dans Compose.
- Idempotence des d?p?ts documentaires et RIB, remplacement logique du RIB, ?criture temporaire puis renommage, quota et nettoyage des orphelins.
- Compte actif, version de session, rejet des anciennes sessions et contr?le de /auth/me.
- CLI disable-account, enable-account, revoke-account-sessions ; audit des op?rations et des refus.
- Correction du texte des rappels et tests des deux branches, y compris sc?narios d'int?gration.

## Adaptations r?alis?es pendant l'int?gration
- Connexion Google et association ? un compte : refus d'un compte d?sactiv?, lecture de session_version et conservation de cette version dans la session. Inscription Google utilise le m?me retour de cr?ation que l'inscription classique.
- Configuration Vault : GOOGLE_CLIENT_ID conserv? avec TRUST_PROXY et DOCUMENT_QUOTA_BYTES. Aucune valeur secr?te modifi?e.
- Migrations nouvelles DocumentSecurity1789380700000 puis AccountSecurity1789380800000, apr?s les migrations locales GoogleIdentity, FrontendFields et StaffingRequestDetails. Les migrations existantes ne sont pas renomm?es.
- Profils d?taill?s, cr?neaux, besoins structur?s, pagination et limite des tentatives auth conserv?s.
- Frontend Dossier : cl? par op?ration et contenu, conserv?e pour une nouvelle tentative dans la page apr?s erreur r?seau, renouvel?e apr?s succ?s ; gestion fran?aise du statut 413. Les cl?s sont en m?moire et ne survivent pas ? un rechargement de page.
- OpenAPI : r?ponse de commande documentaire {id,status} distincte des m?tadonn?es, d?claration de 413.

## Validation r?ellement effectu?e
- Backend : 101 tests unitaires r?ussis, 0 ?chec ; compilation TypeScript r?ussie. Les premiers ?checs Google provenaient des fixtures sans active/session_version, adapt?es puis compl?t?es avec le refus des comptes d?sactiv?s.
- Frontend : 10 tests du client API r?ussis ; compilation TypeScript et Vite r?ussie. Avertissement Vite sur un bundle sup?rieur ? 500 kB.
- V?rification git diff --check r?ussie.
- Tests Vault tent?s mais validation en ligne impossible : connexion refus?e sur 127.0.0.1:58200. Docker Desktop Linux Engine n'est pas disponible.
- Pas de recette navigateur, pas de tests d'int?gration sur PostgreSQL/MongoDB/n8n, pas de migration de base. Les tests unitaires utilisent des doubles pour les sessions et Google ; ils ne prouvent pas la r?vocation SQL r?elle ou le parcours Google chez le fournisseur.

## Reste ? faire ? ordre de reprise
1. **Bloquant : quota et confirmations.** Le quota utilisateur peut emp?cher la g?n?ration d'un PDF de confirmation. S?parer la capacit? syst?me et d?finir le d?compte des anciennes versions/RIB remplac?s.
2. **Bloquant : nettoyage concurrent.** La r?conciliation peut supprimer le fichier d'une transaction non commit?e. Coordonner ?criture/nettoyage et tester avec deux connexions PostgreSQL r?elles. Ne pas ex?cuter la r?conciliation sur les donn?es utilis?es tant que ce point n'est pas corrig?.
3. **Politique de suspension.** Exclure ou traiter explicitement les comptes d?sactiv?s dans le matching et les nouvelles affectations, sans annuler implicitement les missions confirm?es.
4. **Recette d'int?gration isol?e.** D?marrer l'infrastructure de test ; ex?cuter les migrations sur base neuve puis copie migr?e ; v?rifier email/Google, anciennes sessions, r?vocation multisession, CLI, permissions interorganisations, documents/RIB, confirmations et parcours m?tier frontend. Ne pas lancer les tests d'int?gration sur la base utilisateur.
5. **Activation locale.** Apr?s cette recette, sauvegarder la base cible, appliquer les deux migrations puis red?marrer API et worker avec la configuration correcte. Une reconnexion de tous les utilisateurs sera n?cessaire. V?rifier les permissions du volume Vault sur Windows.
6. **Livraison.** HTTPS/proxy et cookies Secure/CORS/CSRF, comptes PostgreSQL/MongoDB restreints et compte de migration distinct, conservation/purge, sauvegarde-restauration commune SQL/Mongo/fichiers/cl?s/Vault/n8n, CI reproductible puis publication Git.

Compl?ments de produit d?j? identifi?s : interface de gestion des sessions/comptes, mot de passe oubli? et modification email/mot de passe, identit? de l'op?rateur dans l'audit, cycle de retrait des offres externes. Ces fonctionnalit?s ne sont pas apport?es par les deux branches.

## Tra?abilit?
Sauvegarde des fichiers concern?s avant fusion : E:/Interimatch/backups/security-import-20260916. Patch source : E:/Interimatch/audits/security-import.patch. Preuves unitaires et compilation : docs/proofs/security-import/. Audit initial : E:/Interimatch/docs/AUDIT_BRANCHES_BACKEND_2026-09-16.md.

Commandes op?rateur r?cup?r?es (? utiliser apr?s migration et validation) :
```powershell
npm run cli:vault -- disable-account --account <uuid>
npm run cli:vault -- enable-account --account <uuid>
npm run cli:vault -- revoke-account-sessions --account <uuid>
```
