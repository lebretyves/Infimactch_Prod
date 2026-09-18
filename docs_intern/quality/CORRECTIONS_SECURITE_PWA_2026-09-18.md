# Corrections de sécurité de la PWA — 18 septembre 2026

## Protections navigateur

Ajout des en-têtes aux réponses du frontend : Content-Security-Policy appliquée, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin et Permissions-Policy. L’intégration dans une iframe est interdite. Scripts en ligne, gestionnaires HTML d’événements et eval JavaScript non autorisés. Objets embarqués interdits ; ressources autorisées limitées à l’application, son API et aux ressources précises de Google Identity Services.

Les styles en ligne existants restent autorisés pour compatibilité ; il ne s’agit pas d’autoriser les scripts en ligne. WebAssembly reste autorisé pour le moteur OCR local. Caméra et géolocalisation limitées à la même origine, microphone/paiement/USB interdits. Le chargement du SDK Google a été testé ; aucune connexion à un compte Google réel n’a été effectuée.

## Brouillon d’inscription

Enveloppe de stockage versionnée et horodatée : expiration après 30 minutes sans enregistrement/modification et maximum absolu de 2 heures. Reprise possible avant expiration. Les anciens brouillons sans horodatage, invalides, expirés ou datés dans le futur sont effacés. Le mot de passe et les données bancaires restent exclus du stockage navigateur.

L’expiration efface le stockage et la copie mémoire, puis réinitialise le formulaire d’inscription ouvert avec un message explicatif. Contrôle à la lecture, à l’écriture et au retour d’un onglet suspendu. Si le navigateur suspend JavaScript, la purge intervient à sa reprise. Purge lors de connexion réussie, création de compte réussie et déconnexion ; l’absence normale de session d’un visiteur ne détruit pas son brouillon valide. Aucun jeton de session ajouté au stockage local.

## Cache privé

Middleware no-store enregistré avant l’analyse des corps de requêtes et l’authentification, pour toutes les routes API, y compris les refus et erreurs applicatives. Directives navigateur et CDN. Choix conservateur : les API publiques sont également no-store. Les routes HTML privées et le proxy API du frontend ont leurs directives no-store. Les fichiers statiques utiles à la PWA conservent leur fonctionnement. Le service worker ne stocke toujours aucune réponse privée/API.

## Vérifications

- Cinq tests de brouillon : migration/format invalide, reprise, exclusions sensibles, expiration exacte, limite absolue et stockage indisponible.
- Six tests backend : middleware de cache et expiration de session.
- Tests navigateur sur build de production avec CSP : scripts injectés et attribut onclick bloqués, iframe tierce bloquée, expiration avec formulaire réellement vidé, déconnexion avec purge du brouillon.
- Imports réels de fixtures PDF et images : CV, RIB, OCR Tesseract, lecture PDF.js, simulation caméra/autocapture et arrêt des pistes ; tous réussis sous la CSP.
- Parcours d’inscription à sept étapes et trois tests de service worker réussis.
- Builds frontend et backend réussis.

Données fictives et appels métier simulés pour les recettes navigateur. Pas de compte réel modifié, pas de test d’intrusion complet ni de test sur téléphone physique installé. Le script test-security-http.mjs permet de vérifier les en-têtes réellement servis après déploiement.

## Références

- OWASP, stockage navigateur : https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- MDN, CSP script-src : https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- Google Identity Services, règles CSP : https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#content_security_policy
