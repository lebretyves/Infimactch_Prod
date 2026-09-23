# Maintenance manuelle Vault

Décision explicite du 23 septembre 2026 : conserver une procédure manuelle ; aucune tâche automatique de rotation n’est créée. Les tâches de sauvegarde existantes ne sont pas des renouvellements d’accès.

## Contrôler les échéances

Chaque jour d’utilisation et avant une sauvegarde importante, l’opérateur autorisé contrôle les échéances :

~~~powershell
$env:INFIMATCH_VAULT_PRIVATE_DIR='E:\Interimatch\InfiMatch\data\vault'
node scripts/vault/access-status.mjs
~~~

Cette commande lit uniquement les métadonnées locales, sans afficher les identifiants. Code 0 : plus de 48 h restantes ; code 2 : renouvellement manuel requis ; code 1 : métadonnées invalides ou indisponibles. Les tests d’accès réels restent nécessaires : une date valide seule ne prouve pas l’accès.

## Intervention avant expiration

1. Confirmer que Vault est disponible (`npm run vault:status`) et que l’accès opérateur fonctionne. Consigner uniquement la date et le résultat.
2. Sauvegarder le coffre (`npm run vault:snapshot`) et conserver le snapshot dans le répertoire privé.
3. Avant expiration de l’opérateur, exécuter manuellement `npm run vault:rotate` lors d’une intervention autorisée. Cette commande renouvelle les trois accès AppRole et révoque leurs anciens SecretID ; elle ne change pas les secrets applicatifs. Ne jamais la lancer simultanément avec une autre maintenance du coffre.
4. Relancer les contrôles `node --test scripts/vault/vault.test.mjs scripts/vault/operator-policy.test.mjs scripts/vault/postgres-target.test.mjs`, puis le contrôle des échéances. Conserver le journal sans valeurs secrètes.
5. Si un rôle échoue, interrompre l’intervention et utiliser la procédure opérateur documentée ; ne pas générer de root ou désactiver les protections implicitement.

`npm run vault:renew` ne traite que les accès applicatifs déjà expirés ; il ne remplace pas le renouvellement préventif de l’opérateur. Si le poste reste arrêté au-delà de l’échéance opérateur, une récupération autorisée peut être nécessaire. Cette limite est acceptée avec le fonctionnement manuel ; aucun renouvellement automatique n’est promis.

Échéances contrôlées : [preuve](../proofs/audit-final-20260923/vault-access-status.json). La procédure n’a pas effectué de rotation dans cette campagne.
