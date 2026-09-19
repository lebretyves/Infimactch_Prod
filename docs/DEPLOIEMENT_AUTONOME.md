# Déploiement autonome

La configuration opérationnelle est décrite dans [l'inventaire actuel](DEPLOIEMENT_INVENTAIRE.md) et [la migration Supabase](supabase-migration.md).

Frontend, API, bases, stockage chiffré des documents et workflows tournent dans les services cloud configurés. Vault et les outils opérateur restent sur le PC par choix du propriétaire. Les versions Docker locales servent au développement et aux tests ; Vercel ne les exécute pas.

Les sujets encore à finaliser concernent la reprise bornée des files, les plafonds de relance, le suivi des livraisons email et une procédure de sauvegarde/restauration validée sur la version finale. Ils ne sont pas résolus par le seul changement d'hébergeur PostgreSQL.
