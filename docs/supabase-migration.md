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

L'exécution de 25 migrations dans une transaction ensuite annulée, une connexion applicative et un export SQL de la cible préparée ont été vérifiés sur Supabase avec TLS. Ces vérifications établissent la compatibilité technique, pas la récupération des données Neon. Au 19 septembre 2026, la bascule de données reste bloquée par le quota de la source. Une restauration ancienne exige une décision explicite acceptant les données manquantes et le rapprochement du registre actuel des effacements.
