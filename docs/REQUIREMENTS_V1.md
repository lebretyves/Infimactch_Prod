# Exigences InfiMatch V1 — état local au 16 septembre 2026

> Pour le reste à faire actuel, utiliser le [bilan consolidé main](BILAN_V1_MAIN_2026-09-16.md), qui tient compte des dernières corrections et des commits frontend annulés.
> Mise à jour : filtre intérim contextualisé, retrait des offres explicitement non conformes et commandes de conservation récupérés. Voir [les corrections, preuves et limites de conservation](RECUPERATION_BACKEND_RETENTION_2026-09-16.md).
> Mise à jour postérieure : les sept évolutions parsing/frontend sont développées et testées. Voir [la livraison et ses limites](LIVRAISON_SEPT_EVOLUTIONS_V1.md). 194 annonces recalculées ; 149 tests backend isolés et 12 tests frontend réussis. Les statuts antérieurs ci-dessous restent historiques pour ces points.

## Portée et sources

Ce document décrit l'état actuel du projet local, les critères V1 et les validations restantes. Il remplace les anciens statuts de ce fichier, conservés dans [l'archive](history/requirements-2026-09-16/REQUIREMENTS_AVANT_MISE_A_JOUR.md). Les changements locaux récents ne sont pas tous associés à un commit publié : les tests ci-dessous ne prouvent pas une livraison GitHub de ces changements.

Le [sujet kickoff](references/D-WEB-901-project.pdf), le [catalogue](references/Interimatch_Sante_Catalogue_Complet_Fonctionnalites.docx), les [décisions utilisateur](history/DISCUSSION.md) et le [périmètre consolidé](references/Interimatch_Sante_Mega_Prompt_Backend_V1.md) restent les références. La [matrice de validation](MATRICE_VALIDATION_V1.csv) conserve les identifiants et critères d'origine. Les anciens bilans et couvertures sont des preuves datées, pas l'état de la dernière révision.

- **Implémenté localement** : code raccordé, sans garantie de recette exhaustive.
- **Testé sur scénarios** : seuls les scénarios et l'environnement indiqués sont vérifiés.
- **Expérimental** : essai séparé, non utilisé automatiquement par les écrans ou le matching.
- **Restant** : travail ou preuve encore nécessaire. Aucun pourcentage de complétude globale n'est annoncé.

## Fonctionnalités V1

