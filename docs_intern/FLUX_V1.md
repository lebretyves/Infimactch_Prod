# Flux mÃ©tier et techniques V1

Ces schÃ©mas dÃ©crivent le backend prÃ©sent. Les scÃ©narios testÃ©s et les limites sont dans les [exigences](REQUIREMENTS_V1.md) et la [reprise — archive](https://github.com/lebretyves/Infimactch_Prod/blob/fd68a377da28a76151483529ac62473eed99d264/docs/REPRISE_BACKEND_V1.md). Les appels utilisateurs portent le prÃ©fixe `/api/v1`.

## Authentification et Ã©critures

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant PostgreSQL
    Client->>API: GET auth/csrf
    API->>PostgreSQL: Session anonyme
    API-->>Client: Cookie et csrfToken
    Client->>API: POST auth/login avec cookie, Origin, X-CSRF-Token
    API->>PostgreSQL: Lire compte et vÃ©rifier session
    API->>API: VÃ©rifier Argon2id et renouveler session
    API->>PostgreSQL: Persister nouvelle session
    API-->>Client: Nouveau cookie et nouveau csrfToken
    Client->>API: Ã‰criture avec les nouveaux Ã©lÃ©ments
    API->>API: Valider DTO et droits
    API->>PostgreSQL: Mutation autorisÃ©e
    API-->>Client: RÃ©sultat
```

Un Ã©chec d'authentification ou de protection d'Ã©criture interrompt ce parcours. La dÃ©connexion dÃ©truit la session serveur. Les routes d'automatisation emploient une authentification de service distincte.

## RPPS : aucun contrÃ´le manuel par l'agence

```mermaid
flowchart TD
    input["Saisie ou modification du RPPS"] --> pending["PENDING et incrÃ©ment de version"]
    pending --> request["Recherche exacte ANS"]
    request --> current{"NumÃ©ro et version encore courants ?"}
    current -->|"Non"| ignored["Ignorer le retour tardif"]
    current -->|"Oui"| result{"RÃ©ponse exploitable ?"}
    result -->|"Identifiant exact retrouvÃ©"| found["FOUND"]
    result -->|"Recherche exacte vide"| missing["NOT_FOUND"]
    result -->|"Panne, clÃ© absente ou rÃ©ponse incohÃ©rente"| waiting["PENDING"]
    found --> rules["VÃ©rifier aussi les autres critÃ¨res mÃ©tier"]
    missing --> blocked["Candidature interne et nouvelle affectation bloquÃ©es"]
    waiting --> hold["Actions en attente jusqu'Ã  vÃ©rification rÃ©ussie"]
```

`NOT_CHECKED` ne satisfait pas non plus le contrÃ´le. Le profil et la recherche restent accessibles. Un changement RPPS ne rÃ©tro-annule pas une affectation. Les rÃ©ponses fournisseurs des tests sont simulÃ©es ; l'accÃ¨s ANS rÃ©el reste Ã  valider.

## Recherche et matching

```mermaid
flowchart TD
    search["Recherche manuelle"] --> branches["OU entre branches IDE, IADE, IBODE"]
    branches --> filters["ET entre filtres de la branche"]
    filters --> listings["RÃ©sultats internes et externes distinguÃ©s"]
    listings --> external["Offre externe : candidature par redirection"]
    profile["Profil et missions ouvertes"] --> gate["Qualifications, prÃ©requis, RPPS, dates, mobilitÃ©, conflits"]
    gate -->|"Non Ã©ligible"| excluded["Exclusion du classement"]
    gate -->|"Ã‰ligible"| score["Score dÃ©terministe C, Z, D, E"]
    score --> rank["Classement global puis pagination"]
    rank --> trace["Explication MongoDB minimisÃ©e et versionnÃ©e"]
    trace --> output["RÃ©sultat et statut de disponibilitÃ© de l'historique"]
```

Le score par dÃ©faut est `100 Ã— (0,45 C + 0,25 Z + 0,20 D + 0,10 E)`. Les pondÃ©rations configurÃ©es changent la version des rÃ¨gles. La distance est calculÃ©e avec PostGIS. Les disponibilitÃ©s doivent couvrir tout l'intervalle, aprÃ¨s retrait des indisponibilitÃ©s, avec des bornes semi-ouvertes.

Les champs externes inconnus excluent une offre des filtres stricts correspondants. Une offre externe ne devient pas une mission interne et ne reÃ§oit pas le score complet interne. Les explications expirÃ©es, liÃ©es Ã  un profil ou Ã  une mission modifiÃ©s sont signalÃ©es comme pÃ©rimÃ©es.

## Candidature et affectation humaine

```mermaid
sequenceDiagram
    participant Infirmier
    participant Agence
    participant API
    participant PostgreSQL
    Infirmier->>API: Candidature avec consentement Ã  la version
    API->>PostgreSQL: ContrÃ´les et candidature SUBMITTED
    Agence->>API: SÃ©lection ou refus selon ses droits
    Agence->>API: Affectation avec applicationId et Idempotency-Key
    API->>PostgreSQL: Transaction et verrous mission, profil, candidature
    API->>API: RecontrÃ´ler droits, consentement et Ã©ligibilitÃ©
    API->>PostgreSQL: Assignment ACTIVE, application ACCEPTED, mission FILLED
    API->>PostgreSQL: Audit et outbox AssignmentCreated
    PostgreSQL-->>API: Commit
    API-->>Agence: Affectation validÃ©e
```

Le mÃªme identifiant d'idempotence avec le mÃªme contenu renvoie le rÃ©sultat initial ; un contenu diffÃ©rent produit un conflit. Un conflit de disponibilitÃ© empÃªche le commit. Une modification substantielle ou une rÃ©ouverture exige un consentement Ã  jour. La sÃ©lection seule ne constitue pas une affectation.

## Ã‰tats des missions

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> OPEN: publication
    OPEN --> FILLED: affectation validÃ©e
    FILLED --> COMPLETED: clÃ´ture autorisÃ©e
    DRAFT --> CANCELLED: annulation
    OPEN --> CANCELLED: annulation
    FILLED --> CANCELLED: annulation
    CANCELLED --> DRAFT: rÃ©ouverture avec nouvelle version
```

Une mission terminÃ©e ne peut pas Ãªtre rouverte. L'annulation met Ã  jour mission, affectation et statut de confirmation dans une transaction ; le document historique reste identifiable comme annulÃ©.

## Trois workflows n8n

```mermaid
sequenceDiagram
    participant Worker
    participant PostgreSQL
    participant n8n
    participant API
    Worker->>PostgreSQL: RÃ©server un Ã©vÃ©nement aprÃ¨s commit
    PostgreSQL-->>Worker: Ã‰vÃ©nement et rÃ©servation temporaire
    Worker->>n8n: Webhook authentifiÃ© de matching ou confirmation
    n8n->>API: Route interne authentifiÃ©e
    API->>PostgreSQL: RecontrÃ´les, rÃ©sultat mÃ©tier et reÃ§u final
    n8n-->>Worker: Retour HTTP
    Worker->>PostgreSQL: VÃ©rifier le reÃ§u mÃ©tier final
    Worker->>PostgreSQL: Marquer le traitement ou programmer une reprise
```

- A â€” `matches.json` : mission publiÃ©e ou demande de recalcul â†’ Ã©ligibilitÃ© et prÃ©fÃ©rences actuelles â†’ notification interne sans doublon.
- B â€” `reminders.json` : dÃ©clenchement horaire n8n â†’ contrÃ´le d'une mission ouverte, Ã  venir et suffisamment ancienne â†’ relance unique par fenÃªtre. Un webhook authentifiÃ© permet aussi la recette.
- C â€” `confirmation.json` : Ã©vÃ©nement `AssignmentCreated` â†’ gÃ©nÃ©ration backend du PDF fictif non signÃ© â†’ accÃ¨s privÃ© et notifications.

Le worker rÃ©serve pendant 90 secondes et reprend avec temporisation exponentielle, au maximum cinq tentatives. Un HTTP 200 sans reÃ§u final ne suffit pas. Une panne d'automatisation n'annule pas l'affectation dÃ©jÃ  validÃ©e.

## Confirmation et documents privÃ©s

```mermaid
flowchart TD
    event["AssignmentCreated aprÃ¨s commit"] --> lease["RÃ©server la gÃ©nÃ©ration avec jeton et expiration"]
    lease --> pdf["CrÃ©er un PDF fictif non signÃ©"]
    pdf --> stage["MÃ©tadonnÃ©es STAGING et chiffrement AES-256-GCM"]
    stage --> privateFile["Ã‰crire le fichier privÃ©"]
    privateFile --> check["RevÃ©rifier affectation et version"]
    check -->|"Toujours valable"| ready["Confirmation READY et reÃ§u final"]
    check -->|"AnnulÃ©e"| cancelled["Confirmation CANCELLED"]
    ready --> auth["TÃ©lÃ©chargement : droits actuels du participant"]
    auth --> decrypt["VÃ©rifier le tag et dÃ©chiffrer"]
    decrypt --> download["RÃ©ponse privÃ©e en piÃ¨ce jointe"]
    stage -.->|"Interruption"| recover["CLI reconcile-documents"]
    recover --> valid{"Fichier, clÃ©, tag et taille valides ?"}
    valid -->|"Oui"| docReady["Document READY"]
    valid -->|"Non"| keep["Document maintenu en attente"]
```

La rÃ©conciliation documentaire ne remplace pas la reprise mÃ©tier de la confirmation. Les anciennes clÃ©s restent nÃ©cessaires aux anciens documents. Aucun document, clÃ© ou fichier `.env` n'entre dans le bundle Git. Ce PDF n'est pas un contrat signÃ© ; contrats F24 en V3, attestation en V2 et rÃ©fÃ©rences hors V1.

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

Apres cinq echecs de distribution : EXHAUSTED -> commande operateur retry-outbox -> evenement remis en attente, sauf reservation active. La reprise est auditee. Voir le [bilan](RECETTE_BACKEND_V1.md).
