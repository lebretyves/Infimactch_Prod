# Flux métier et techniques — 21 septembre 2026

Ces schémas décrivent les mécanismes implémentés, pas une nouvelle recette publiée. Voir les [exigences](REQUIREMENTS_V1.md), les [automatisations](AUTOMATISATIONS.md) et les [réserves du rendu](rendu/README.md). Les appels utilisateurs portent le préfixe `/api/v1`.


## Parcours utilisateur complet

```mermaid
flowchart TD
    signup["Création du compte"] --> discordChoice["Configuration Discord proposée, facultative"]
    discordChoice --> profile["Profil, qualifications, disponibilités"]
    profile --> zone["Zone de recherche et alertes enregistrée"]
    zone --> search["Recherche de missions"]
    search --> external["Offre externe : redirection fournisseur"]
    search --> apply["Mission interne : candidature et consentement"]
    apply --> decision["Décision humaine de l'agence"]
    decision --> assignment["Affectation validée et agenda"]
    assignment --> event["Événement de confirmation"]
    event --> pdf["PDF privé et notifications selon configuration"]
    assignment --> cancel["Annulation autorisée"]
    cancel --> follow["États actualisés, document et notifications d'annulation"]
```

Le domicile reste distinct de la zone de recherche et d'alertes. Une recherche ponctuelle ne modifie pas les préférences enregistrées. Le RIB est facultatif. Les parcours PDF et notification sont asynchrones : la réussite de l'affectation n'atteste pas leur achèvement.

## Authentification et écritures

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant PostgreSQL
    Client->>API: GET auth/csrf
    API->>PostgreSQL: Session anonyme
    API-->>Client: Cookie et csrfToken
    Client->>API: POST auth/login avec cookie, Origin, X-CSRF-Token
    API->>PostgreSQL: Lire compte et vérifier session
    API->>API: Vérifier Argon2id et renouveler session
    API->>PostgreSQL: Persister nouvelle session
    API-->>Client: Nouveau cookie et nouveau csrfToken
    Client->>API: Écriture avec les nouveaux éléments
    API->>API: Valider DTO et droits
    API->>PostgreSQL: Mutation autorisée
    API-->>Client: Résultat
```

Un échec d'authentification ou de protection d'écriture interrompt ce parcours. La déconnexion détruit la session serveur. Les routes d'automatisation emploient une authentification de service distincte.

## RPPS : aucun contrôle manuel par l'agence

```mermaid
flowchart TD
    input["Saisie ou modification du RPPS"] --> pending["PENDING et incrément de version"]
    pending --> request["Recherche exacte ANS"]
    request --> current{"Numéro et version encore courants ?"}
    current -->|"Non"| ignored["Ignorer le retour tardif"]
    current -->|"Oui"| result{"Réponse exploitable ?"}
    result -->|"Identifiant exact retrouvé"| found["FOUND"]
    result -->|"Recherche exacte vide"| missing["NOT_FOUND"]
    result -->|"Panne, clé absente ou réponse incohérente"| waiting["PENDING"]
    found --> rules["Vérifier aussi les autres critères métier"]
    missing --> blocked["Candidature interne et nouvelle affectation bloquées"]
    waiting --> hold["Actions en attente jusqu'à vérification réussie"]
```

`NOT_CHECKED` ne satisfait pas non plus le contrôle. Le profil et la recherche restent accessibles. Un changement RPPS ne rétro-annule pas une affectation. Les réponses fournisseurs des tests sont simulées ; l'accès ANS réel reste à valider.

## Recherche et matching

```mermaid
flowchart TD
    search["Recherche manuelle"] --> branches["OU entre branches IDE, IADE, IBODE"]
    branches --> filters["ET entre filtres de la branche"]
    filters --> listings["Résultats internes et externes distingués"]
    listings --> external["Offre externe : candidature par redirection"]
    profile["Profil et missions ouvertes"] --> gate["Qualifications, prérequis, RPPS, dates, mobilité, conflits"]
    gate -->|"Non éligible"| excluded["Exclusion du classement"]
    gate -->|"Éligible"| score["Score déterministe C, Z, D, E"]
    score --> rank["Classement global puis pagination"]
    rank --> trace["Explication MongoDB minimisée et versionnée"]
    trace --> output["Résultat et statut de disponibilité de l'historique"]