| ID | Exigence / critère conservé | État actuel et reste |
|---|---|---|
| F01 | Comptes infirmier et entreprise ; établissement/agence distincts ; inscription, connexion, déconnexion, isolation des droits | Frontend/backend raccordés. Authentification classique et Google présentes. Recette complète des rôles et de Google sur l'origine HTTPS de livraison restante. |
| F02 | Profil privé, qualifications, compétences, expérience, disponibilité, mobilité et banque fictive | Champs et parcours présents. Recette exhaustive restante ; ne pas assimiler une déclaration de diplôme à une vérification. |
| F02 bis | FINESS obligatoire pour établissement, coordonnées, référent et CGU ; agence distincte | Assistance FINESS raccordée au formulaire. Affiliations agence–établissement par CLI opérateur ; procédure à documenter et rejouer. |
| F03 | Tableau infirmier : propositions, favoris, disponibilités, profil | Tableau raccordé. Recommandations disponibles dans Missions ; bloc d'offres de l'accueil encore fondé sur le catalogue, à aligner. |
| F04 + F16 | Matching déterministe, admissibilité avant score, explication versionnée ; décision humaine | Recommandations et explications candidat raccordées. Comptes désactivés exclus des nouvelles propositions/actions. Recette globale restante. |
| F05 | Recherche multi-qualifications, filtres propres aux branches IDE/IADE/IBODE, dates et rayon | Filtres avancés raccordés. Valider toutes les combinaisons, pagination et informations externes inconnues. |
| F06 | Favoris privés offres/établissements, ajout/retrait, absence de doublons, expiration | Présents ; recette finale des offres expirées/inactives et des états d'erreur restante. |
| F07 | Candidature interne suivie/retirable, consentement, sélection/refus selon droits ; externe par redirection | Parcours raccordés, transactions testées. Aucun suivi de l'issue sur le site externe. Recette complète restante. |
| F08 | Disponibilités/indisponibilités et mobilité ; couverture de la période | Édition par sous-périodes, nuits et conflits testés. Conserver le fonctionnement convenu, sans inventer une disponibilité depuis une annonce. |
| F09 | Historique et calendrier des affectations ; état métier distinct du temps | Missions visibles dans le calendrier frontend. Rejouer à venir/en cours/passées/annulées sur la livraison. |
| F12 | Notification de correspondance, relance de mission et confirmation PDF après affectation humaine | Trois workflows n8n exécutés dans l'environnement isolé. Notifications internes ; aucun canal email/SMS supplémentaire réputé validé. Préférences frontend à raccorder. |
| F15 | Acquisition publique, nettoyage, provenance, dédoublonnage et import rejouable | France Travail et JobsPipe opérationnels ; imports locaux planifiés. Exclusion CDI ajoutée. Retrait exhaustif des annonces disparues chez le fournisseur restant. |
| F17 | Créer/modifier/publier/annuler/rouvrir/clôturer une mission selon droits et états | Écrans raccordés, transitions critiques testées. Établissement exprime le besoin ; agence gère la mission. Recette complète restante. |
| F18 | RPPS exact : trouvé/non trouvé/en attente ; réponse tardive sans écrasement | Adaptateur et scénarios présents, preuves réelles antérieures. Revalider fournisseur pour la démonstration. RPPS trouvé ne prouve pas l'identité du déclarant. |
| F19 | Tableau agence, candidats proposés, sélection/refus et affectation humaine atomique | Écran raccordé. Vérifier la navigation au-delà des 20 premières propositions et la recette complète. |
| F20 | Données publiques visibles avec source et lien, nettoyage explicable | Offres affichées. Correspondance externe détaillée encore à raccorder ; parseur enrichi expérimental, aucun score complet externe inventé. |
| F22 | Justificatif fictif contrôlé, chiffré, accès réservé | Quota corrigé, PDF de confirmation exempté, idempotence et nettoyage concurrent sécurisés. Conservation globale et restauration sur jeu métier représentatif restantes. |

Les qualifications IDE, IADE et IBODE ne sont pas des rôles d'autorisation et ne créent aucune équivalence automatique.

## Offres externes : décisions complémentaires validées par l'utilisateur

### Sources et calendrier d'import

- France Travail conservé ; JobsPipe ajouté comme source supplémentaire. Premier lot JobsPipe : 10 offres enregistrées avant contrôle CDI.
- Chaque jour, heure de Paris : **00 h, 07 h, 09 h, 11 h, 13 h, 15 h, 17 h**. Il n'y a pas de lancement à 18 h.
- JobsPipe : une recherche par lancement, 10 résultats maximum. France Travail : authentification puis quatre recherches, 10 résultats maximum par mot-clé avant dédoublonnage.
- Tâches Windows : `InfiMatch-JobsPipe-Import` et `InfiMatch-FranceTravail-Import`. Pas de rattrapage des horaires manqués, pas de relance automatique, pas de chevauchement d'une même tâche ; limite de cinq minutes.
- PC éveillé, session Windows ouverte, Docker, PostgreSQL et Vault disponibles. Installation et déclencheurs vérifiés ; cela ne constitue pas une preuve de succès de chaque exécution automatique.
- Aucun engagement sur le quota disponible : surveiller le compte fournisseur et les journaux. Aucun abonnement payant ajouté.

Détails : [JobsPipe](JOBSPIPE_V1.md), [France Travail](FRANCE_TRAVAIL_PLANIFICATION.md). Scripts dans `scripts/security/`, journaux privés dans `data/security/`.

### Exclusion des CDI

L'utilisateur demande d'exclure les postes explicitement en CDI, y compris les annonces proposant CDD ou CDI. Les futurs imports des deux sources appliquent ce contrôle. Une annonce existante devenue CDI dans un lot réimporté est désactivée ; elle n'est pas supprimée.

Le texte de présentation d'une agence multi-contrats, une possibilité future de CDI ou le remplacement d'un salarié en CDI ne suffisent pas à exclure une mission. La règle reste un contrôle textuel conservateur, pas une preuve de détection exhaustive.

