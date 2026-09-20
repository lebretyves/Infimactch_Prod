# Sauvegardes de production — preuve du 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

La sauvegarde et la restauration isolée autorisées ont été exécutées. La production n’a pas été remplacée. La tâche Windows `InfiMatch-Production-Backup` est installée à 02:00, heure locale Europe/Paris, avec reprise au prochain démarrage si le créneau est manqué. Son premier lancement réel a terminé avec le code 0.

## Contenu et preuve

- Destination approuvée : `E:\Interimatch\InfiMatch\data\backups\production`.
- PostgreSQL, MongoDB et configuration sont chiffrés séparément en AES-256-GCM ; le manifeste ne contient pas les valeurs des secrets.
- Restauration réelle : 2 comptes, 3 092 missions, aucun document. Cette sauvegarde ne permet donc pas de prouver la restauration d’un ancien PDF réel.
- Restauration synthétique indépendante : un PDF fictif correctement déchiffré ; altération du contenu chiffré refusée.
- Restauration dans Docker isolé, sans port publié, réseau désactivé, stockage temporaire, puis suppression des conteneurs.
- Preuves versionnées : `restore-production.json`, `restore-synthetic.json` dans ce dossier.

## Exploitation

Le script `scripts/vault/scheduled-production-backup.ps1` applique d’abord la rétention, puis lance `backup-production.mjs`. Il écrit un état sans secrets dans `data/security/production-backups`. La tâche tourne sous le compte Windows courant, sans privilèges élevés. Elle nécessite une session ouverte, Docker disponible et Vault déverrouillé : ce n’est pas une sauvegarde cloud fonctionnant quand le poste est éteint.

Les dossiers de sauvegarde de plus de 30 jours sont purgés à l’exécution de la tâche. Le script vérifie le chemin absolu, refuse les jonctions et les contenus inconnus, puis supprime uniquement les fichiers attendus. La machine arrêtée ne peut pas purger à l’heure exacte ; contrôler la reprise et la date du dernier succès. Trois tests couvrent la simulation, la suppression ciblée et le refus des chemins inattendus.

Les variables `INFIMATCH_VAULT_PRIVATE_DIR` et `INFIMATCH_BACKUP_DIRECTORY` permettent aux scripts de retrouver les emplacements privés existants sans recopier leurs secrets dans les dépôts. Ne jamais versionner les fichiers privés, sauvegardes ou journaux contenant des données métier.

La restauration exige l’accès au matériel de déchiffrement conservé dans Vault, notamment `DOCUMENT_KEY`. Une copie chiffrée de la configuration ne remplace pas un moyen indépendant de récupérer cette clé si le poste et Vault sont perdus. Aucune copie hors site n’a été mise en place : la panne ou perte du disque reste un risque résiduel.

## Commandes de contrôle

```powershell
Get-ScheduledTaskInfo -TaskName InfiMatch-Production-Backup
node scripts/vault/rotate-production-backups.mjs
node scripts/vault/test-production-backup-rotation.mjs
```

La rotation est une simulation sans `--apply`. Ne pas restaurer directement en production pour un simple contrôle. Les emplacements et le contenu des sauvegardes sont couverts par l’autorisation explicite de l’utilisateur ; ne pas élargir les destinations ou la durée sans décision.