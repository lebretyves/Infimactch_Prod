# Audit des branches backend InfiMatch — 16 septembre 2026

## Conclusion

**Verdict : REQUEST CHANGES — corrections nécessaires avant intégration/livraison.** Confiance élevée sur les modifications examinées, les incompatibilités de contrat et les deux reproductions isolées ; validation de l’exploitation en production non réalisée.

Les deux branches ajoutent des protections utiles et leurs 60 tests unitaires passent. Elles ne constituent pas encore une version livrable raccordée au frontend actuel. Deux défauts documentaires sont reproduits, et plusieurs adaptations sont indispensables lors de l’intégration avec les développements locaux récents.

Audit en lecture seule du produit : aucune fusion, publication, modification de compte ou migration de la base utilisée par le site. Une copie séparée du dépôt et des scripts de vérification ont été créés dans `E:/Interimatch/audits/github-backend-20260916`.

## 1. État exact de GitHub

| Branche | Commit examiné | Position |
|---|---|---|
| `main` | `19cf64556bb7d2b03918dd2dedcfc7ae0a6ac387` | Contient seulement LICENSE et README dans l’arbre examiné. |
| `Backend` | `13589daf3850a4b35422bdac28e080ca9368f971` | Socle backend V1 précédemment copié et documenté. |
| `backend-securite-livraison` | `19efe48ec12ac7041d1f6d9b6447d8e1ba26b65f` | Un commit après Backend ; 14 fichiers modifiés, +329/−40 lignes. |
| `backend-permissions-sessions` | `4bbe41193eed0da89c529ca706dbda24c49954c5` | Un commit supplémentaire après sécurité ; 8 fichiers modifiés, +222/−24 lignes. |

Les deux commits datent du 15 septembre 2026. `backend-permissions-sessions` contient intégralement `backend-securite-livraison`. Il ne faut donc pas additionner deux branches indépendantes : c’est une succession de changements.

Lors de la consultation : aucune pull request retournée, aucune exécution GitHub Actions et aucun check attaché au dernier commit. Les changements ne sont pas fusionnés dans `main` ni dans `Backend`.

