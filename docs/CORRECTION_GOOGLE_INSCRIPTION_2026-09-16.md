# Connexion et première inscription Google — 16 septembre 2026

## Cause constatée

La configuration active exposait bien le Client ID Google prévu. Le serveur Node échouait cependant lors du téléchargement des certificats publics de signature : `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. La même librairie `google-auth-library`, exécutée avec `--use-system-ca`, récupère les certificats avec succès. Le message « réponse Google invalide ou expirée » masquait ce défaut réseau/TLS.

Le lanceur Vault et les commandes de lancement du backend utilisent maintenant le magasin de confiance du système en complément des certificats Node. HTTPS et la vérification des signatures restent actifs. Les indisponibilités de certificats produisent désormais `GOOGLE_UNAVAILABLE` (503), distinct de `GOOGLE_TOKEN_INVALID` (401).

Références techniques consultées : [Node — certificats système](https://nodejs.org/download/release/v24.8.0/docs/api/cli.html#--use-system-ca), [Google Identity Services](https://developers.google.com/identity/gsi/web/reference/js-reference).

## Parcours disponibles

1. Compte déjà associé : Google ouvre la session InfiMatch.
2. Compte existant non associé : après Google, l’utilisateur confirme le mot de passe de son compte InfiMatch pour associer les deux comptes. Une égalité d’adresse e-mail ne suffit pas à associer un compte existant.
3. Nouvelle identité Google : le serveur garde une identité vérifiée en session pendant 30 minutes. L’utilisateur choisit son parcours, complète son profil ou son organisation et accepte les conditions. La création du compte et de l’identité Google s’effectue dans la même transaction.

Aucun mot de passe local n’est demandé pour une nouvelle inscription Google. Le schéma existant conserve un hash Argon2 d’un secret aléatoire non communiqué ; cela ne fournit pas de mot de passe local à l’utilisateur. L’authentification classique email/mot de passe et ses sessions restent disponibles pour les comptes créés par cette méthode.

Le frontend ne stocke pas le jeton Google. Le brouillon peut conserver le mode d’inscription et les champs ordinaires, mais l’autorisation de création vient exclusivement de l’identité vérifiée conservée côté serveur. Une expiration propose une reprise sans effacer le dossier. Les challenges de plusieurs onglets sont bornés et expirent après 10 minutes ; le nonce concerné est consommé à la vérification.

## API

- `POST /auth/google` : connexion/association ou réponse `registrationRequired`.
- `GET /auth/google/registration` : e-mail et noms de la personne vérifiée, sans exposer son identifiant Google interne.
- `POST /auth/google/register` : données métier et consentement ; aucune identité ni aucun mot de passe provenant du client.

## Vérifications

- 71 tests unitaires backend réussis, dont vérification du jeton, refus d’association implicite, inscription initiale, expiration, rotation de session et création atomique.
- 10 tests Vault réussis.
- Tests réels PostgreSQL : comptes Google candidat/organisation, conflits et connexion classique, tous dans une transaction externe annulée. Les nombres de comptes, identités, profils et organisations sont identiques avant et après.
- HTTP réel : configuration active, téléchargement des certificats puis refus d’une signature falsifiée, refus d’inscription sans identité validée et refus du rejeu d’un challenge. Session de test isolée détruite.
- Navigateur isolé : parcours candidat Google complet, consentements, payload sans email/password, association d’un compte existant, expiration/reprise, retour à l’inscription classique et connexion classique. Google et les réponses applicatives sont simulés pour ces contrôles ; aucune connexion au compte Google personnel n’est effectuée par ces tests.
- Évaluation visuelle indépendante : PASS, bureau et mobile.
- Compilations backend et frontend réussies ; avertissement Vite de taille de bundle préexistant.

Preuves : `docs/proofs/google-registration/database.json`, `http.json` et `infiMatch-front-end/docs/proofs/google-registration/checks.json`. Test PostgreSQL reproductible : `node --use-system-ca scripts/test-google-registration.mjs` après compilation, Vault local disponible. Deux variantes Google ajoutées au catalogue de pages.

## État de livraison

Correction activée sur l’API locale via Vault. L’essai interactif avec le vrai compte Google de l’utilisateur reste à confirmer ; un nouvel essai a été demandé après activation. Aucun déploiement Vercel et aucun compte réel créé ou associé automatiquement pendant l’intervention.

## Essai utilisateur et remise à zéro demandée

Après correction, l’utilisateur a obtenu `GOOGLE_LINK_REQUIRED` sur son compte existant : la réponse Google était donc vérifiée et l’adresse reconnue. Il a ensuite explicitement demandé la suppression de son compte pour tester une première inscription Google.

Compte et profil sauvegardés dans `E:/Interimatch/backups/recreation-google-20260916-015033`, dossier limité à l’utilisateur Windows et SYSTEM, puis supprimés dans une transaction ciblée. Aucune candidature, affectation, pièce jointe, organisation liée ni explication MongoDB n’était associée à ce compte. Contrôle final : aucun compte restant pour cette adresse. Les traces d’audit sont conservées.

L’utilisateur peut désormais recommencer via `/inscription` et Google. La création interactive du nouveau compte par l’utilisateur reste à confirmer.
