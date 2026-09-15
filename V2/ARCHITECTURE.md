# Architecture d??volution V2

## Continuit?

Conserver le monolithe NestJS modulaire. Ajouter les modules, tables et migrations qui r?pondent aux lots retenus. Pas de second backend copi?, pas de microservices ajout?s sans besoin d?montr?.

La version produit V2 ne n?cessite pas automatiquement `/api/v2`. Garder `/api/v1` pour les contrats compatibles ; documenter chaque rupture avec p?riode de transition et migration frontend.

## Donn?es et int?grations

- PostgreSQL : r?f?rence des versions de documents, attestations, relev?s et ?tats des nouvelles commandes.
- MongoDB : explications de matching ; ne pas y dupliquer sans raison les donn?es personnelles.
- Documents : m?me stockage priv? chiffr?, cl?s versionn?es et liens aux objets m?tier.
- Vault : secrets distincts par environnement/service. Ne jamais r?utiliser les identifiants locaux V1 dans un environnement V2 partag?. Pr?voir des politiques distinctes avant d?y d?poser des secrets.
- n8n : orchestration des ?v?nements valid?s ; les r?gles et autorisations restent dans NestJS.
- Signature : adaptateur serveur, validation des notifications du prestataire, ?v?nements idempotents et ?tats audit?s.

## Migration

Migrations additives d?abord ; reprise des donn?es contr?l?e ; aucun effacement des missions ou fichiers V1. Tester restauration et retour ? une version compatible avant toute migration destructive. Les choix de haute disponibilit?/auto-unseal Vault restent une d?cision d?exploitation, pas une fonctionnalit? V2 livr?e.