Application locale : **7 annonces désactivées (6 JobsPipe et 1 France Travail)** après relecture des extraits. État antérieur privé : `data/parser-pilot/cdi-before.json`. Commande : `scripts/experiments/exclude-cdi.mjs`. Code : `backend/src/public-data/contract-policy.ts`.

Restant : renforcer la preuve positive d'intérim dans l'import JobsPipe. Un mot « intérim » dans la présentation du recruteur ne démontre pas le contrat du poste. Les CDI exclus ne rendent pas automatiquement toutes les autres annonces conformes au périmètre.

### Parseur métier — prototype uniquement

Autorisation actuelle : développer et tester un parseur sans LLM sur les annonces existantes. **Aucune intégration automatique des extractions enrichies au profil, aux filtres ou au matching.** L'exclusion CDI est la seule règle de ce lot appliquée au catalogue.

Échantillon figé : **24 annonces, 14 France Travail et 10 JobsPipe**, avec IDE/IADE/IBODE. Comparaison avec les descriptions intégrales disponibles en base et leur provenance stockée ; aucun nouvel appel fournisseur pour ces essais.

Champs étudiés : qualification, service, spécialité, population, activités, diplômes/RPPS/AFGSU, expérience et domaine, matériel, langues, contrat, période/durée, quotité, horaires/alternance, pauses, roulements, salaire/composantes, avantages, mobilité et contexte d'équipe.

Chaque extraction conserve sa preuve et distingue explicite, souhaité, conditionnel, négation, ambigu ou inconnu. Les dates de publication ne sont pas des dates de mission ; une amplitude n'est pas une durée de travail ; les certifications alternatives ne sont pas des exigences cumulées.

- 89 points textuels choisis à la relecture retrouvés : mesure de présence de preuves ciblées, **pas 100 % de précision ou de couverture**.
- 14 tests du prototype réussis, dont unités salariales inconnues, milliers, négations, alternatives et horaires de nuit.
- Essai de structuration complémentaire : 8 fourchettes salariales, 4 mentions de durées de poste, 10 paires horaires sur ce lot ; ces nombres ne constituent pas une validation exhaustive.
- Contradictions signalées : expérience texte/provenance, contrat importé/texte, jour/nuit et titre IBODE/diplôme souhaité.
- Certains textes sont coupés ou contiennent des placeholders : aucune donnée manquante ne doit être inventée.

Extension V3 : services pneumologie/soins intensifs/n?phrologie/neurophysiologie/chirurgie, gestes ventilation/EEG/pansements/injections/perfusions/drains, domicile, acomptes, taux et indemnit?s, pause et jours hebdomadaires. Handicap candidat distinct de la population soign?e ; transport sanitaire distinct des avantages ; contradictions plein/partiel signal?es. Sur 40 points cibl?s du nouveau lot, 9 retrouv?s avant et 40 apr?s ajustement ; ce lot a servi ? am?liorer les r?gles et ne constitue pas une ?valuation aveugle ni un taux de pr?cision global. Les 90 passages de la file de relecture conservent les informations num?riques ou sensibles potentiellement seulement partiellement class?es.

Preuves : [comparaison V3](proofs/parser-pilot-v3/COMPARAISON.md), [r?sultats V3](proofs/parser-pilot-v3/results.json), [comparaison initiale](proofs/parser-pilot-v2/COMPARAISON.md), [champs structurés](proofs/parser-pilot-v2/CHAMPS_STRUCTURES.json). Restant : finaliser les unités/composantes, contextualiser les exigences, évaluer les faux positifs et omissions sur un autre lot, puis décider du raccordement. Pas de LLM nécessaire ou installé dans ce prototype.

## Sécurité, configuration et exploitation

