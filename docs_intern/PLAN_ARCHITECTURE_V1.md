# Plan technique du backend InfiMatch

Ce plan dÃ©crit les fichiers prÃ©sents. La cible reste la V1 validÃ©e pour quatre personnes et onze jours ; le frontend et le dÃ©ploiement distant restent Ã  rÃ©aliser.

```text
InfiMatch/
  backend/src/
    main.ts                    EntrÃ©e HTTP
    app.ts                     Assemblage, middleware, erreurs et OpenAPI
    worker.ts                  Distribution continue de l'outbox
    cli.ts                     Commander : migrations, import et maintenance
    auth/                      Sessions et authentification
    common/                    AccÃ¨s, pagination, reprise SQL
    profiles/                  Profil, disponibilitÃ©s, qualifications et RPPS
    organizations/             Affiliations et demandes d'Ã©tablissement
    missions/                  Missions, candidatures et affectations
    domain/                    RÃ¨gles pures et score
    matching/                  Classement et explications MongoDB
    listings/                  Recherche, favoris, tableaux de bord, historique
    documents/                 Fichiers privÃ©s, chiffrement et banque fictive
    automation/                Outbox, notifications, relances, confirmation
    public-data/               Adaptateur des offres externes
    reference-data/            RÃ©fÃ©rentiels
    database/                  Connexions, migrations, distance PostGIS
    demo/                      DonnÃ©es fictives
  workflows/                   matches.json, reminders.json, confirmation.json
  infra/compose.yaml           PostgreSQL, MongoDB et profil n8n
  scripts/                     Installation locale, contrÃ´les et sauvegarde Git
  docs_intern/                        Exigences, schÃ©mas, OpenAPI, preuves et historique
  data/                        Fichiers locaux privÃ©s, ignorÃ©s par Git
  backups/                     Sauvegardes locales, ignorÃ©es par Git
  package.json                 Commandes et workspace npm
  package-lock.json            Versions exactes des dÃ©pendances
```

Les petits modules regroupent contrÃ´leurs et services dans leur fichier `*.module.ts`. Les migrations sont dans `database/schema.ts`, `extended.ts` et `harden.ts` et `finess.ts`. Il n'existe pas encore de rÃ©pertoire frontend dans ce dÃ©pÃ´t.

Une requÃªte passe par la session, les protections d'Ã©criture, la validation des DTO, les droits du cas d'usage puis les rÃ¨gles mÃ©tier et la persistance. Les Ã©critures critiques partagent une transaction et revÃ©rifient les droits actuels. Les rÃ©ponses d'erreur masquent les dÃ©tails internes et comportent un identifiant de requÃªte.

L'affectation verrouille mission, profil puis candidature. Les contraintes SQL garantissent un seul poste actif par mission et interdisent les chevauchements d'affectations d'un infirmier. Les appels fournisseurs et n8n restent hors de la transaction d'affectation.

## Travail restant

1. ComplÃ©ter pagination des listes secondaires, idempotence des autres commandes sensibles et schÃ©mas OpenAPI de sortie.
2. Valider les accÃ¨s rÃ©els ANS et France Travail, puis la provenance et l'usage visible des donnÃ©es.
3. IntÃ©grer le frontend et les parcours de recette.
4. Exercer les reprises aprÃ¨s crash du worker et l'expiration concurrente de gÃ©nÃ©ration PDF.
5. VÃ©rifier le dÃ©ploiement TLS, les privilÃ¨ges des bases et la restauration complÃ¨te.

La [note de reprise — archive](https://github.com/lebretyves/Infimactch_Prod/blob/fd68a377da28a76151483529ac62473eed99d264/docs/REPRISE_BACKEND_V1.md) dÃ©taille les limites. Le [planning](PLANNING_4_PERSONNES_11_JOURS.md) est un plan d'Ã©quipe, pas un relevÃ© de temps rÃ©ellement passÃ©.

## RÃ©fÃ©rences

- [Exigences V1 et acceptation](REQUIREMENTS_V1.md)
- [SchÃ©ma de l'architecture](SCHEMA_ARCHITECTURE_V1.md)
- [Flux mÃ©tier et techniques](FLUX_V1.md)
- [Prompt source figÃ© — archive](https://github.com/lebretyves/Infimactch_Prod/blob/fd68a377da28a76151483529ac62473eed99d264/docs/references/Interimatch_Sante_Mega_Prompt_Backend_V1.md)
- [Architecture source figÃ©e](references/Interimatch_Sante_Architecture_Backend_V1.md)
- [Matrice complÃ¨te — archive](https://github.com/lebretyves/Infimactch_Prod/blob/fd68a377da28a76151483529ac62473eed99d264/docs/MATRICE_VALIDATION_V1.csv)

Voir la [recette actuelle](RECETTE_BACKEND_V1.md) : reprises de reservation outbox/PDF testees, cas RPPS positif confirme.
