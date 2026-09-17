# Déploiement InfiMatch — état du 17 septembre 2026

## Application publique

- Frontend : https://infimactch-prod-backend-l5bc.vercel.app/
- API : https://infimactch-prod-backend.vercel.app/api/v1
- Santé : `/api/v1/health`, HTTP 200 en accès direct et via le proxy du frontend.
- Les deux projets Vercel suivent `Main` du dépôt `lebretyves/Infimactch_Prod`.
- La même version est sauvegardée dans `Ziwazou/infiMatch`, branche `fusion-front_Back`, sans réécriture des historiques.
- Version applicative vérifiée : `320c565` sur Main, `41832d4` sur fusion-front_Back.

## Services raccordés

| Composant | Hébergement et fonctionnement |
| --- | --- |
| Frontend Vite | Vercel, réécriture `/api/:path*` vers le backend |
| API NestJS | Vercel / Node 24, gestionnaire HTTP réutilisé entre requêtes |
| PostgreSQL/PostGIS | Neon gratuit, Francfort, compte applicatif `infimatch_app` sans création de schéma ni accès aux migrations |
| MongoDB | Atlas Cluster0 Free, compte `infimatch_app` limité à `readWrite` sur `infimatch` |
| Documents | Chiffrés, conservés dans `document_blob` sur PostgreSQL ; métadonnées et contenu dans la même transaction |
| Secrets | Coffre principal Vault local ; seules les valeurs nécessaires sont copiées dans les variables serveur Vercel |
| n8n | Instance Cloud existante ; workflows métier et relais Discord publiés |
| Google | Client OAuth configuré ; origine exacte du frontend ajoutée aux origines JavaScript autorisées |
| France Travail / JobsPipe / RPPS | Identifiants serveur configurés ; imports France Travail et JobsPipe vérifiés depuis Vercel |

L’application n’a plus besoin du PC allumé pour ses requêtes, ses données, ses documents ou les workflows publiés. Vault et les outils opérateur restent locaux, selon le choix validé. Le dossier `infra/` conserve la définition de l’environnement local et de test ; Vercel ne démarre pas ses conteneurs Docker.

## Données transférées et validation

Le transfert autorisé vers une base Neon vide a conservé les trois comptes présents au moment du transfert, leurs profils, l’entreprise et son besoin, les favoris et l’historique technique, 230 offres et 174 621 établissements FINESS. Les sessions, jetons de liaison temporaires et anciennes réponses d’idempotence n’ont pas été transférés. Les données locales ont été conservées.

Après transfert, le compteur d’identité du journal `audit` a été réaligné. La recette publique a ensuite validé inscription, session sécurisée, modification/relecture du profil, document chiffré envoyé/téléchargé, notification de bienvenue, configuration Discord et refus CSRF/authentification interne. Les comptes et documents de recette créés par cette vérification ont été supprimés.

Dernière validation isolée : 179 tests réussis, parcours PostgreSQL/MongoDB/n8n et régressions de sécurité réussis. La compilation du frontend réussit ; Vite signale seulement la taille du bundle principal.

## Notifications et tâches

- Après une action HTTP réussie, Vercel prolonge l’invocation avec `waitUntil` pour traiter un événement et jusqu’à cinq notifications. Les baux SQL évitent un double traitement concurrent.
- n8n publie quatre webhooks protégés : `infimatch-prod/matches`, `confirmation`, `cancellation`, `reminders`.
- Une reprise et des rappels s’exécutent toutes les 30 minutes. Ce n’est pas le délai normal d’envoi après une action : le traitement après réponse déclenche l’envoi immédiat.
- Les appels au backend utilisent un identifiant n8n `httpHeaderAuth`. Le jeton n’est pas écrit dans les modèles de workflows.
- Les données d’exécution ne sont pas enregistrées par ces workflows.
- Les messages Discord nécessitent une liaison et un choix de destination par chaque utilisateur ou organisation ; le déploiement ne relie pas automatiquement leurs comptes.
- L’actualisation bornée depuis Vercel a réussi : France Travail, 74 offres acceptées lors du contrôle ; JobsPipe, requête réussie mais aucun résultat conforme dans le lot reçu.
- La tâche quotidienne à 04:15 Europe/Paris est préparée. Son activation attend l’accord explicite sur la maintenance qui peut supprimer des données. Elle traite uniquement les clôtures déjà approuvées, conserve les règles de rétention existantes et masque les offres expirées/non revues depuis 30 jours.
- Les clôtures en mode cloud inscrivent un registre durable dans la collection Atlas `erasureledger` avant anonymisation SQL. Ce registre actuel doit être rejoué avant toute réouverture d’une sauvegarde ancienne.

## Limites et exploitation

- Documents sur Vercel : **3 Mio maximum par fichier**, affichés comme 3 Mo dans l’interface, pour respecter la limite du corps HTTP après encodage Base64. Le mode local conserve 5 Mio.
- n8n Cloud affichait **12 jours d’essai restants** lors du contrôle. Aucun abonnement payant n’a été souscrit. La continuité après l’essai exige une solution n8n adaptée ; Vercel ne remplace pas l’hébergement d’un serveur n8n permanent.
- Le POC Atlas autorise `0.0.0.0/0`, choix explicitement validé pour les adresses sortantes variables de Vercel. TLS et le compte limité restent obligatoires.
- Aucun service d’email transactionnel n’est ajouté. Les notifications internes et Discord ne fournissent pas une réinitialisation de mot de passe par email.
- Les variables frontend sont publiques (`VITE_API_URL=/api/v1`). Les secrets de bases, session, documents, automatisation et API restent sur le backend.

## Sauvegarde et reprise

Les outils `scripts/vault/backup-production.mjs` et `verify-production-backup.mjs` préparent une sauvegarde locale chiffrée AES-256-GCM de PostgreSQL, MongoDB et de la configuration. Son exécution attend l’accord explicite pour l’export de données et secrets vers `data/backups/production`, hors Git. La clé dérivée dépend de `DOCUMENT_KEY`, conservée dans Vault : préserver aussi une sauvegarde du coffre.

Une vérification d’intégrité d’archive ne remplace pas une restauration complète de production. Les procédures existantes de restauration isolée concernent l’environnement local ; ne pas les présenter comme une restauration Neon/Atlas déjà testée. Ne jamais écraser le registre d’effacement Atlas actuel avec un registre plus ancien.

Les modèles sans secrets sont dans `docs/n8n/`. Les valeurs secrètes et les sauvegardes privées restent hors des deux dépôts.
