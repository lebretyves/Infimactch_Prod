# Acces personnel Vault - cree le 15 septembre 2026

Apres autorisation explicite de recuperation administrateur, le compte lebre a ete cree avec Userpass. Connexion API et navigateur verifiees. Policy infimatch-personal-lebre : lecture des secrets backend et infra V1, navigation par metadonnees, session personnelle et changement de son propre mot de passe. Aucun droit de modification des secrets, V2 ou administration. Session 30 minutes, maximum 2 heures.

Mot de passe aleatoire remis uniquement dans data/vault/Acces-Vault.txt et userpass-lebre.json, proteges par ACL Windows (utilisateur courant et SYSTEM), ignores par Git. Ces fichiers ne sont pas inclus dans les sauvegardes de conversation. Ne pas copier leur contenu dans les documents. Une modification du mot de passe dans Vault ne met pas automatiquement ces fichiers a jour.

Le jeton root temporaire a ete revoque et son refus d'acces verifie. La configuration de recuperation a ete retablie ; la procedure generate-root sans authentification est de nouveau refusee. Aucun secret KV, mot de passe de base ou SecretID AppRole modifie. Les 10 tests Vault existants passent. Preuve : docs/proofs/vault-personal-account.json.

Connexion : https://127.0.0.1:58200/ui/ ; methode Userpass ; utilisateur lebre. Le compte est un acces utilisateur distinct des 11 secrets applicatifs KV. Les mentions anterieures de compte non cree sont historiques.
