# Ticket dates externes et chemins de preuves — préparation du 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

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

Le correctif de dates a été publié le 20 septembre dans les commits 0551601 (Main) et 77ec636 (Backend), avec d’autres corrections. Vercel a confirmé le déploiement du descendant b0f3394 sur les deux projets backend.

## Clôture vérifiée — 20 septembre 2026

- Test Discord corrigé : le profil fictif dispose désormais d’une zone valide (48, 2, rayon 30 km), conformément au contrôle ajouté avant l’envoi. Aucun affaiblissement du filtrage.
- Campagne isolée complète PASS : 332 tests unitaires, 23 fichiers d’intégration, PostgreSQL/MongoDB/n8n et régressions de sécurité. Résumé : `../proofs/dates-final-validation.json`.
- Les quatre preuves ont été régénérées. FINESS réutilise l’instantané officiel d’août 2026 en cache (174 621 établissements) : recette récente, pas nouvelle acquisition ni affirmation de fraîcheur nationale.
- France Travail : 61 offres persistées dans la première preuve, 154 dans la rectification, rejeu sans doublon ; profils fictifs IDE/IADE/IBODE vérifiés dans la preuve partielle. Bases locales isolées supprimées après les essais.
- Le script de preuve partielle exclut désormais les lignes refusées pour une raison métier connue et les documente, au lieu d’abandonner tout l’échantillon. Les erreurs inattendues restent bloquantes.
- Budget réseau comptabilisé après activation des certificats système dans les enfants : 16 recherches et 4 authentifications France Travail (12 recherches initiales, puis 4 pour rejouer uniquement la preuve partielle). Aucune reprise HTTP fournisseur observée. Un premier essai non instrumenté a échoué avant production de preuve ; il n’est pas inclus dans ce compteur. Aucun appel JobsPipe, aucun téléchargement FINESS supplémentaire.
- Reprise des annonces existantes exécutée en transaction après simulation : 4 732 France Travail et 74 JobsPipe, toutes version 2 vers 3. 74 lignes changent leurs valeurs de dates ; les autres dates étaient déjà canoniques. Zéro appel fournisseur pour cette reprise. Seuls les deux champs de dates de provenance et leur version ont été touchés, sans modifier début de mission, visibilité ni horodatage d’import.
- Nouvelle simulation : zéro candidat. Contrôle API publique : cinq annonces consultées, toutes version 3.
- Le script `scripts/vault/normalize-production-dates.mjs` est en simulation par défaut ; `--apply` est explicite, TLS vérifié, transaction et plafond de 10 000 lignes. Il ne traite que la version 2.

Les résultats locaux ne remplacent pas le statut de la prochaine exécution GitHub Actions. Les fréquences d’import restent inchangées. Les preuves d’acquisition sont des échantillons bornés, pas un inventaire exhaustif.