```

Le score par défaut est `100 × (0,45 C + 0,25 Z + 0,20 D + 0,10 E)`. Les pondérations configurées changent la version des règles. La distance est calculée avec PostGIS. Les disponibilités doivent couvrir tout l'intervalle, après retrait des indisponibilités, avec des bornes semi-ouvertes.

Les champs externes inconnus excluent une offre des filtres stricts correspondants. Une offre externe ne devient pas une mission interne et ne reçoit pas le score complet interne. Les explications expirées, liées à un profil ou à une mission modifiés sont signalées comme périmées.

## Candidature et affectation humaine

```mermaid
sequenceDiagram
    participant Infirmier
    participant Agence
    participant API
    participant PostgreSQL
    Infirmier->>API: Candidature avec consentement à la version
    API->>PostgreSQL: Contrôles et candidature SUBMITTED
    Agence->>API: Sélection ou refus selon ses droits
    Agence->>API: Affectation avec applicationId et Idempotency-Key
    API->>PostgreSQL: Transaction et verrous mission, profil, candidature
    API->>API: Recontrôler droits, consentement et éligibilité
    API->>PostgreSQL: Assignment ACTIVE, application ACCEPTED, mission FILLED
    API->>PostgreSQL: Audit et outbox AssignmentCreated
    PostgreSQL-->>API: Commit
    API-->>Agence: Affectation validée
```

Le même identifiant d'idempotence avec le même contenu renvoie le résultat initial ; un contenu différent produit un conflit. Un conflit de disponibilité empêche le commit. Une modification substantielle ou une réouverture exige un consentement à jour. La sélection seule ne constitue pas une affectation.

## États des missions

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> OPEN: publication
    OPEN --> FILLED: affectation validée
    FILLED --> COMPLETED: clôture autorisée
    DRAFT --> CANCELLED: annulation
    OPEN --> CANCELLED: annulation
    FILLED --> CANCELLED: annulation
    CANCELLED --> DRAFT: réouverture avec nouvelle version
```

Une mission terminée ne peut pas être rouverte. L'annulation met à jour mission, affectation et statut de confirmation dans une transaction ; le document historique reste identifiable comme annulé.

## Automatisations et reprise

Les workflows de matching, confirmation et annulation sont déclenchés par événements. Les rappels et imports disposent de parcours séparés. La reprise cloud est publiée toutes les **quatre heures**, avec une tentative immédiate après les écritures applicatives éligibles.

Voir le [catalogue et les schémas d'automatisation](AUTOMATISATIONS.md) pour les déclencheurs, les limites de débit, les reprises et les preuves attendues.

## Confirmation et documents privés

```mermaid
flowchart TD
    event["AssignmentCreated après commit"] --> lease["Réserver la génération avec jeton et expiration"]
    lease --> pdf["Créer un PDF fictif non signé"]
    pdf --> stage["Métadonnées STAGING et chiffrement AES-256-GCM"]
    stage --> privateFile["Écrire le fichier privé"]
    privateFile --> check["Revérifier affectation et version"]
    check -->|"Toujours valable"| ready["Confirmation READY et reçu final"]
    check -->|"Annulée"| cancelled["Confirmation CANCELLED"]
    ready --> auth["Téléchargement : droits actuels du participant"]
    auth --> decrypt["Vérifier le tag et déchiffrer"]
    decrypt --> download["Réponse privée en pièce jointe"]
    stage -.->|"Interruption"| recover["CLI reconcile-documents"]
    recover --> valid{"Fichier, clé, tag et taille valides ?"}
    valid -->|"Oui"| docReady["Document READY"]
    valid -->|"Non"| keep["Document maintenu en attente"]
```

La réconciliation documentaire ne remplace pas la reprise métier de la confirmation. Les anciennes clés restent nécessaires aux anciens documents. Aucun document, clé ou fichier `.env` n'entre dans le bundle Git. Ce PDF est une confirmation applicative, pas un contrat de travail signé. Les agences restent responsables de l'emploi et de la rémunération.

## Referentiel FINESS

```mermaid
flowchart LR
    source["Snapshot officiel ANS gzip"] --> streaming["Lecture JSON en flux et empreinte"]
    streaming --> validation["Identifiants, etats et coordonnees source"]
    validation --> transaction["Remplacement atomique du referentiel SQL"]
    transaction --> api["Recherche paginee ou numero exact"]
    api --> found["Presence dans le snapshot et provenance datee"]
    api --> missing["Absence dans le snapshot, aucune preuve nationale actuelle"]
```

Les donnees d'identite sans coordonnees restent consultables. Ce flux ne modifie ni les droits des organisations ni les lieux des missions. Voir [l'acquisition reelle](ACQUISITION_REELLE.md).

## Corrections de la recette du 15 septembre 2026

Les commandes mission, candidature et creation de besoin suivent : droits actuels -> controle Idempotency-Key/contenu -> lecture du recu ou mutation -> recu dans la meme transaction. Le classement ne contient plus de dossiers ineligibles. Une confirmation reste READY apres cloture normale ; annulation et cloture restent distinctes.

Apres cinq echecs de distribution : EXHAUSTED -> commande operateur retry-outbox -> evenement remis en attente, sauf reservation active. La reprise est auditee. Voir les [exigences](REQUIREMENTS_V1.md) et les [automatisations](AUTOMATISATIONS.md).
