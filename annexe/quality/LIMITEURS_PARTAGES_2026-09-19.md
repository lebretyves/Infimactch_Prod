# Limites de requêtes partagées — 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

## Changement

Les compteurs express-rate-limit précédemment stockés en mémoire d'une instance sont désormais stockés dans PostgreSQL. Deux fonctions Vercel ou processus backend partagent donc la même consommation. Redémarrer une instance ne remet plus son quota à zéro. Aucun quota existant n'est augmenté ou diminué.

| Périmètre | Limite conservée | Identifiant |
|---|---|---|
| Écritures d'authentification client | 50 / 15 minutes | IP normalisée |
| Écritures administrateur | 50 / 15 minutes, compteur distinct | IP normalisée |
| Recherche de lieux | 30 / minute | IP normalisée |
| Activité de session | 20 / minute | Session |
| Vérification RPPS | 5 / minute | IP normalisée |
| Documents | 30 / minute | IP normalisée |
| Recommandations | 15 / minute | IP normalisée |
| Analyse CV | 10 / minute | IP normalisée |

GET/HEAD/OPTIONS restent exclus du compteur d'authentification ; l'activité d'une session authentifiée ne consomme pas ses tentatives de connexion. Les autres limiteurs conservent leurs méthodes et leur position dans les middlewares. Les en-têtes draft-8 et Retry-After sont maintenus. La protection CSRF et la configuration explicite des proxies restent inchangées. La normalisation IPv6 /56 par défaut de la bibliothèque est conservée ; aucune lecture directe de X-Forwarded-For n'est ajoutée.

## Stockage, atomicité et panne

`rate_limit_bucket` contient uniquement scope, key_hash, hits et reset_at. Ni IP brute ni identifiant de session en clair. Le hash est un HMAC-SHA256 utilisant SESSION_SECRET avec une séparation de domaine et de périmètre ; ce n'est pas un simple SHA256 d'IP susceptible d'être énuméré sans secret. La rotation du secret réinitialise logiquement les compteurs et doit être cohérente entre instances.

L'incrément est un seul INSERT ON CONFLICT UPDATE atomique. La fenêtre commence à la première requête, son expiration suit l'horloge PostgreSQL et le premier appel après expiration repart à 1. Les mises à jour concurrentes ne peuvent pas perdre un incrément. Le compteur entier est borné pour éviter un débordement sous abus massif.

Une erreur du store bloque l'opération protégée : HTTP503, code RATE_LIMIT_UNAVAILABLE, message générique et Retry-After60. Aucun repli vers un compteur local et aucune ouverture libre. Aucun détail SQL ou identifiant sensible n'est renvoyé. Les lectures explicitement exclues du limiteur d'authentification conservent leur comportement.

## Sobriété et rétention

Une écriture SQL est nécessaire par requête comptabilisée ; les requêtes sautées ne touchent pas ce store. La table possède un index d'expiration. La maintenance déjà existante appelle cleanupSharedRateLimits avec un plafond de500 lignes, via une sélection indexée et FOR UPDATE SKIP LOCKED. Il n'y a ni nouveau cron, ni boucle de purge illimitée, ni intervalle par processus. Les compteurs expirés ne bloquent pas même avant purge : l'expiration est vérifiée dans l'UPSERT. Une maintenance retardée peut conserver les anciennes lignes plus longtemps ; ne pas promettre une suppression exactement à la fin de chaque fenêtre.

## Installation et preuves

Migration additive SharedRateLimit1789848000000, enregistrée dans database.ts. Appliquer les migrations avant le déploiement du code qui utilise la table. La clé existante SESSION_SECRET suffit ; aucune clé supplémentaire à acheter/configurer.

Compilation backend et huit tests unitaires ciblés réussis (limite50auth, exemption activité, pseudonymisation, refus503, compteurs invalides, nettoyage borné, routes automatisations). Cinq tests PostgreSQL isolés vérifient concurrence80appels/deuxstores, partage effectif entre deux applications Express, expiration, isolation des périmètres/sessions/IPv6 et purge bornée concurrente. Résultats datés sous E:/Interimatch/audits/2026-09-19-shared-rate-limit.

La suite intégration globale doit utiliser une base ou des IP de fixtures réellement isolées : plusieurs applications de test partageant une base et l'IP127.0.0.1 consomment maintenant volontairement le même quota. Ne pas désactiver le limiteur en production pour rendre une suite verte.

Référence de la bibliothèque : https://express-rate-limit.mintlify.app/reference/configuration (store, passOnStoreError, windowMs, IPv6).