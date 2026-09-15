# Vault V1 - exploitation locale

Vault conserve les secrets applicatifs dans KV v2 avec TLS, audit, stockage Raft persistant et des acces AppRole separes. La configuration Docker est dans infra/vault/. Le port 58200 est accessible uniquement depuis le poste local.

## Installation sur un nouveau poste

Prerequis : Node.js 24, Docker Desktop, OpenSSL (Git pour Windows le fournit) et un .env local configure selon le README.

```powershell
npm ci
npm run setup
npm run build
npm run vault:setup
npm run vault:trust
npm run vault:check
npm run start:vault
```

vault:trust installe le certificat de l'autorite locale dans le magasin Windows de l'utilisateur. Le serveur reste en HTTPS. Si les bases ne sont pas encore demarrees, suivre leur installation dans le README avant vault:check.

Le bootstrap cree les certificats, initialise Vault, importe les valeurs existantes du .env et cree les AppRoles. Il revoque le jeton root initial. Ne jamais copier les identifiants, certificats prives ou parts de recuperation d'un autre poste.

## Contenu

| Chemin logique | Noms des valeurs |
|---|---|
| kv/infimatch/v1/backend | DATABASE_URL, MONGODB_URI, SESSION_SECRET, DOCUMENT_KEY, SERVICE_TOKEN, RPPS_API_KEY, FT_CLIENT_ID, FT_CLIENT_SECRET |
| kv/infimatch/v1/infra | POSTGRES_PASSWORD, MONGO_PASSWORD, N8N_ENCRYPTION_KEY, SERVICE_TOKEN |

Cela represente 11 secrets distincts si tous les champs fournisseurs sont configures. Les anciennes cles DOCUMENT_KEY_Vn peuvent aussi etre conservees. Les parametres non secrets sont dans data/vault/runtime.json.

Les donnees metier restent dans PostgreSQL ; les explications de matching restent dans MongoDB ; les fichiers restent dans le stockage prive chiffre.

## Acces

- backend : lecture du seul secret backend V1.
- infra : lecture du seul secret infra V1.
- operator : gestion des secrets V1, des SecretID AppRole V1 et des snapshots.
- Aucun acces V2 accorde par ces policies.
- SecretID backend/infra : 7 jours ; operator : 30 jours.
- Jetons de lancement : 5 minutes, maximum 10 minutes ; revoques avant le demarrage du processus enfant.

Interface : https://127.0.0.1:58200/ui/. Le bootstrap ne cree pas de compte personnel Userpass ; sa creation est une operation administrative distincte. Les comptes d'un poste ne sont pas transportes par Git.

## Utilisation

```powershell
npm run vault:status
npm run worker:vault
npm run cli:vault -- --help
npm run vault:infra
npm run vault:snapshot
```

vault:infra peut recreer les services Compose avec les secrets injectes. Ne pas afficher docker compose config avec les valeurs resolues.

Les lanceurs lisent Vault au demarrage et ne chargent pas le .env en secours. Les processus deja lances gardent leurs anciennes valeurs jusqu'a leur redemarrage controle.

Apres redemarrage de Vault :

```powershell
docker compose -f infra/vault/compose.yaml up -d
npm run vault:unseal
npm run vault:check
```

## Mise a jour et recuperation

vault:sync copie explicitement les valeurs autorisees du .env vers Vault. Comparer d'abord les valeurs sans les afficher et comprendre les ecarts. Aucun service de synchronisation permanente n'est installe. Une nouvelle valeur KV ne change pas le mot de passe d'une base deja initialisee.

vault:rotate renouvelle les SecretID AppRole et revoque les anciens. Cette operation peut interrompre les clients conservant d'anciens identifiants. Elle ne change ni les mots de passe des bases ni les cles documentaires ; la rotation reelle reste a exercer dans une fenetre planifiee.

data/vault/ contient les acces AppRole, cles TLS, parts de deverrouillage et snapshots. Ce dossier reste hors Git. Trois parts Shamir sont generees, avec un seuil de deux ; leur regroupement local ne constitue pas une separation entre responsables.

Les snapshots Raft ne remplacent pas une restauration commune PostgreSQL + MongoDB + fichiers + cles + n8n + Vault. Une restauration independante complete reste a tester. Renouveler les certificats et acces avant leur expiration.

## Verification

npm run test:vault exige une installation locale Vault configuree et le .env correspondant ; executer npm run build auparavant. Les tests refusent les acces croises, l'ecriture par le backend, les identifiants invalides et les certificats non approuves.

Le script scripts/vault/verify-lifecycle.mjs redemarre Vault et utilise un port API de recette (3191). Il est reserve a une instance locale de test et ne prouve pas une restauration apres perte des volumes.

La suppression de la demande facultative de certificat client (tls_disable_client_certs) permet l'ouverture dans Edge avec authentification AppRole/Userpass ; HTTPS reste actif.

References : https://developer.hashicorp.com/vault/docs/configuration/listener/tcp ; https://developer.hashicorp.com/vault/api-docs/auth/approle .