Sources : [commit sécurité](https://github.com/Ziwazou/infiMatch/commit/19efe48ec12ac7041d1f6d9b6447d8e1ba26b65f), [commit sessions](https://github.com/Ziwazou/infiMatch/commit/4bbe41193eed0da89c529ca706dbda24c49954c5).

## 2. `backend-securite-livraison` : ce qui est réellement ajouté

| Sujet | Implémentation | Limite |
|---|---|---|
| Proxy de confiance | `TRUST_PROXY` requis en production ; accepte IP, CIDR, sous-réseaux nommés ou 1–10 intermédiaires. Refuse la valeur globale `true`. Express utilise cette configuration. | Prépare le fonctionnement derrière un proxy ; ne fournit pas de reverse proxy ni de certificat HTTPS pour l’application. La bonne topologie doit encore être configurée et testée. |
| Configuration Vault | `TRUST_PROXY` et `DOCUMENT_QUOTA_BYTES` ajoutés aux paramètres non secrets autorisés par le lanceur Vault. | Les valeurs propres à l’environnement doivent être renseignées. |
| Clé TLS Vault | Conteneur d’initialisation exécutant `chown vault:vault` et `chmod 0600` sur la clé ; démarrage Vault dépend de sa réussite. | Le fonctionnement réel des permissions du volume sur la machine de livraison n’a pas été rejoué dans cet audit. |
| Dépôt de documents | `Idempotency-Key` obligatoire ; une répétition avec même contenu retourne le même résultat, une réutilisation avec contenu différent renvoie 409. | Nécessite une adaptation frontend. L’idempotence couvre les deux commandes utilisateur concernées, pas une gestion complète de versions documentaires. |
| RIB fictif | Même protection contre la répétition ; l’ancien RIB reçoit `superseded_at`, le GET utilise le dernier non remplacé. | Ancien contenu toujours conservé ; pas de purge ni de RIB réel/paiement. |
| Quota | 25 Mio par compte par défaut, configurable, minimum 5 Mio ; verrou PostgreSQL pour sérialiser les écritures d’un même propriétaire. Dépassement : 413. | Englobe aussi les confirmations système et les anciennes versions ; problème décrit ci-dessous. Ce n’est pas un quota total du disque. |
| Écriture des fichiers | Fichier chiffré temporaire puis renommage ; métadonnées, audit et reçu idempotent dans la transaction SQL. Nettoyage en cas d’erreur interceptée. | Fichiers et SQL ne forment pas une transaction atomique unique. |
| Réconciliation | Ajout de suppression des fichiers anciens sans ligne SQL correspondante et de temporaires résiduels. | Concurrence avec une écriture en cours non protégée ; problème reproduit. Commande opérateur, sans planification ajoutée. |
| Notifications | Texte corrigé : « Une mission reste à pourvoir. », avec test d’encodage. | Les autres textes anciens mal encodés, notamment V2, ne sont pas tous corrigés. |
| Contrat et tests | OpenAPI signale les clés d’idempotence ; 4 tests de configuration et 1 test de texte ajoutés ; tests d’intégration documents/RIB étoffés. | Réponse OpenAPI à corriger ; tests réels proxy/quota/nettoyage insuffisants. |

Le chiffrement AES-GCM, la limite de 5 Mio par fichier, les sessions PostgreSQL, CSRF, Argon2 et les contrôles de périmètre existaient déjà dans le socle. Ces branches ne les ont pas créés.

## 3. `backend-permissions-sessions` : ce qui est réellement ajouté

### Compte actif et version de session

Migration ajoutant `account.active` (true par défaut), `account.session_version` (1 par défaut, strictement positif) et un index des comptes actifs.

À l’inscription et à la connexion classique, la version courante est stockée dans la session. Les routes protégées vérifient le compte et sa version en base à chaque requête. Une ancienne version, un compte désactivé ou une ancienne session sans version provoquent une destruction de session et une réponse 401. `/auth/me` reçoit explicitement ce contrôle.

Conséquence de déploiement : les sessions créées avant ce changement ne sont plus valides ; les utilisateurs devront se reconnecter.

### Commandes opérateur

- `disable-account --account <uuid>` : désactive, augmente la version, supprime les sessions SQL du compte.
- `enable-account --account <uuid>` : réactive et augmente aussi la version ; les anciennes sessions ne redeviennent pas utilisables.
- `revoke-account-sessions --account <uuid>` : invalide les sessions sans changer l’état actif.

Ces opérations sont transactionnelles et auditées. Le mot de passe n’est pas changé. Ce sont des commandes CLI, pas des boutons d’administration ni une page « mes appareils connectés ».

### Connexion et journal d’audit

Un compte désactivé ne peut pas se connecter par email/mot de passe et reçoit le message générique `Invalid credentials`.

Événements ajoutés : `ACCOUNT_DISABLED`, `ACCOUNT_ENABLED`, `ACCOUNT_SESSIONS_REVOKED`, `ACCOUNT_SESSION_REJECTED` et `ACCESS_DENIED`. Les refus 403/404 passant par le filtre Nest incluent méthode, chemin, statut et identifiant de requête. Les réponses directes des middlewares, notamment CSRF, ne passent pas toutes par ce filtre ; ce n’est pas un audit exhaustif de tous les refus. Les actions CLI utilisent un acteur nul : elles ne donnent pas l’identité humaine de l’opérateur.

### Permissions : portée exacte

Pas de nouvelle hiérarchie administrateur/recruteur/gestionnaire. Les périmètres soignant, établissement et agence et les adhésions actives existaient déjà. Un test de propriété de notification a été ajouté, ainsi que le scénario de révocation.

La désactivation bloque l’accès du compte, mais les recherches de candidats, automatisations de matching et affectations consultent encore le profil sans vérifier `account.active`. Un profil désactivé peut donc rester proposé et une candidature antérieure peut encore être affectée par une agence. Il faut décider et implémenter la règle métier attendue, sans annuler implicitement des missions déjà confirmées.

Sources : [contrôle des sessions](https://github.com/Ziwazou/infiMatch/blob/4bbe41193eed0da89c529ca706dbda24c49954c5/backend/src/common/access.ts#L23), [commandes opérateur](https://github.com/Ziwazou/infiMatch/blob/4bbe41193eed0da89c529ca706dbda24c49954c5/backend/src/cli.ts#L144), [sélection des profils](https://github.com/Ziwazou/infiMatch/blob/4bbe41193eed0da89c529ca706dbda24c49954c5/backend/src/matching/matching.module.ts#L176).

## 4. Revue : défauts introduits par ces changements

| Priorité | Défaut | Emplacement |
|---|---|---|
| P1 | Un quota rempli par les documents utilisateur empêche de générer une confirmation de mission. | `documents.module.ts:125`, appel système `automation.module.ts:218`. |
| P1 | La réconciliation peut supprimer le fichier d’une transaction encore en cours. | `documents.module.ts:223`, lecture/suppression lignes 235–242. |
| P2 | Le schéma OpenAPI de réponse impose `kind`, absent de la réponse réelle ; le schéma exclut BANK alors qu’il est réutilisé pour le RIB. | `openapi.ts:112`, `openapi.ts:192`, réponse `documents.module.ts:153`. |

### P1 — Quota utilisateur bloquant une confirmation système

Le même `store()` applique la somme de tous les documents STAGING/READY aux justificatifs, RIB et PDF de confirmation. À 25 Mio utilisés, un PDF de confirmation supplémentaire reçoit 413. L’affectation peut donc être enregistrée alors que son document ne peut plus être généré. Le remplacement du RIB peut lui aussi être bloqué et les anciennes versions continuent de compter.

**Reproduction :** appel du service compilé avec stockage SQL simulé à 25 Mio, création d’un document CONFIRMATION : 413 confirmé. Aucun accès à la base utilisateur.

**Correction recommandée :** distinguer les quotas des dépôts utilisateur et des documents système, garantir une capacité pour les confirmations, définir le décompte des remplacements/conservations, puis tester le parcours affectation → confirmation avec quota utilisateur saturé.

### P1 — Nettoyage concurrent supprimant un document valide

L’insertion SQL du document reste non validée pendant l’écriture du fichier et la suite de la transaction. Une autre connexion ne voit pas encore cette ligne. Si une écriture reste bloquée au-delà du délai de nettoyage, la réconciliation voit le fichier ancien sans ligne SQL et le supprime. L’écriture peut ensuite terminer et renvoyer READY avec un fichier manquant. Le paramètre de délai accepte aussi zéro, ce qui réduit encore la protection temporelle.

**Reproduction :** service compilé, fichiers temporaires isolés, double SQL simulant la visibilité avant commit et une transaction ralentie au-delà des cinq minutes par défaut. Nettoyage : un fichier supprimé ; fin d’enregistrement : READY ; lecture : 503.

**Correction recommandée :** coordonner stockage et nettoyage par un verrou commun par document, avec nouvelle vérification SQL sous verrou ; ou revoir le protocole STAGING pour rendre l’état en cours visible de façon sûre. Le seul âge du fichier ne prouve pas l’absence d’une écriture active. Ajouter un test de concurrence avec deux connexions PostgreSQL réelles.

### P2 — Contrat OpenAPI

Les commandes retournent `{id,status}`. Leur schéma `DocumentMetadata` exige `{id,kind,status}` et limite kind à EVIDENCE/CONFIRMATION. Préférer un schéma de réponse de commande `{id,status}` ou renvoyer de vraies métadonnées incluant BANK. Documenter aussi 413 pour le quota.

Sources : [quota et écriture](https://github.com/Ziwazou/infiMatch/blob/4bbe41193eed0da89c529ca706dbda24c49954c5/backend/src/documents/documents.module.ts#L121), [nettoyage](https://github.com/Ziwazou/infiMatch/blob/4bbe41193eed0da89c529ca706dbda24c49954c5/backend/src/documents/documents.module.ts#L223), [schémas](https://github.com/Ziwazou/infiMatch/blob/4bbe41193eed0da89c529ca706dbda24c49954c5/backend/src/openapi.ts#L112).

## 5. Intégration avec notre site local : travaux indispensables

Le backend actif local est dans `E:/Interimatch/InfiMatch`, dont le remote est `lebretyves/Backend_Interimatch`. Ce n’est pas la copie GitHub auditée. Les modifications locales récentes ne sont pas dans ces deux commits.

1. **Documents et RIB frontend :** `Dossier.tsx:105` et `Dossier.tsx:441` n’envoient pas `key`. Le client API n’ajoute `Idempotency-Key` que si fourni. Avec le nouveau backend, les deux enregistrements échoueraient en 400. Ajouter une clé stable par opération/contenu, conservée lors d’une nouvelle tentative après réponse réseau perdue ; gérer 413 en français.
2. **Google :** conserver le module Google local et appliquer active/session_version à toutes les connexions et inscriptions Google. Sinon les sessions Google sans version seront rejetées par le nouveau guard. La liaison de compte doit également refuser un compte désactivé.
3. **Configuration Vault :** fusionner les listes de paramètres. Le code GitHub n’autorise pas encore `GOOGLE_CLIENT_ID`, présent dans notre configuration locale ; son remplacement direct peut faire refuser le démarrage avec « Unexpected runtime configuration field ».
4. **Autres fonctions locales :** conserver les profils détaillés, la pagination, les disponibilités par créneau et les besoins structurés. Le besoin sur GitHub est encore limité au titre et à la description.
5. **Limitation auth :** conserver la correction locale qui ne compte pas les GET de session dans les 50 tentatives. Le code de ces branches applique encore ce plafond à tout `/auth`, y compris `/auth/me` et `/auth/csrf`.
6. **Migrations :** GitHub utilise les timestamps 1789380400000 et 1789380500000 pour DocumentSecurity et AccountSecurity ; le local les utilise pour GoogleIdentity et FrontendFields. Les noms diffèrent, donc cela ne prouve pas un échec automatique de TypeORM, mais il faut une séquence d’intégration explicite avec identifiants nouveaux pour les migrations de sécurité pas encore appliquées ici. Ne pas renommer les migrations locales déjà exécutées.
7. **Recette :** base neuve ET copie de base migrée ; mot de passe/Google ; reconnexion après déploiement ; révocation multises­sion ; documents/RIB ; missions/candidatures/agenda/besoins ; droits entre organisations.

## 6. Livraison : ce qui reste hors de ces deux branches

### Avant exposition publique

- Installer/configurer le proxy et HTTPS de l’application, puis tester cookie Secure, origine CORS/CSRF et interprétation des en-têtes transmis.
- Créer des comptes PostgreSQL/MongoDB restreints pour l’application et séparer le compte de migration. Le Compose fourni initialise encore les comptes administrateurs des moteurs.
- Corriger les deux P1 documentaires et le contrat frontend, puis valider la politique de suspension.
- Définir et exécuter conservation/purge documentaire et sauvegarde/restauration commune PostgreSQL + MongoDB + documents + clés/Vault. Le script snapshot sauvegarde l’historique Git, pas les données du site.
- Ajouter une CI GitHub reproductible et des bases de test jetables. Les tests d’intégration actuels ferment l’application sans nettoyage global des comptes créés : ne pas les lancer sur la base utilisateur.
- Tester les commandes CLI réellement : disable, enable et revoke ; plusieurs sessions ; comptes entreprise ; droits retirés ; anciennes sessions ; Google après intégration.

### Compléments de produit distincts

- Interface de gestion des comptes et sessions si souhaitée ; actuellement opérateur CLI uniquement.
- Changement autonome de mot de passe/email, mot de passe oublié, clôture/export de compte : non ajoutés ici. À prioriser selon le périmètre produit, sans les présenter comme obligations nouvelles du kickoff.
- Identité de l’opérateur et meilleure couverture des événements d’audit, alerte en cas d’échec de journalisation.
- Cycle de retrait des offres externes, déjà cité comme limite dans le README ; non corrigé par ces branches.
- Gestion complète des catégories/versions documentaires et signature électronique : restent des lots distincts, non livrés ici.

## 7. Vérifications réellement effectuées pendant cet audit

| Vérification | Résultat / portée |
|---|---|
| Consultation distante | Branches, commits, comparaison, PR, Actions et checks via GitHub authentifié. |
| Installation | `npm ci --ignore-scripts --no-audit --no-fund` dans la copie séparée. |
| Tests unitaires | **60/60 réussis**, code du dernier commit contenant les deux branches. |
| Compilation | **Réussie**. |
| Scan local des secrets fourni | Commande réussie, mais clone sans secrets configurés : ce n’est pas une certification de l’absence de secrets dans tout l’historique. |
| Vérifications ciblées sessions | Session valide acceptée ; session révoquée et session sans version refusées avec destruction. Doubles SQL, trois contrôles réussis. |
| Reproductions documentaires | Deux défauts reproduits sur le service compilé, fichiers temporaires et doubles SQL ; aucune donnée utilisateur. |
| Intégration complète | **Non rejouée** : le README annonce 17 réussites, mais aucune preuve CI distante disponible pour les confirmer ici. |
| Livraison HTTPS/Vault | Configuration lue, pas de déploiement ni changement d’infrastructure. |

Preuves locales : [script ciblé](../audits/github-backend-20260916/audit-focused.cjs), [résultats ciblés](../audits/github-backend-20260916/audit-focused-proof.json).

## Ordre recommandé

1. Corriger quota/confirmations et concurrence du nettoyage ; ajouter les tests correspondants.
2. Intégrer sélectivement les deux commits au backend local récent, avec migrations ordonnées, Google et limitation auth conservés.
3. Raccorder l’idempotence documents/RIB et les messages d’erreur frontend ; corriger OpenAPI.
4. Finaliser la politique de suspension et tester droits/sessions via API et CLI.
5. Valider l’ensemble sur bases jetables, puis HTTPS, droits des bases et restauration.
6. Publier les preuves dans une PR et fusionner après cette recette.