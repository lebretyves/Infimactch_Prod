# Récupération autonome des comptes clients — 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

## Comportement

`POST /auth/recovery/request` envoie un email SMTP2GO lorsque `SMTP2GO_API_KEY`, `SMTP2GO_FROM` et une origine applicative HTTPS de confiance sont configurés. Le lien de réinitialisation contient un jeton aléatoire de 32 octets dans son fragment. Seul le SHA-256 du jeton est conservé en base ; aucun corps d'email ni lien secret n'est enregistré dans une file, une trace ou une réponse API. Le frontend retire immédiatement le fragment de l'historique et ne stocke pas le jeton dans localStorage/sessionStorage.

Le lien expire 30 minutes après émission et ne fonctionne qu'une fois. Le changement de mot de passe utilise Argon2id, incrémente la version du compte et révoque ses sessions. Les comptes inactifs, les comptes réservés à la plateforme, tous les comptes figurant dans platform_admin et les comptes dont la clôture est approuvée/en cours restent exclus. Une nouvelle vérification est effectuée sous verrou lors de la réinitialisation.

Les réponses ne révèlent pas si le compte existe, est admissible, a demandé récemment un lien ou a rencontré un échec fournisseur. Avec SMTP configuré, la durée minimale commune est de 3,5 secondes ; l'échange fournisseur entier, y compris la lecture du reçu, est borné à 3 secondes. Ce lissage réduit les différences de temps dues à l'envoi ; il n'est pas une garantie cryptographique de temps constant sur une infrastructure réseau/base partagée.

La limite SQL persistante reste d'une demande par compte et par heure, sérialisée avec le verrou des opérations administratives. Après ce délai, une ancienne demande expirée peut être remplacée ; un lien encore valide, notamment émis manuellement, n'est pas remplacé. Ce correctif évite qu'une ancienne demande REQUESTED/ISSUED bloque définitivement les nouvelles demandes via l'index unique.

## Envoi et échec

L'envoi est attendu pendant la requête HTTP ; aucun traitement en arrière-plan ni file qui attendrait le cron de 30 minutes. Un seul destinataire, aucun CC/BCC applicatif, aucune pièce jointe. L'email est en texte brut : SMTP2GO indique que le suivi des clics ne s'applique pas au texte brut (https://support.smtp2go.com/hc/en-gb/articles/900002237106-Click-Tracking). Le lien reste sur APP_ORIGIN et les redirections HTTP du fournisseur sont refusées.

- `ACCEPTED` : le fournisseur a accepté exactement un destinataire ; cela ne prouve pas la livraison en boîte.
- `FAILED` : refus explicite ; le token est invalidé, la demande reste REQUESTED pour assistance manuelle.
- `UNCERTAIN` : interruption, délai dépassé ou réponse ambiguë ; aucun renvoi automatique, token conservé jusqu'à expiration car l'email peut avoir été envoyé.
- `SENDING` : en cours, ou interruption du processus avant enregistrement du résultat ; ne pas renvoyer aveuglément.
- `NOT_REQUESTED` : assistance manuelle, aucun envoi automatique demandé.

Après erreur, le public reçoit toujours l'accusé générique. Il peut contacter l'administration ou demander un nouveau lien après une heure. Sans SMTP/origine valide, le parcours conserve l'assistance administrateur et l'explique dans l'accusé. L'émission manuelle existante et ses contrôles de privilège restent disponibles.

Les statuts et codes d'erreur limités sont enregistrés dans les nouvelles colonnes de recovery_request ; aucun corps d'erreur SMTP n'est sauvegardé. Le reçu n'écrase pas une réémission manuelle ou une consommation concurrente, grâce à une condition sur le hash initial et le statut ISSUED.

## Migration et configuration

Migration additive `RecoveryEmail1789840800000` dans `backend/src/database/recovery-email.ts`, à enregistrer dans le registre de migrations et appliquer avant le déploiement du backend. Elle ajoute email_status/email_provider_id/email_last_error, sans modifier les anciens comptes ou liens. Aucun nouveau secret nécessaire : SMTP2GO et APP_ORIGIN existants.

La clé SMTP2GO de production doit conserver un expéditeur autorisé. L'absence d'archivage/BCC chez le fournisseur est à vérifier opérationnellement ; ce document ne déclare pas cette configuration distante validée.

## Vérifications

Tests transport : quatre scénarios automatisés réussis (contenu/destinataire, refus/ambiguïté, délai du corps bloqué, origines/fallback). Compilation backend et vérification TypeScript frontend réussies.

Recette navigateur Edge sans interface, APIs fictives interceptées : demande générique, email invalide lié au champ/focus, fragment retiré sans stockage, confirmation de mot de passe/focus, refus puis réussite, absence d'auto-connexion ; non-régression des demandes de clôture et rendu 375/1440 réussis. Captures locales : `E:/Interimatch/audits/2026-09-19-recovery`.

La suite PostgreSQL `backend/test/integration/recovery.spec.ts` couvre huit scénarios (usage unique/révocation, exclusions, concurrence, renouvellement, changement de privilège/version, refus, résultat incertain, fallback). Les résultats sont consignés dans la preuve isolée du même dossier ; aucun email réel ni compte de production utilisé pour ces tests.