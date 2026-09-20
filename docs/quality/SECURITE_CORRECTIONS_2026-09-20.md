# Corrections de sécurité — 20 septembre 2026

## Changements préparés

- L’ancien `.env` local ne contient plus ses valeurs secrètes. Archive complète relue et vérifiée dans Vault avant retrait ; réglages non secrets conservés. Les tâches InfiMatch inspectées utilisent le lanceur Vault.
- ACL : groupes Everyone, Authenticated Users et Users retirés des cibles identifiées. Accès de l’utilisateur propriétaire, SYSTEM et Administrateurs préservés. Contrôle récursif : 69 éléments, aucun accès général restant. Vault était déjà restreint ; ses permissions n’ont pas été réinitialisées.
- Administration : mot de passe puis TOTP obligatoire, installation du facteur avant tout accès ; challenge de cinq minutes, anti-rejeu, compte verrouillé après cinq échecs, sessions historiques sans MFA refusées. Réauthentification sensible par mot de passe **et** TOTP. Huit codes de récupération aléatoires à usage unique, uniquement leurs empreintes stockées. Récupération : sessions révoquées et réenrôlement obligatoire.
- CSP du site admin, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, permissions navigateur restreintes. Aucun script inline autorisé. Styles inline conservés pour les composants existants.
- Maintenance technique : trace de début/succès/échec, verrou de concurrence, reprise des effacements en attente. Alerte dans la vue d’ensemble après échec ou 36 h sans réussite. Workflow quotidien préparé à 04:15 Europe/Paris, un seul appel par jour. Sa continuité dépend de l’abonnement/quota n8n ; l’alerte détecte l’absence de succès.
- L’appel automatique de maintenance exclut **explicitement** les historiques métier, même si une variable de durée est définie. Une simulation agrégée en lecture seule est disponible : `node --use-system-ca scripts/vault/preview-business-retention.mjs 90` avec le chemin du coffre configuré. Aucun effacement métier en production n’est autorisé par cette simulation.
- Nouvelles sauvegardes : clé BACKUP_KEY indépendante dans Vault, enveloppe avec famille/version, anciennes sauvegardes lisibles avec DOCUMENT_KEY_V1. Vérificateur corrigé pour respecter le répertoire configuré et authentifier tous les octets avant lecture de l’index PostgreSQL. Pas de déchiffrement temporaire sur disque hôte.
- Secrets MFA : chiffrement AES-256-GCM versionné ; clé dédiée ADMIN_MFA_KEY si configurée, sinon dérivation de la clé documentaire déjà disponible. Les anciens secrets restent lisibles pendant une rotation progressive. Cette compatibilité concerne aussi les secrets temporaires PSC utilisant le même utilitaire.

## Validation du lot

- 319 tests unitaires backend réussis.
- 21 tests d’intégration admin/documents sur PostgreSQL et MongoDB isolés réussis.
- Compilation admin et scénario navigateur sous CSP : MFA, codes de secours, droits, réauthentification, mobile, déconnexion.
- Contrat OpenAPI vérifié.
- Sauvegarde ancienne et nouvelle authentifiées ; nouvelle restauration sans réseau ni port public réussie.
- Scan des fichiers du lot contre 20 secrets réels : aucune correspondance.

## Conservation : état et décisions

| Catégorie | Politique existante | Traitement |
| --- | --- | --- |
| Sessions / jetons temporaires | Expiration propre | Purge technique |
| Idempotence | 1 jour | Purge technique |
| Notifications internes | 90 jours | Purge technique |
| Audit | 365 jours | Purge technique |
| Documents temporaires incomplets | 24 heures, avec exclusions du moteur | Purge technique |
| Anciennes versions de RIB | 30 jours après remplacement | Purge technique |
| Événements terminés | 30 jours, exceptions des relances | Purge technique |
| Explications de matching MongoDB | 30 jours configurés par le moteur | TTL ; effacement asynchrone |
| Sauvegardes locales | 30 jours | Tâche de rotation existante |
| Missions clôturées, affectations et PDF de confirmation/annulation | Durée non choisie | Suppression automatique désactivée ; décision attendue |
| Copies de PDF déjà envoyées par email | Chez le destinataire et le prestataire | Une purge InfiMatch ne les retire pas des boîtes mail |

La durée métier doit être justifiée par les finalités et responsabilités du projet ; 90 jours et un an sont des propositions à arbitrer, pas des obligations légales affirmées. Une restauration ne doit pas réintroduire des personnes effacées : rejouer le journal d’effacement **actuel** avant réouverture.

## Rotation maîtrisée

1. Garder une sauvegarde chiffrée vérifiée et la version des clés qui la protège ; restreindre leur accès.
2. Distinguer clés documentaires, MFA et sauvegardes. Versionner la famille et conserver les anciennes clés nécessaires aux archives non expirées.
3. Tester lecture historique et création avec la nouvelle version avant changement de clé active. Ne jamais remplacer DOCUMENT_KEY sans conserver DOCUMENT_KEY_V1.
4. Réencrypter progressivement les documents et contrôler le nombre de lignes par version. Ne retirer une ancienne clé qu’après disparition de ses dépendances (PDF, secrets temporaires, archives).
5. Pour FT, RPPS et JobsPipe : créer la clé de remplacement chez le fournisseur, la placer dans Vault et l’environnement d’exécution autorisé, faire un appel minimal de validation, révoquer ensuite l’ancienne clé. Aucune de ces rotations fournisseur n’a été exécutée ici.

## Limites et interventions restantes

- Le propriétaire doit configurer **son** application TOTP à la prochaine connexion ; les tests utilisent uniquement des facteurs fictifs.
- Les trois parts Vault restent regroupées dans le fichier de récupération désormais à accès restreint. Leur répartition sur des supports/personnes indépendants attend la désignation d’un support hors de ce PC. Trois fichiers sur le même disque ne constitueraient pas une séparation réelle.
- Aucune suppression métier avant choix de durée. Les deux étapes précédentes ne peuvent pas être réalisées en inventant un choix utilisateur.
- Les nouvelles clés MFA et sauvegarde sont préparées dans Vault. L’ajout de `ADMIN_MFA_KEY`, `ADMIN_MFA_KEY_VERSION` et `DOCUMENT_KEY_V1` au backend Vercel a été refusé par le contrôle automatique d’approbation : destination et valeurs précises jugées non explicitement autorisées. Aucun secret n’a été transmis par cet appel. Le code MFA reste compatible avec la clé déjà configurée.
- La sauvegarde de production restaurée contient 2 comptes et 3 092 missions, mais aucun PDF. La vérification de lecture/effacement des PDF repose donc sur les documents fictifs des tests, pas sur une prétendue restauration de PDF de production.

## Références

- [OWASP — authentification multifacteur et récupération](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [CNIL — durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees)
- [CNIL — sécuriser les sauvegardes](https://www.cnil.fr/fr/securite-sauvegarder)
- [MDN — frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)

Les résultats de publication et les tests finaux sont consignés dans le dossier local `audits/2026-09-20-security-remediation`. Ce lot ne constitue pas une certification de sécurité ou de conformité RGPD.
