# Suivi SMTP2GO des emails de mission

Implémentation : migration additive `EmailDelivery1789844400000`, `EmailDeliveryModule` et journal dans Notifications / fiche compte administrateur. Le coordinateur doit enregistrer la migration et le module, appliquer la migration avant déploiement et configurer le webhook ; ce document seul ne prouve pas cette activation.

## Configuration

- URL HTTPS : `/api/v1/internal/automation/smtp2go/webhook` sur le backend.
- Secret indépendant aléatoire de 32 caractères minimum : `SMTP2GO_WEBHOOK_SECRET`, dans Vault et les variables backend Vercel. Jamais dans frontend, URL, logs ou Git.
- SMTP2GO : `output_format: json`, `auth_header_type: bearer`, `auth_header_value: <secret>`.
- Événements : `processed`, `delivered`, `bounce`, `reject`, `spam`. Ne pas activer `open` ou `click` ; désactiver également leur suivi dans les réglages de la clé d'envoi si déjà actif.
- Headers retournés : `X-InfiMatch-Email-ID`. Le code ajoute cet identifiant opaque local à chaque message. Ancien message sans ce header : corrélation possible par `email_id` fournisseur + `rcpt` uniquement si le reçu d'envoi avait été conservé.
- Le plan gratuit ne dispose que d'un webhook : vérifier la configuration existante avant remplacement ; ne pas supprimer d'autres usages sans examen.

L'authentification est propre au webhook SMTP2GO. Ce point d'entrée interne n'utilise ni cookie utilisateur ni token CSRF, ni le `SERVICE_TOKEN` des workflows n8n. Il exige l'en-tête Authorization Bearer et reste protégé lorsque la variable manque. Aucune charge complète ni clé/API `auth` éventuellement incluse par SMTP2GO n'est stockée.

## États et limites

Le statut d'envoi existant reste distinct du retour de livraison : PENDING/SENDING/SENT/FAILED/CANCELLED/UNCERTAIN d'un côté ; NOT_REPORTED/PROCESSED/DELIVERED/BOUNCED/REJECTED/SPAM de l'autre. SENT signifie acceptation par le service. DELIVERED confirme la remise au serveur du destinataire, pas la boîte principale ni une lecture humaine.

Le journal ne contient que les états, références techniques et dates. Il conserve les dix derniers événements par email et affiche les cinquante derniers emails. L'intérimaire ou l'entreprise ne consulte que ses propres destinataires ; un membre d'entreprise ayant perdu son rattachement ne voit plus ces entrées. Les administrateurs doivent avoir la permission `accounts` (OWNER/SUPPORT), avec session admin valide. Pas de corps, adresse email, pièce jointe ou clé dans cette API de journal.

Les callbacks sont dédupliqués par empreinte logique ; `id` du fournisseur identifie un webhook et n'est pas supposé être un identifiant universel d'événement. Destinataire, référence locale et identifiant fournisseur doivent concorder. Le traitement ignore les événements inconnus et ne révèle pas l'existence d'un compte dans son accusé de réception.

Un événement processed ne rétrograde pas une livraison ou un rejet. Les issues finales sont ordonnées par date fournisseur, avec priorité déterministe en cas d'égalité ; une livraison postérieure peut résoudre un rejet temporaire. SPAM reste terminal. Un rejet après acceptation reste visible. L'historique conserve les faits reçus même quand l'état courant n'est pas changé par un événement hors ordre.

Un retour authentifié peut résoudre un résultat UNCERTAIN après timeout. Il clôt la réservation en cours : une réponse HTTP ou erreur réseau arrivée ensuite ne peut effacer ce fait ni rendre l'email à nouveau envoyable. Aucun renvoi aveugle ajouté. Les emails anciens sans retour restent explicitement sans livraison confirmée.

## Vérifications

Tests unitaires : authentification fermée par défaut ; dates et champs techniques ; répétitions/hors ordre ; scope utilisateur et permission administrateur. Tests PostgreSQL exécutés en environnement isolé : callbacks concurrents, livraison puis rebond, corrélation exacte/ancien message, callback pendant timeout, absence de données privées et retrait de rattachement. Aucun de ces tests n'envoie de vrai email.

Sources officielles consultées le 19 septembre 2026 :
- https://developers.smtp2go.com/docs/webhooks-overview
- https://developers.smtp2go.com/reference/add-webhook
- https://developers.smtp2go.com/reference/send-standard-email
- https://support.smtp2go.com/hc/en-gb/articles/37256328109081-Custom-Headers

Validation locale du 19 septembre : compilation backend réussie, vérification TypeScript frontend réussie, 4 tests unitaires ciblés et 5 tests PostgreSQL ciblés réussis. Le conteneur éphémère a été supprimé après les essais. Aucun email réel envoyé ; configuration du webhook fournisseur et contrôle de livraison réelle restent à réaliser par le coordinateur. La recette visuelle du journal n’a pas été exécutée par cet agent.
