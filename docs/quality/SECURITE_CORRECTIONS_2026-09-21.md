# Corrections de confidentialité et de sauvegarde — 21 septembre 2026

## Anciennes sauvegardes

Les cinq sauvegardes locales du 16 septembre ont été remplacées par des archives AES-256-GCM : 133 fichiers, 110 133 530 octets avant chiffrement. Chaque fichier a été authentifié puis comparé octet par octet à son original. L’inventaire des fichiers est également authentifié par HMAC-SHA256.

Les cinq bases PostgreSQL et MongoDB ont été restaurées dans des conteneurs sans réseau, sans port publié et avec stockage temporaire en mémoire. Les nombres de lignes correspondent aux manifestes quand ceux-ci disposent de compteurs (deux archives sur cinq). Aucun document n’était présent dans ces cinq bases : ce test ne prouve donc pas le déchiffrement d’un ancien PDF réel. Les fichiers Vault et n8n sont récupérables à l’identique, mais leur redémarrage historique complet n’a pas été rejoué.

Les cinq copies en clair ont été retirées après une nouvelle comparaison complète. Cette suppression de fichiers n’est pas une attestation d’effacement physique des secteurs du disque. Les archives chiffrées sont dans le répertoire privé `data/backups/legacy-encrypted/` de l’installation locale ; elles sont exclues de Git et du dossier de rendu.

La clé est `BACKUP_KEY`, version 1, lue depuis Vault et distincte de la clé documentaire. Conserver cette version tant que ces archives existent. La récupération indépendante du PC reste un point séparé non réalisé par ce lot.

```powershell
# INFIMATCH_VAULT_PRIVATE_DIR doit désigner le coffre privé de l’installation.
node scripts/security/legacy-archive.mjs verify CHEMIN_ARCHIVE_CHIFFREE
# Conversion d’une autre archive : destination neuve, parent existant.
node scripts/security/legacy-archive.mjs encrypt DOSSIER_SOURCE DESTINATION_NEUVE
```

Le script ne supprime jamais la source. La vérification seule n’autorise pas une restauration en production : réconcilier d’abord le registre courant des effacements.

## Localisation dans le navigateur

La déconnexion efface les zones de recherche mises en cache pour tous les comptes de ce navigateur, y compris leurs anciennes versions. Le nettoyage intervient également à l’expiration de session et lorsqu’une vérification confirme l’absence de session. Une recherche temporaire reste disponible après un simple rechargement avec session valide. La zone enregistrée sur le serveur et les préférences sans rapport avec la localisation sont conservées.

Tests : six tests unitaires de zone de recherche, compilation et construction frontend ; navigateur Edge avec compte fictif et réponses API simulées, couvrant rechargement, déconnexion et expiration de session. La simulation navigateur ne constitue pas une nouvelle recette complète d’authentification de production.

## Droits PostGIS : action fournisseur nécessaire

La table `public.spatial_ref_sys` appartient à `supabase_admin`. Les tentatives transactionnelles de retrait par le compte de migration puis par `postgres` n’ont pas modifié les droits effectifs ; elles ont été annulées. Les 8 500 définitions de coordonnées et les calculs de transformation/distance ont été contrôlés sans modification des données.

Le retrait direct reste à effectuer avec Supabase Support. Le SQL précis est fourni dans `scripts/security/postgis-support.sql`. Aucune demande n’a été envoyée au support. Le script `scripts/vault/harden-postgis-access.mjs` vérifie les permissions ; il ne valide une transaction `--apply` que si les droits d’écriture ont effectivement disparu.

La [documentation officielle PostGIS de Supabase](https://supabase.com/docs/guides/database/extensions/postgis) confirme cette limite de propriété et décrit les possibilités de traitement. Ce lot ne supprime ni ne recrée l’extension, car des colonnes géographiques applicatives en dépendent. Aucune fuite de données métier n’a été démontrée sur cette table technique.

## Clé documentaire

La clé documentaire de production a été renouvelée dans Vault et dans les variables serveur Vercel : version 2. La version 1 est conservée pour la récupération historique. La vérification préalable comptait zéro document en production. Les clés MFA et de sauvegarde sont distinctes et inchangées. La prise en compte applicative nécessite le redéploiement du backend ; son contrôle est consigné dans les preuves locales de livraison de ce lot.

## Secrets fournisseur

Le remplacement de `FT_CLIENT_SECRET`, `RPPS_API_KEY` et `JOBSPIPE_API_KEY` reste à réaliser dans les comptes fournisseur, puis à reporter dans Vault et les variables serveur Vercel avant révocation des anciennes valeurs. Aucun secret n’est publié dans ce document.
