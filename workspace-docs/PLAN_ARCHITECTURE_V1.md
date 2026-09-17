# Plan technique de l'architecture V1
Cible pour quatre personnes sur onze jours, rendu fixe. Ce plan décrit les fichiers à créer dans le futur dépôt applicatif ; ces répertoires de code ne sont pas présentés comme déjà implémentés.

## 1. Organisation du dépôt
```text
interimatch/
  frontend/                         Next.js et TypeScript
    src/
      app/                          Pages publiques et espaces privés
      components/                   Composants partagés
      features/                     Profils, recherche, calendrier, dossiers
      lib/api/                      Client généré et gestion des erreurs
  backend/
    src/
      main.ts                       Démarrage HTTP
      app.module.ts                 Assemblage
      cli.ts                        Commandes d'import, contexte sans HTTP
      modules/
        auth/
        organizations/
        profiles/
        facilities/
        availability/
        missions/
        applications/
        assignments/
        search/
        favorites/
        matching/
        professional-verification/
        documents/
        mission-confirmations/
        notifications/
        public-data/
        automation/
        audit/
        dashboards/
      infrastructure/
        database/                   Connexions SQL/MongoDB
        storage/                    Adaptateur de stockage privé
        config/                     Validation de configuration
    migrations/                     Migrations TypeORM et SQL explicite
    test/
      integration/                  Bases réelles isolées
      e2e/                          Parcours HTTP
      fixtures/                     Données fictives identifiées
  packages/
    api-client/                     Types/client issus d'OpenAPI
  workflows/
    match-notification.json
    unfilled-reminder.json
    assignment-confirmation.json
  infra/
    compose.yaml
    proxy/                          Routage et TLS
  docs/
    decisions/
    preuves/
    REPRISE_BACKEND_V1.md
    MATRICE_VALIDATION_V1.csv
  .env.example                      Noms de variables sans secrets
  README.md
```

Un workspace simple suffit ; aucun orchestrateur de monorepo supplémentaire nécessaire. Si le dépôt réel possède déjà une structure cohérente, garder ses noms et documenter la correspondance.

## 2. Structure d'un module
```text
missions/
  missions.module.ts
  missions.controller.ts
  dto/
  application/                      Créer, publier, annuler, clôturer
  domain/                           États et règles pures
  persistence/                      Entités et repositories SQL
```

Les petits modules peuvent regrouper certains fichiers ; ne pas créer une interface pour chaque classe sans usage. Un module possède ses écritures et exporte des services précis. Aucun accès direct aux tables d'un autre module par ses contrôleurs.

## 3. Circulation d'une requête
HTTP → validation DTO → session et autorisation → cas d'usage → règles métier → transaction/repository → DTO de sortie.

La même instance de transaction est transmise aux services d'une opération multi-modules. Les erreurs donnent code stable, message utile et requestId ; aucune entité contenant hash, secrets ou RIB n'est sérialisée directement.

## 4. Flux critiques
| Flux | Séquence |
|---|---|
| RPPS | Saisie → PENDING → appel API exact → FOUND ou NOT_FOUND ; panne → PENDING et reprise |
| Import public | Acquisition → staging → nettoyage → normalisation → dédoublonnage → lot publié et rapport |
| Matching | Éligibilité → score versionné → écriture MongoDB → explication autorisée |
| Affectation | Verrous coopératifs → contrôles actuels → Assignment/Application/Mission/audit/outbox → commit |
| Notification | Outbox réservée → n8n → action API idempotente → reçu final |
| Confirmation | Affectation validée → n8n → PDF backend privé → statut READY → notification |
| Annulation | Mission et affectation CANCELLED dans la même transaction → événement → document signalé annulé |

Les droits sont vérifiés dans les listes comme dans les détails. Le RPPS retrouvé ne remplace pas les autres qualifications. L'affectation est validée humainement par l'agence ; cela n'ajoute pas une validation manuelle RPPS.

## 5. Répartition technique à quatre
| Personne / rôle | Responsabilité principale |
|---|---|
| A | Backend métier, auth, profils, missions, candidatures, consentements et affectations |
| B | Référentiels, recherche/PostGIS, matching/MongoDB, RPPS et import CLI |
| C | Frontend et intégration des parcours, accessibilité, responsive et SEO |
| D | Infrastructure/CI, stockage chiffré, confirmation et n8n ; coordination recette |

Les tests sont écrits par chaque responsable, avec revue croisée. Le détail quotidien figure dans le planning lié ci-dessous.

## 6. Ordre de construction
1. Contrats API, schéma SQL, démarrage local, accès externes et CI.
2. Auth, affiliations et premier parcours profil → mission.
3. Recherche, disponibilités et matching.
4. Candidature, consentement et affectation atomique.
5. Documents, RPPS, import public et favoris intégrés au frontend.
6. Trois workflows, reprises et génération de confirmation.
7. Recette complète, TLS, restauration, couverture, exports et soutenance.

L'ordre est logique et les lots avancent en parallèle selon leurs dépendances. Commencer les tests d'accès externes dès le premier jour. Ne pas reporter toute l'intégration ou tous les tests à la fin.

## 7. Documents de référence
- [Architecture détaillée](../Interimatch_Sante_Architecture_Backend_V1.md)
- [Prompt de développement](../Interimatch_Sante_Mega_Prompt_Backend_V1.md)
- [Schéma](SCHEMA_ARCHITECTURE_V1.md)
- [Planning quatre personnes / onze jours](PLANNING_4_PERSONNES_11_JOURS.md)
- [Matrice de validation](MATRICE_VALIDATION_V1.csv)
- [Accès API et preuves manquantes](ACCES_API_V1.md)

Les identifiants de base, clés de chiffrement et tokens ne sont jamais placés dans le client généré, les exports n8n ou le dépôt.
