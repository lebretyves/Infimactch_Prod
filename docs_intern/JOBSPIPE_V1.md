# JobsPipe — acquisition d'offres externes

État documentaire au 21 septembre 2026. JobsPipe complète France Travail. Les annonces conservent leur provenance et leur lien de candidature externe ; leur import ne crée ni affectation interne ni score complet inventé.

## Exploitation courante

L'export n8n prévoit un import à **07 h, Europe/Paris**, avec pagination et reprise bornées. Il est séparé du workflow de reprise et rappels à quatre heures. Les anciennes tâches Windows ne constituent plus la procédure courante. Voir [les automatisations](AUTOMATISATIONS.md) et [l'export](../docs/n8n/InfiMatch-production-import-JobsPipe.json).

La clé `JOBSPIPE_API_KEY` reste côté serveur, dans la configuration privée autorisée. Aucun secret ne doit apparaître dans les documents ou les variables frontend.

## Import opérateur

Après compilation, la CLI propose `npm run cli:vault -- import-jobspipe --limit 10`. L'option `--dry-run` évite les écritures SQL mais consomme toujours un appel fournisseur. Ne pas enchaîner automatiquement simulation et import réel si un seul appel suffit.

La normalisation contrôle le contenu, les dates, les liens et les critères de l'offre ; un contrat temporaire ne suffit pas à prouver l'intérim. L'absence d'une offre dans un lot partiel ne prouve pas sa fermeture. Les dates de publication ne deviennent jamais des dates de début de mission.

Les crédits dépendent du compte fournisseur. Aucune collecte exhaustive, aucun quota restant et aucun succès récent ne sont garantis par cet export. Les résultats historiques sont dans les preuves datées ; une validation actuelle exige un résultat fournisseur, son import et son usage dans l'interface.
