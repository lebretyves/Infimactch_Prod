> Mise à jour du 19 septembre 2026 : les horaires Windows ci-dessous sont historiques. Les imports sont désormais gérés par n8n : France Travail à 07 h et 15 h, JobsPipe à 07 h, heure de Paris. Voir [le réglage actuel](quality/IMPORTS_SOBRIETE_2026-09-19.md).

# JobsPipe — V1

Source supplémentaire, import opérateur borné à une requête (10 résultats par défaut), sans abonnement automatique ni remplacement de France Travail.

Configuration : scripts/security/connect-jobspipe.ps1 saisit la clé masquée et fusionne JOBSPIPE_API_KEY dans Vault avec contrôle de version. Aucun secret dans le frontend.

Après compilation (`npm run build`) :

- `npm run cli:vault -- import-jobspipe --limit 10 --dry-run` : appel réel consommant des crédits, normalisation sans écriture SQL.
- `npm run cli:vault -- import-jobspipe --limit 10` : acquisition et upsert transactionnel, journal import_run.

Les titres infirmiers français sont classés IDE/IADE/IBODE selon les règles existantes. L'intérim doit être explicite dans le texte ; un contrat temporaire seul ne prouve pas l'intérim. Les annonces fermées, expirées, sans contenu ou lien HTTPS valable sont rejetées. La candidature reste une redirection, sans affectation ni score complet inventé.

Limites : import partiel, aucune suppression d'offres absentes du lot ; pas de synchronisation planifiée. Les vérifications textuelles ne certifient pas le contrat. Le quota gratuit peut ne pas permettre une collecte exhaustive. Ne pas utiliser un dry-run puis un import si un seul appel suffit.

Documentation fournisseur : https://docs.jobspipe.dev/reference/search-jobs et https://docs.jobspipe.dev/authentication

Validation locale : premier appel authentifie, 10 offres recues et acceptees, 10 identifiants distincts actifs en PostgreSQL (IDE/IBODE). Compilation backend/frontend, 105 tests unitaires et 10 tests Vault reussis. Cle transferee de .env.example vers .env prive et Vault ; modele nettoye.

Planification Windows : InfiMatch-JobsPipe-Import, chaque jour a 00h, 07h, 09h, 11h, 13h, 15h et 17h (fuseau Paris Windows). 10 resultats maximum par appel, 7 appels/jour. Session Windows ouverte, PC eveille, Docker/PostgreSQL/Vault disponibles. Aucun rattrapage des horaires manques, aucune relance automatique, execution simultanee ignoree, arret apres 5 minutes. Logs : data/security/jobspipe/YYYY-MM.log. Reinstallation : scripts/security/install-jobspipe-schedule.ps1. Pas de nouvel appel fournisseur pendant installation.
