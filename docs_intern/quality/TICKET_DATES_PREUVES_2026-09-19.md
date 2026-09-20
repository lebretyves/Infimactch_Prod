# Ticket dates externes et chemins de preuves — préparation du 19 septembre 2026

## Choix documentaire

Option A pour le dépôt Epitech : les quatre scripts écrivent sous `docs_intern/proofs`, et l’export OpenAPI sous `docs_intern/openapi.json`. Production conserve sa structure actuelle `docs/proofs` et `docs/openapi.json`. Les chemins sont résolus depuis `__dirname`, indépendamment du dossier courant ; les dossiers sont créés automatiquement. Aucun déplacement des anciennes preuves ni fusion d’une branche historique.

## Dates

`dateCreation` et `dateActualisation` sont analysées avec `DateTime.fromISO` (Luxon). Les valeurs invalides ou non textuelles deviennent `null` ; les dates valides sont stockées sous forme ISO canonique UTC. Les valeurs ISO sans décalage sont interprétées en UTC par convention explicite, indépendamment du fuseau du poste. La normalisation passe en version 3.

La règle s’applique aux nouveaux imports et aux réimports. Aucune réécriture massive des données de production n’a été exécutée. Le chemin partagé de normalisation bénéficie également aux dates de publication JobsPipe ; aucun appel JobsPipe effectué.

## Validation

- 311 tests unitaires réussis, dont dates invalides, calendriers impossibles, décalages et valeurs sans fuseau.
- 6 tests PostgreSQL d’import réussis, dont persistance des dates malformées à null, normalisation des dates valides et rejeu sans doublon.
- Quatre scripts vérifiés syntaxiquement et par simulation hors réseau (chemins, cibles, limites d’appels).
- `verify-france-travail.cjs` exécuté avec la vraie API le 19 septembre 2026 à 21h43 UTC :61 offres acceptées et persistées ; rejeu sans doublons.
- `verify-france-travail-rectification.cjs` :155 offres uniques reçues,154 acceptées, une exclue comme poste permanent ; SQL et présentation HTTP locale vérifiés.
- Chaque preuve réelle utilise quatre premières pages (une par mot-clé), Paris vérifié sur la commune. L’échantillon est explicitement non exhaustif ; il ne prouve pas la complétude nationale.
- `verify-finess.cjs` et `verify-partial-matching-live.cjs` ont été corrigés et contrôlés hors réseau ; leurs preuves externes n’ont pas été régénérées pendant ce ticket.

Les identifiants France Travail étaient déjà présents dans Vault. Seuls `FT_CLIENT_ID` et `FT_CLIENT_SECRET` ont été injectés en mémoire dans les processus enfants ; aucune nouvelle clé ni valeur secrète écrite dans Git. PostgreSQL et MongoDB étaient locaux, isolés et ont été supprimés après le test. Les scripts refusent une cible de production. Le premier essai des tests unitaires sans environnement isolé a échoué sur une clé DOCUMENT_KEY de test absente ; l’exécution isolée correctement configurée a ensuite passé 311/311, sans modification du code MFA.

Les gardes contre les faux succès (échantillon vide, zéro offre acceptée, doublons persistés) ont été renforcées après l’acquisition réelle et vérifiées par quatre scénarios hors réseau. Les comptes réels de 61 et 154 offres satisfont ces conditions. Aucun appel supplémentaire pour rejouer un résultat identique.

## État de livraison

Corrections et preuves préparées dans les deux espaces de travail. Aucun commit, push ou déploiement effectué pour ce ticket. Les fréquences d’import et les workflows de production restent ceux de la livraison précédente.
