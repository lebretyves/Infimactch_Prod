## Correction de l'ouverture de Vault - 15 septembre 2026

Cause observee dans Edge : ERR_SSL_CLIENT_AUTH_CERT_NEEDED. Le listener demandait un certificat client facultatif alors que cette installation utilise AppRole. Ajout de tls_disable_client_certs = true dans infra/vault/server.hcl ; HTTPS, verification du certificat serveur et authentification AppRole conserves. Redemarrage et deverrouillage effectues.

Verification : page Sign in to Vault affichee a https://127.0.0.1:58200/ui/vault/auth ; 10 tests Vault reussis. Aucune connexion utilisateur effectuee, aucun nouveau jeton permanent cree. Aucun secret KV modifie. Le constat anterieur d'interface blanche est resolu.

Reference : https://support.hashicorp.com/hc/en-us/articles/5714330338323-Disable-Prompt-for-Client-Certificate-When-Loading-UI
