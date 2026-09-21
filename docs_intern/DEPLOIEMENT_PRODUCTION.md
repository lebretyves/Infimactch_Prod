# Déploiement et contrôle de publication

État documentaire au 21 septembre 2026. [Inventaire des services](DEPLOIEMENT_INVENTAIRE.md) et [migration Supabase](../docs/supabase-migration.md).

## Composants

- Site : https://infimactch-prod-backend-l5bc.vercel.app
- API : https://infimactch-prod-backend.vercel.app/api/v1/health
- Administration : https://infimatch-admin.vercel.app

Frontend et API sont des projets Vercel distincts reliés au dépôt production Main. Le dépôt Epitech conserve sa branche Backend. L'administration possède un build et une publication séparés : un push applicatif ne prouve pas sa mise à jour.

PostgreSQL de production utilise Supabase ; MongoDB, stockage documentaire et n8n suivent l'inventaire. Les conteneurs Docker locaux servent au développement et aux tests. Les secrets sont configurés côté serveur ; aucune variable VITE ne doit contenir de secret.

## Vérifications avant et après publication

1. Identifier le commit et exécuter les contrôles appropriés au lot.
2. Vérifier migrations et compatibilité des configurations avant une évolution de schéma.
3. Contrôler les déploiements de chaque composant concerné et leurs versions.
4. Vérifier HTTP, santé API, cookies/CSRF et parcours concernés sur l'adresse publiée.
5. Conserver les preuves et limites ; READY ne signifie pas recette complète.

Dernière livraison vérifiée avant cette seconde revue documentaire : d2de5b8, frontend et backend signalés réussis. Administration publiée séparément. Identifier le commit effectivement remis dans le manifeste du rendu. La CI Epitech était bloquée par le budget Actions au dernier constat. Ne pas changer un abonnement pour contourner ce blocage sans décision du propriétaire.