| Sujet | État local prouvé | Reste |
|---|---|---|
| Authentification et droits | Sessions SQL, Argon2id, Origin/CSRF, cookies, limitation des écritures auth, droits organisationnels | Recette finale des parcours et démonstration de compréhension par l'équipe |
| Comptes désactivés | Exclusion du matching, notifications et nouvelles candidatures/sélections/affectations ; révocation sessions | Affectations confirmées existantes conservées ; recette opérationnelle finale |
| Documents | Quota utile corrigé ; confirmations exemptées ; ancienne banque conservée sans double quota actif ; verrou partagé écriture/nettoyage | Politique de conservation, purge globale et suivi espace disque |
| Migrations et bases | Migrations sécurité appliquées après tests isolés et sauvegarde ; comptes applicatifs restreints distincts du migrateur | Répéter sur environnement cible ; pas de privilèges administrateur applicatifs |
| HTTPS | Site local `https://localhost:8443`, API derrière Caddy ; protections vérifiées | Domaine/hébergement si ouverture publique, TLS des flux interservices, renouvellement certificats |
| Vault | TLS, KV v2, AppRoles, audit ; lancement API/worker sans repli vers .env | Procédure incident/rotation et exploitation sur cible |
| Sauvegarde/restauration | Sauvegarde SQL/Mongo/fichiers/Vault/n8n/configuration, restauration isolée vérifiée | Jeu local peu rempli : compléter un exercice avec missions/documents représentatifs, sauvegarde hors machine |
| CI | Workflow backend/frontend et tests isolés présents ; succès distant antérieur au lot actuel | Publier et vérifier la CI de la révision finale ; ne pas attribuer un ancien succès aux modifications locales |

Preuves antérieures : [dossier de durcissement](proofs/v1-hardening/), [bilan sécurité daté](BILAN_SECURITE_LIVRAISON_V1_2026-09-16.md).

**Google — emplacement actuel vérifié :** `GOOGLE_CLIENT_ID` identique dans `.env` privé, `data/vault/runtime.json` et Vault `kv/infimatch/v1/backend`. Ce champ est l'identifiant public OAuth, pas une clé API secrète. Les API locales 3100 et 3101 répondent avec Google activé et le même identifiant. Cela ne prouve pas à lui seul une connexion OAuth complète dans le navigateur. Aucun identifiant ni secret ne doit être copié dans ce document.

`JOBSPIPE_API_KEY` est conservée dans Vault et le `.env` privé ; aucune valeur dans `.env.example`. Le lanceur Vault accepte les deux champs. Les autres secrets existants sont préservés lors des mises à jour ciblées.

## Tests : portée et dates

- Dernier contrôle backend local après exclusion CDI : **108 tests unitaires réussis**. Les anciens tests de contradiction conservés concernent désormais le CDD ; le rejet CDI dispose de ses tests dédiés.
- Dernier contrôle Vault après synchronisation Google : **10 tests réussis**.
- Prototype parseur : **14 tests réussis**, séparés des tests backend et non représentatifs d'une mise en production.
- Backend compilé après filtre CDI ; frontend compilé lors du raccordement JobsPipe.
- Campagne isolée de sécurité antérieure : 118 tests (101 unitaires + 17 intégrations), plus régressions complémentaires. **Les 17 intégrations n'ont pas été relancées après les derniers changements CDI/Google.**
- Les couvertures et succès CI antérieurs restent datés. Aucune nouvelle couverture complète de la dernière révision n'est annoncée.

## Exigences kickoff et livraison restantes

Le périmètre des 40 exigences kickoff est conservé ; aucun manque obligatoire n'est reporté implicitement en V2.

1. **Fonctionnel** : recommandations à l'accueil, préférences notifications, explication de correspondance externe, navigation propositions agence au-delà de 20, cycle de retrait fournisseur, validation des raccordements récents.
2. **Recette** : parcours infirmier/agence/établissement et IDE/IADE/IBODE, besoin à affectation/PDF, annulations, conflits, refus, droits, états vides et erreurs ; installation depuis un dépôt propre.
3. **Qualité web** : mobile/tablette/ordinateur, clavier/focus/contrastes, SEO et sitemap adapté aux pages publiques et au domaine retenu ; deux pratiques d'écoconception démontrables.
4. **Conservation/cadre métier** : durées et traitements effectifs, canal d'exercice des droits, coordonnées légales pour ouverture publique, limites du POC et grandes règles d'intérim à documenter. Un PDF de confirmation ne remplace pas un contrat signé.
5. **Exploitation** : TLS/topologie finale, restauration représentative, rotation/incident, sauvegardes hors machine, suivi des certificats et des quotas d'import.
6. **Livrables équipe** : sources de l'étude de marché, proposition de valeur, CDC et remise J+2 si preuve disponible, roadmap/chiffrage, décision go/no-go datée, exports n8n et dataset/script cohérents, temps humains et écarts réels, pitch, répétition et participation de chacun.

