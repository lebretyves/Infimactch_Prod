# Authentification InfiMatch et Google — état au 16 septembre 2026

## Configuration active vérifiée

Le backend local est lancé par `node scripts/vault/run.mjs api`. Avec ce lanceur, le fichier `.env` historique n'est pas chargé. Les secrets proviennent de Vault ; l'identifiant Google, public, provient de `data/vault/runtime.json`.

- Client OAuth Web : `665514544182-s8h26n10qre7kuk2jguqbgknror86jqv.apps.googleusercontent.com`.
- API directe et proxy frontend : `/api/v1/auth/google/config` répond `enabled: true` avec cet identifiant.
- Origines enregistrées et relues dans Google Cloud : `http://127.0.0.1:5173`, `http://localhost:5173`, `http://localhost`.
- Utiliser **http://127.0.0.1:5173/connexion** : c'est l'origine actuellement autorisée par la protection CSRF du backend.
- Projet Google `infimatch`, audience externe en mode test ; compte du propriétaire ajouté aux utilisateurs de test.
- Aucun domaine Vercel configuré dans cette intervention. Vercel n'est pas nécessaire pour l'essai local.
- Aucun secret client OAuth n'est utilisé par ce parcours.

Le vrai bouton Google Identity Services s'affiche et ouvre le sélecteur de compte Google. **L'association complète d'une identité Google à un compte InfiMatch n'a pas encore été validée avec l'utilisateur.** Ne pas confondre le chargement de la configuration avec une connexion réussie.

## Première association

1. Avoir un compte InfiMatch avec la même adresse que le compte Google.
2. Sur la connexion locale, renseigner le mot de passe InfiMatch puis choisir Google.
3. Après association réussie, Google suffit pour les connexions suivantes.

Une adresse ressemblante ou identique ne suffit pas à associer automatiquement un compte : le backend exige le mot de passe lors de la première association. Le rôle et les droits proviennent toujours du compte local.

## Organisation du code

- `backend/src/auth/auth.module.ts` : inscription classique, vérification du mot de passe et sessions.
- `backend/src/auth/google.ts` : bibliothèque officielle `google-auth-library`, vérification du jeton signé, audience, expiration et nonce ; association au compte existant.
- `backend/src/database/google-identity.ts` : identité Google unique associée au compte.
- `infiMatch-front-end/src/components/GoogleConnexion.tsx` : bouton officiel Google, challenge et retour à la page demandée.
- `scripts/vault/configure-google.mjs` : enregistrement contrôlé de l'identifiant public dans la configuration locale, sans toucher aux secrets.

L'authentification classique utilise Argon2id et des sessions PostgreSQL avec cookie HttpOnly. Aucun JWT de session stocké dans localStorage. L'OAuth n'a pas été réimplémenté.

## Vérifications et preuves

- 64 tests unitaires backend, dont 8 contrôles Google avec vérification simulée de jetons.
- Vérification réelle de Google Cloud, du client, des origines, de l'utilisateur de test et de l'ouverture du sélecteur Google.
- `infiMatch-front-end/annexe/proofs/google-configuration.json` et `google-active.png`.
- Recette complète des raccordements : `annexe/audits/v1-maquettes/BILAN_RACCORDEMENT_2026-09-16.md`.

La réinitialisation du mot de passe par email reste indisponible. Les routes et formulaires ne prétendent pas envoyer un message.

Documentation officielle : https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid et https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

## Correction du blocage signalé le 16 septembre 2026

Le compte local utilisait une adresse `@google.com`, différente de l’adresse Google `@gmail.com`. Après autorisation explicite du propriétaire, seule l’adresse a été corrigée ; identifiant interne, profil et mot de passe conservés. Aucune identité Google n’a été liée manuellement.

Les réponses Google distinguent maintenant demande expirée, jeton invalide, mot de passe local incorrect et compte local absent. Le frontend conserve ces messages, propose l’inscription si nécessaire et ne traite plus un refus Google comme l’expiration d’une autre session.

Validation :65 tests unitaires backend et9 tests client API réussis ; compilation front/back réussie ; API redémarrée et nouveau code GOOGLE_CHALLENGE_EXPIRED vérifié en HTTP local. La connexion complète reste à valider par le propriétaire en saisissant lui-même son mot de passe InfiMatch lors de la première association. Aucun mot de passe Google n’est demandé par InfiMatch.
