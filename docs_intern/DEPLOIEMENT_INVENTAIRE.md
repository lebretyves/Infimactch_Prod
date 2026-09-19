# Déploiement InfiMatch — état du 19 septembre 2026

## Services utilisés

| Composant | Production |
| --- | --- |
| Frontend | https://infimactch-prod-backend-l5bc.vercel.app — Vercel |
| API | https://infimactch-prod-backend.vercel.app/api/v1 — NestJS, Vercel, Node 24 |
| Administration | https://infimatch-admin.vercel.app |
| PostgreSQL/PostGIS | Supabase, région eu-west-1 (Irlande), rôle applicatif restreint |
| MongoDB | Atlas, données explicatives du matching |
| Documents | Chiffrement applicatif et stockage PostgreSQL `document_blob` |
| Emails | SMTP2GO : confirmations et annulations avec PDF |
| Automatisations | n8n Cloud, webhooks protégés et reprise périodique |
| Secrets | Vault local ; variables serveur nécessaires copiées vers Vercel |

L'API se connecte au pooler de transaction, port 6543, avec `infimatch_app.<project-ref>`. Les migrations et opérations administratives passent par le pooler de session, port 5432. `DATABASE_CA_CERT` fournit le certificat public attendu ; TLS vérifie le certificat et le nom d'hôte. L'API Data Supabase est désactivée. Le rôle applicatif ne peut créer de table ni accéder à `migrations` ; les rôles publics ne peuvent accéder aux tables applicatives.

Les dépôts de livraison sont `lebretyves/Infimactch_Prod` (Main) et `EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1` (Backend). Le second conserve des différences frontend indépendantes ; ne pas les écraser lors d'un report de correctifs.

## Reprise des données

Reprise sans sauvegarde autorisée le 19 septembre : 3 092 missions fictives réinjectées avec leurs identifiants d'origine, dont 2 990 ouvertes et 102 en brouillon, plus 174 741 références FINESS. Deux nouveaux accès administrateur/entreprise ont été préparés. Les anciens comptes, candidatures, affectations et PDF n'ont pas été repris. Voir [la migration et ses preuves](supabase-migration.md).

Les anciennes missions fictives ne déclenchent plus de notifications de création, matching ou relance. Les nouvelles missions restent traitées normalement. Les confirmations et annulations sont distinctes de cette suppression. La première ouverture de la recherche et l'affichage des pourcentages ont été vérifiés après correction du frontend.

## Exploitation

Les services cloud continuent lorsque le PC est éteint ; Vault et les outils opérateur restent locaux. La présence des clés SMTP ne prouve pas la réception d'un email. Les plafonds des relances, le débit des reprises et les quotas fournisseurs restent à surveiller.

Les scripts de maintenance acceptent uniquement Supabase. Les anciens outils de capture de configuration, copie initiale et préparation du précédent hébergement ont été retirés. Les outils de récupération d'administrateur, contrôle et séquences utilisent désormais la connexion TLS Supabase commune.

Les outils de sauvegarde exportent uniquement le schéma applicatif `public` et conservent le chiffrement. Ils ne sauvegardent pas les schémas internes gérés par Supabase. Le choix de repartir sans sauvegarde pour cette migration ne constitue pas une politique de sauvegarde récurrente. Aucune restauration complète de la nouvelle base ni nouvelle réception SMTP ne doit être présentée comme testée sans preuve correspondante.