Les preuves techniques ne valident ni les temps humains ni la soutenance. Les tests d'un sous-ensemble ne valent pas conformité complète RGAA/RGPD ni validation juridique.

## Limites de version conservées

- Attestation sur l'honneur V2 ; références professionnelles hors V1 à arbitrer. Les champs déclaratifs éventuellement présents ne constituent pas un contrôle de références.
- Aucun contrôle manuel RPPS par agence ajouté ; la décision humaine porte sur l'affectation.
- Administration avancée V3 ; droits et affiliations minimaux nécessaires en V1.
- Signature V2 ; contrats complets V3 ; temps travaillés V2 ; paie V3. Pas de chatbot dans cette V1.
- Pas de recherches sauvegardées ; favoris en V1.
- Documents et données bancaires fictifs ; aucune donnée patient. Les offres publiques importées sont réelles et distinctes des fixtures de démonstration.

## Dépendances et maintien à jour

Audit indépendant local : manifests, lockfiles et paquets installés cohérents, `npm ls --depth=0` sans erreur backend/frontend. Node installé 24.14.0 conforme à la cible backend Node 24. Les types Node frontend 26.x restent à aligner avec cette cible. **Aucun audit réseau de vulnérabilités ou de dernières versions n'a été réalisé lors de cette vérification.**

Fichiers : [commandes/workspace](../package.json), [dépendances backend](../backend/package.json), [verrou backend](../package-lock.json), [frontend local](../../infiMatch-front-end/package.json), [verrou frontend](../../infiMatch-front-end/package-lock.json), [infrastructure](../infra/compose.yaml). Le projet Node utilise `npm ci`, pas un requirements.txt Python. Les liens frontend décrivent l'organisation locale des deux dépôts.

Pour chaque évolution : actualiser code, tests pertinents, exigences/matrice, documentation d'exploitation et contrat API si modifié. Conserver la date et la portée des preuves. Ne marquer une fonction validée ni par simple présence de code, ni sur un ancien rapport CI.

### Inventaire des d?pendances directes ? 16 septembre 2026

Les contraintes viennent des package.json ; les versions exactes viennent des package-lock.json. Les d?pendances transitives restent int?gralement d?crites dans les lockfiles. Cet inventaire ne modifie ni les paquets ni leurs versions.

#### Backend ? ex?cution

| Paquet | Contrainte d?clar?e | Version verrouill?e |
|---|---|---|
| @nestjs/common | 12.0.2 | 12.0.2 |
| @nestjs/core | 12.0.2 | 12.0.2 |
| @nestjs/platform-express | 12.0.2 | 12.0.2 |
| @nestjs/swagger | 12.0.1 | 12.0.1 |
| argon2 | 0.45.1 | 0.45.1 |
| class-transformer | 0.5.1 | 0.5.1 |
| class-validator | 0.15.1 | 0.15.1 |
| commander | 15.0.0 | 15.0.0 |
| connect-pg-simple | 10.0.0 | 10.0.0 |
| dotenv | 17.4.2 | 17.4.2 |
| express-rate-limit | 8.7.0 | 8.7.0 |
| express-session | 1.19.0 | 1.19.0 |
| google-auth-library | ^11.0.2 | 11.0.2 |
| helmet | 8.3.0 | 8.3.0 |
| luxon | 3.7.2 | 3.7.2 |
| mongoose | 8.24.4 | 8.24.4 |
| multer | 2.3.0 | 2.3.0 |
| pdfkit | 0.20.2 | 0.20.2 |
| pg | 8.23.0 | 8.23.0 |
| reflect-metadata | 0.2.2 | 0.2.2 |
| rxjs | 7.8.2 | 7.8.2 |
| stream-chain | 4.2.5 | 4.2.5 |
| stream-json | 3.6.0 | 3.6.0 |
| typeorm | 0.3.31 | 0.3.31 |

#### Backend ? d?veloppement et tests

