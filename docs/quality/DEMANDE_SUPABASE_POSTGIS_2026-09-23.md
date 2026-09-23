# Demande Supabase prête à transmettre — droits PostGIS

Statut : demande envoyee le 23 septembre 2026 via le formulaire authentifie Supabase. Creation du ticket confirmee pour InfiMatch ; aucun numero affiche. Reponse attendue a yves.le-bret@epitech.eu. Correction des droits encore en attente du support.

Projet : InfiMatch — référence `skdrmhqwapxwwbupllhu`, région eu-west-1.

Merci de retirer les droits d’écriture des rôles `anon`, `authenticated` et `PUBLIC` sur `public.spatial_ref_sys`, en conservant les droits de lecture existants. Cette table appartient à `supabase_admin` et notre compte `postgres` ne peut pas retirer les privilèges effectifs. La dernière tentative du 23 septembre a été annulée après vérification : `WRITE_PRIVILEGES_REMAIN`.

Le script [postgis-support.sql](../../scripts/security/postgis-support.sql) précise les privilèges concernés et le contrôle attendu. Merci d’effectuer cette correction avec le propriétaire habilité, sans supprimer l’extension ni modifier les définitions de coordonnées. L’application utilise les types et fonctions PostGIS.

Après intervention, nous relancerons `scripts/vault/harden-postgis-access.mjs --owner` en lecture seule pour contrôler les permissions, les 8 500 références et les calculs de transformation/distance. Aucun secret n’est nécessaire dans cette demande.
