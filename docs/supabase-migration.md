# PostgreSQL hébergé : Neon et Supabase

Le backend peut se connecter à Neon ou Supabase sans changer l'API frontend ni l'authentification InfiMatch.

## Configuration

- `DATABASE_URL` : connexion du rôle applicatif restreint. Sur le pooler Supabase, le nom est `infimatch_app.<project-ref>`.
- `DATABASE_CA_CERT` : certificat CA PEM public Supabase, fourni par Vault puis par les variables sécurisées Vercel. Ne jamais désactiver la vérification TLS. L'API TypeORM et le stockage PostgreSQL des sessions utilisent la même configuration.
- `DATABASE_URL_MIGRATION` : rôle de migration, pooler de session port 5432. Le script de migration utilise cette clé lorsqu'elle existe, sinon l'ancienne clé `DATABASE_URL_UNPOOLED`.
- `DATABASE_URL_UNPOOLED` : connexion administrative directe ou pooler de session pour la sauvegarde PostgreSQL ; jamais le pooler de transaction 6543.

Le certificat personnalisé reste facultatif pour les connexions existantes. Lorsqu'il est présent, les paramètres TLS incompatibles de l'URL sont refusés et la vérification du certificat et du nom d'hôte est obligatoire. Le mode SSL de l'URL est retiré après validation pour empêcher `pg` de remplacer l'autorité de certification explicitement fournie.

La sauvegarde Supabase exporte le schéma applicatif `public`, sans exporter/restaurer les schémas gérés par Supabase. Le certificat passe au conteneur de sauvegarde par son entrée standard et un fichier temporaire interne ; aucun mot de passe n'est ajouté à la ligne de commande. Le chiffrement des sauvegardes et la conservation des clés documentaires restent inchangés.

## Bascule avec conservation des données

1. Export récent cohérent de la source, puis restauration et contrôle des tables, séquences, droits et documents chiffrés.
2. Conserver la configuration source pour le retour arrière ; ne jamais supprimer l'ancienne base pendant la bascule.
3. Après validation des données seulement, remplacer les paramètres PostgreSQL du secret Vault de production, puis synchroniser les variables Vercel et redéployer le backend.
4. Tester connexion, sessions, recherche, matching, affectations, agenda, PDF et automatisations ; vérifier les reçus existants avant toute reprise.

## Bascule effectuée le 19 septembre 2026

L'utilisateur a explicitement accepté une reprise sans sauvegarde. La production utilise désormais Supabase ; aucune sauvegarde ancienne n'a été restaurée et Neon reste intact.

- 25 migrations appliquées sur PostgreSQL 17.6, avec PostGIS et btree_gist.
- 3 092 missions fictives locales réinjectées avec leurs UUID d'origine : 2 990 ouvertes et 102 conservées en brouillon car leur début était passé au moment de la reprise.
- 647 organisations de démonstration, dont une agence et 646 établissements. Les descriptions conservent la mention de leur caractère fictif.
- Référentiel FINESS officiel du 17 septembre importé : 174 741 établissements.
- Aucun compte, candidature, affectation ou document provenant de Neon repris. Deux accès neufs préparés : propriétaire du portail administrateur (activé après autorisation explicite) et entreprise de démonstration. Les informations d'accès restent privées, dans Vault et un fichier local protégé ; aucun secret dans Git.
- Taille mesurée après import : 72 125 587 octets, environ 72 Mo. Cette mesure est un état initial, pas une garantie sur la croissance future.
- Configuration PostgreSQL remplacée dans Vault et Vercel ; autres clés de services conservées. L'ancienne configuration Neon est archivée séparément dans Vault.
- Déploiement de bascule : `dpl_2KWW1z4Xec9C2HqfRcNB26rvfegC`, code `ae9b997`, état READY ; alias backend de production vérifié.

### Vérifications réelles

Santé backend et proxy frontend HTTP 200 ; connexion entreprise dans le navigateur avec session persistante ; inscription intérimaire ; recherche IDE à 30 km de Paris donnant 338 missions ; classement décroissant des scores indicatifs pour un profil incomplet ; consultation d'une fiche mission ; recherche FINESS.

Le point d'entrée de relance utilisé par n8n répond HTTP 201, `processed=0`, `notifications=0`, `hasMore=false`. Les 3 092 UUID réinjectés figurent dans la liste de suppression : aucun rattrapage d'alertes de création, de matching ou de relance. Les nouvelles missions créées avec de nouveaux UUID restent hors de cette liste ; confirmations et annulations ne sont pas supprimées par cette règle.

Le rôle applicatif peut lire les missions mais ne peut créer de table ni lire les migrations. Les 49 tables applicatives ne sont accessibles ni à `anon` ni à `authenticated`. L'API Data Supabase est désactivée ; l'accès passe par le backend InfiMatch.

Les affectations, nouveaux PDF et envois SMTP n'ont pas fait l'objet d'une nouvelle démonstration complète pendant cette bascule. Aucun ancien PDF ne peut réapparaître sans récupération de ses données et de l'affectation correspondante. Les anciens utilisateurs doivent recréer leur compte.

Les preuves locales de cette opération se trouvent dans `audits/2026-09-19-supabase` à la racine de l'espace de travail. Elles comprennent les résultats de migration, les tests navigateur et le contrôle des relances. Les scripts historiques spécifiques à Neon (capture initiale, copie initiale, bootstrap/récupération d'administrateur) ne doivent pas être utilisés tels quels contre Supabase ; la migration, la synchronisation et la sauvegarde courantes prennent en charge Supabase.

### Correction de la première recherche

Le contrôle navigateur a révélé une attente infinie à l'ouverture de `/missions` sans paramètres de zone. L'initialisation pouvait terminer son état React avant l'ajout de `zone=1` dans l'URL ; la première recherche était alors ignorée et la clé de chargement ne changeait plus. La clé inclut maintenant ce paramètre. Build frontend réussi ; test navigateur de la version corrigée contre l'API de production : liste chargée et 20 pourcentages visibles, sans renseigner manuellement de zone.

Validation finale en production : déploiement frontend `dpl_5yQ3N9rJmWmgTnJGUo2nJQCgrbuN`, commit `203f281`, état READY. Ouverture sans zone explicite réussie et 20 pourcentages visibles. Accès propriétaire activé via l'API normale après autorisation explicite, puis tableau de bord vérifié : PostgreSQL et MongoDB disponibles, SMTP2GO configuré, traitement cloud disponible, aucun événement métier en attente ou en échec. La configuration SMTP détectée ne constitue pas une preuve de réception d'un email. Les trois comptes techniques temporaires ont été supprimés avec contrôle de l'absence de candidatures, affectations et documents ; leur audit a été conservé. Après reprise de la collecte des offres externes, une nouvelle mesure donnait 83 102 867 octets ; le volume évolue avec ces imports.