| Paquet | Contrainte d?clar?e | Version verrouill?e |
|---|---|---|
| @types/connect-pg-simple | 7.0.3 | 7.0.3 |
| @types/express | 5.0.6 | 5.0.6 |
| @types/express-session | 1.19.0 | 1.19.0 |
| @types/luxon | 3.7.5 | 3.7.5 |
| @types/node | 24.13.4 | 24.13.4 |
| @types/pdfkit | 0.17.6 | 0.17.6 |
| @types/pg | 8.23.1 | 8.23.1 |
| @types/supertest | 7.2.1 | 7.2.1 |
| c8 | 12.0.0 | 12.0.0 |
| expect | 30.5.1 | 30.5.1 |
| prettier | 3.9.6 | 3.9.6 |
| supertest | 7.2.2 | 7.2.2 |
| tsc-watch | 7.2.1 | 7.2.1 |
| tsx | 4.23.13 | 4.23.13 |
| typescript | 5.9.3 | 5.9.3 |

#### Frontend ? ex?cution

| Paquet | Contrainte d?clar?e | Version verrouill?e |
|---|---|---|
| react | ^19.2.0 | 19.3.0 |
| react-dom | ^19.2.0 | 19.3.0 |
| react-router | ^7.9.4 | 7.18.3 |

#### Frontend ? d?veloppement et tests

| Paquet | Contrainte d?clar?e | Version verrouill?e |
|---|---|---|
| @types/node | ^26.5.1 | 26.5.1 |
| @types/react | ^19.2.0 | 19.3.0 |
| @types/react-dom | ^19.2.0 | 19.3.0 |
| @vitejs/plugin-react | ^5.0.4 | 5.2.0 |
| playwright | ^1.63.0 | 1.63.0 |
| typescript | ^5.9.3 | 5.9.3 |
| vite | ^7.1.9 | 7.3.6 |

### Outils et services requis

| Composant | Version / contrainte v?rifi?e | Usage |
|---|---|---|
| Node.js | Cible backend >=24 <25 ; install? 24.14.0 | API, worker, CLI, compilation frontend |
| npm | Install? 11.9.0 ; lockfiles v3 | Installation reproductible avec npm ci |
| PostgreSQL / PostGIS | Image postgis/postgis:17-3.5 | Donn?es relationnelles et distance g?ographique |
| MongoDB | Image mongo:8.0.5 | Explications versionn?es du matching |
| n8n | Image docker.n8n.io/n8nio/n8n:2.38.7 | Trois workflows V1 |
| Vault | Image hashicorp/vault:2.1 ; service v?rifi? 2.1.0 | Secrets, AppRoles et audit |
| Caddy | Binaire local 2.11.2 | HTTPS et reverse proxy |
| Docker Desktop / Compose | Requis pour les services locaux ; version non relev?e ici | Conteneurs et volumes |
| Windows PowerShell / Planificateur de t?ches | Requis pour les imports programm?s locaux | Horaires Paris et journaux |

Les quatre images de services sont ?pingl?es par digest SHA-256 dans les fichiers Compose. Le digest exact, et non le seul tag lisible, d?termine l?image utilis?e. Vault : [configuration Compose](../infra/vault/compose.yaml).

### Services externes et configuration

| Service | Param?tres utilis?s | D?pendance / port?e |
|---|---|---|
| Google OAuth | GOOGLE_CLIENT_ID | google-auth-library c?t? backend ; configuration publique, aucune valeur dans ce document |
| JobsPipe | JOBSPIPE_API_KEY | API HTTP via fetch natif Node ; aucun SDK suppl?mentaire |
| France Travail | FT_CLIENT_ID, FT_CLIENT_SECRET | API HTTP via fetch natif Node |
| Annuaire Sant? / RPPS | RPPS_API_KEY | Adaptateur backend ; acc?s fournisseur requis |
| FINESS | Source publique et adaptateur existant | Import/r?f?rentiel ?tablissement |

Les secrets sont fournis par Vault au lancement ; les noms ci-dessus ne sont pas des valeurs de cl?s. Aucun fournisseur LLM ni SDK LLM ajout? pour le parseur exp?rimental. Python n?est pas une d?pendance d?ex?cution de l?application.

### Installation reproductible

```powershell
cd E:\Interimatch\InfiMatch
npm ci
npm run build

cd E:\Interimatch\infiMatch-front-end
npm ci
npm run build
```

Ne pas confondre d?pendances coh?rentes et derni?res versions disponibles. L?alignement des types Node frontend 26.x avec la cible Node 24 et un audit de vuln?rabilit?s restent ? traiter s?par?ment.
