# Audit de la collecte France Travail — 17 septembre 2026

## Conclusion

**InfiMatch ne récupère pas actuellement toutes les annonces France Travail.** Le système importe un sous-ensemble borné d’annonces d’intérim, puis les recherches des utilisateurs interrogent ce catalogue local. Une recherche sans résultat dans InfiMatch ne démontre pas l’absence d’offres correspondantes chez France Travail.

Cet audit porte sur une inspection en lecture seule du code, de la base Neon et du workflow n8n. Aucun import, changement de configuration ou nettoyage de données n’a été déclenché. Le présent document est le seul livrable ajouté après l’audit ; les corrections proposées ci-dessous ne sont pas implémentées.

## Périmètre et date des observations

- Observation des compteurs : **17 septembre 2026 à 15 h 41, Europe/Paris**, soit **13 h 41 UTC**. Horodatage PostgreSQL précis : `2026-09-17T13:41:35.971Z`.
- Code canonique : `E:/Interimatch/InfiMatch`.
- Monorepo de livraison inspecté : `E:/Interimatch/Infimactch-Prod-sync`, commit `80d39dc` — `Allow mission searches around a chosen location independent of home`.
- Les fichiers d’import, de fraîcheur et de qualification comparés sont identiques entre les deux dépôts après normalisation des fins de ligne. Les contrôles de déploiement Vercel ne font pas partie de cette vérification indépendante.
- Lectures de production : compteurs et réglages agrégés dans Neon ; métadonnées du workflow n8n par requêtes GET. Aucun profil personnel, mot de passe, jeton, clé API ou contenu de message n’est restitué.
- Les clés `FT_CLIENT_ID`, `FT_CLIENT_SECRET` et `JOBSPIPE_API_KEY` sont présentes dans le coffre de production. Leur présence ne constitue pas, seule, un test d’appel fournisseur ; les derniers imports enregistrés apportent une preuve distincte d’acquisition.

## Fonctionnement actuel

| Étape | Comportement observé | Preuve dans le dépôt |
|---|---|---|
| Authentification | OAuth serveur `client_credentials`, scopes `api_offresdemploiv2 o2dsoffre`. Identifiants conservés côté serveur. | [offers.ts](../../backend/src/public-data/offers.ts), fonction `fetchOffers`, lignes 58–88 |
| Recherche fournisseur | Quatre requêtes successives : `infirmier`, `IDE`, `IADE`, `IBODE`. | [offers.ts](../../backend/src/public-data/offers.ts), lignes 91–100 |
| Contrat | Paramètre `typeContrat=MIS`, puis rejet local des contrats non intérim et des postes permanents explicitement détectés. | [offers.ts](../../backend/src/public-data/offers.ts), lignes 11–22 ; [contract-policy.ts](../../backend/src/public-data/contract-policy.ts) |
| Métiers | Aucun paramètre ROME. La qualification est déduite du texte ; les ambiguïtés sont conservées comme telles. | [offer-quality.ts](../../backend/src/public-data/offer-quality.ts), fonction `offerFacts` |
| Géographie d’acquisition | Aucun département fourni par le traitement quotidien. Le CLI accepte un département facultatif, avec contrôle local du code commune. | [refresh.service.ts](../../backend/src/public-data/refresh.service.ts), lignes 28–30 ; [cli.ts](../../backend/src/cli.ts), commande `import-offers` |
| Dates d’acquisition | Aucun filtre de création ou d’actualisation ; aucun curseur différentiel. | [offers.ts](../../backend/src/public-data/offers.ts), fonction `fetchOffers` |
| Pagination fournisseur | La production appelle `fetchOffers(25)` : `range=0-24` pour chaque mot-clé. **100 résultats bruts maximum avant dédoublonnage**, uniquement la première page. | [refresh.service.ts](../../backend/src/public-data/refresh.service.ts), ligne 29 ; [offers.ts](../../backend/src/public-data/offers.ts), ligne 100 |
| Bornes CLI | Valeur par défaut : 50 résultats par mot-clé. Borne validée par le code : 1 à 150 par mot-clé. Augmenter cette valeur ne met pas en place une pagination exhaustive. | [cli.ts](../../backend/src/cli.ts), lignes 73–82 ; [offers.ts](../../backend/src/public-data/offers.ts), lignes 63–66 |
| Reprises | Un verrou évite les imports concurrents du même fournisseur ; délai minimal de 60 secondes entre débuts d’import. Une erreur retourne `RETRY_REQUIRED`, sans boucle immédiate de reprise fournisseur. | [refresh.service.ts](../../backend/src/public-data/refresh.service.ts), lignes 16–37 |
| Consultation | Qualification, mots-clés, origine, rayon et pagination portent sur les données déjà en PostgreSQL. Une recherche de ville ne déclenche pas une nouvelle acquisition France Travail. | [listings.module.ts](../../backend/src/listings/listings.module.ts), méthode de recherche ; [listing-page.ts](../../backend/src/listings/listing-page.ts) |

Les appels HTTP ont des délais bornés. France Travail est interrogé successivement pour les quatre mots-clés ; un échec avant la fin empêche l’import du lot complet, même si certaines recherches précédentes avaient répondu. Les totaux et en-têtes de pagination du fournisseur ne sont pas utilisés pour poursuivre l’acquisition ou mesurer sa couverture.

## Cadence réellement constatée

Le workflow n8n `InfiMatch production - actualisation quotidienne`, identifiant `uGQyGgV3sp0gaxcZ`, a été lu avec les propriétés suivantes :

- actif : `true` ;
- fuseau : `Europe/Paris` ;
- déclencheur quotidien à **04 h 15** ;
- appel : `/api/v1/internal/automation/jobs/refresh-offers` uniquement.

Le dernier lot France Travail a été enregistré le **17 septembre à 04 h 15 min 53 s, heure de Paris**, soit **02 h 15 min 53 s UTC**. Le lot JobsPipe a été enregistré deux secondes plus tard. Cette concordance établit une exécution quotidienne observée ; elle ne prouve pas une disponibilité continue ni les exécutions futures.

Les contrôles de sources sont tous deux activés. Leur champ `last_started_at` était encore nul lors de cette lecture, malgré des imports antérieurs dans `import_run` : il ne faut donc pas utiliser ce champ seul pour déduire l’absence d’acquisition historique.

Le script de configuration prévoit aussi un workflow de maintenance distinct ou combiné, mais **aucun workflow de maintenance quotidienne actif n’a été trouvé dans la liste inspectée**. Le workflow d’actualisation observé n’appelle pas la route de maintenance.

Références : [configure-production-workflows.mjs](../../scripts/vault/configure-production-workflows.mjs), définition du déclencheur quotidien ; [cloud-jobs.module.ts](../../backend/src/automation/cloud-jobs.module.ts), routes `refresh-offers` et `maintenance`.

## Données présentes en production

| Source | Annonces stockées | Actives | Actives et non expirées | Dernier lot : reçues / acceptées / rejetées |
|---|---:|---:|---:|---:|
| France Travail | 255 | **254** | 254 | **74 / 74 / 0** |
| JobsPipe | 10 | **1** | 1 | **10 / 0 / 10** |

« Acceptées » désigne les annonces normalisées et traitées par insertion ou mise à jour. **74 annonces acceptées ne signifie pas 74 nouvelles annonces.** Un lot quotidien peut revoir les mêmes premières pages.

Parmi les 254 annonces France Travail actives :

- **135** possèdent un code commune commençant par `75` ;
- **40** seulement possèdent des coordonnées structurées latitude/longitude ;
- **12** ont une qualification non identifiée ;
- **0** avaient un dernier import de plus de 30 jours au moment du contrôle.

Une acquisition historique ciblant Paris est documentée dans [france-travail-rectification.json](../proofs/france-travail-rectification.json), vérifiée le `2026-09-14T23:00:08.241Z`. Elle mentionne quatre recherches sur le département 75 avec respectivement 131, 133, 9 et 132 résultats avant dédoublonnage. Cette preuve explique un périmètre historique local ; elle ne démontre ni une couverture nationale ni la situation actuelle du fournisseur.

**Conséquence pour la recherche par rayon :** les offres externes dont les coordonnées sont absentes sont exclues. Une recherche autour de Lyon peut donc manquer des annonces qui existent chez France Travail, parce qu’elles ne sont pas importées ou ne sont pas géolocalisables dans le catalogue actuel. Les coordonnées présentes sont des informations fournisseur non assimilées à une adresse de travail vérifiée. La distance est géographique, pas un temps de trajet.

## Normalisation, doublons et affichage

La normalisation retire le HTML, limite les tailles de texte, conserve l’identifiant fournisseur, les dates de publication et d’actualisation disponibles, la provenance, la rémunération textuelle et les éléments structurés exploitables. La classification d’une annonce en IDE, IADE ou IBODE ne valide pas le diplôme du candidat.

Le dédoublonnage comporte trois niveaux :

1. Un identifiant France Travail présent dans plusieurs recherches du même lot est conservé une seule fois.
2. Le couple `(source, source_id)` est unique : les réimportations mettent à jour la ligne existante et son horodatage `imported_at`.
3. Les doublons entre France Travail et JobsPipe identifiés par URL ou contenu identique sont désactivés, avec préférence pour l’enregistrement France Travail direct. Ce traitement conservateur ne garantit pas d’identifier toutes les annonces similaires.

Références : [offers.ts](../../backend/src/public-data/offers.ts), fonction `importOffers`, notamment l’`ON CONFLICT` ; [offer-deduplication.ts](../../backend/src/public-data/offer-deduplication.ts).

Les offres importées restent des **offres externes** : elles ne sont pas présentées comme des partenaires internes InfiMatch. La candidature se poursuit sur le site source. Les recommandations de l’accueil présentent un nombre limité de suggestions, organisées par correspondance partielle puis date réelle de publication pour les externes. Le catalogue conserve une pagination SQL ; son total n’est pas le total France Travail.

## Fermeture, disparition et fraîcheur : limites actuelles

- Une annonce absente du prochain lot **n’est pas automatiquement désactivée**. C’est prudent : l’absence d’une première page limitée n’est pas une preuve de fermeture.
- Une annonce réimportée et reconnue non conforme, fermée ou expirée peut être désactivée selon les motifs de retrait. France Travail ne fournit pas actuellement une date d’expiration exploitée par ce normaliseur ; `expires_at` reste généralement nul pour cette source.
- Aucun contrôle individuel périodique ne vérifie actuellement si chaque ancienne annonce France Travail est toujours publiée.
- Une fonction de maintenance prévoit le retrait après expiration ou **30 jours sans réimport**, avec motif `STALE_UNVERIFIED` distinct d’une fermeture avérée.
- Cette fonction n’est pas appelée par le workflow quotidien d’actualisation actif observé. Les requêtes de consultation filtrent `active` et `expires_at`, mais ne désactivent pas elles-mêmes une annonce ancienne.

Le risque n’est donc pas seulement de manquer des offres : une annonce sortie des premières pages peut rester affichée alors que sa disponibilité réelle n’a pas été revérifiée. Aucun stock actif ne dépassait encore les 30 jours lors de l’audit ; cela ne constitue pas une garantie pour les semaines suivantes.

Références : [offers.ts](../../backend/src/public-data/offers.ts), lignes 157–176 ; [freshness.ts](../../backend/src/public-data/freshness.ts), constante `OFFER_FRESHNESS_DAYS=30` ; [cloud-jobs.module.ts](../../backend/src/automation/cloud-jobs.module.ts), méthode `maintenance`.

## JobsPipe : complément distinct, également limité

JobsPipe est interrogé indépendamment, avec une limite de **10 résultats**, pays France, titres infirmiers et description évoquant l’intérim. Son traitement exclut notamment les postes permanents, les pays non confirmés, les offres fermées ou expirées et les emplois dont l’intérim n’est pas confirmé.

Sur les sept jours observés, les rejets enregistrés comprennent 36 occurrences `PERMANENT_POSITION_EXCLUDED` et 16 `INTERIM_UNCONFIRMED`. Il s’agit de rejets de lots, potentiellement répétés pour les mêmes annonces, pas d’un nombre garanti d’annonces distinctes. Le dernier lot contient 10 rejets et aucune acceptation. Un statut d’import `SUCCESS` signifie que le traitement s’est déroulé ; il ne garantit pas un apport de nouvelles annonces.

Cette source ne garantit pas de combler les manques de France Travail. Référence : [jobspipe.ts](../../backend/src/public-data/jobspipe.ts).

## Références officielles et limites de vérification

La [fiche API Offres d’emploi publiée par France Travail sur data.gouv.fr](https://www.data.gouv.fr/dataservices/api-offres-demploi), consultée le 17 septembre 2026, indique :

- une restitution des offres actives collectées par France Travail et des offres partenaires **pour lesquelles le partenaire autorise la diffusion par API** ;
- une recherche paginée, un accès au détail et des référentiels de métiers, lieux et contrats ;
- une limite annoncée de **10 appels par seconde**.

Même une collecte complète d’un périmètre de l’API ne garantit donc pas de couvrir toutes les annonces visibles sur le site France Travail. Le quota particulier de l’application n’a pas été vérifié dans son espace fournisseur.

Le [portail officiel de l’API](https://francetravail.io/produits-partages/catalogue/offres-emploi) et sa [documentation technique](https://francetravail.io/produits-partages/catalogue/offres-emploi/documentation) sont rendus en JavaScript et n’ont pas fourni de contenu exploitable par l’outil de lecture lors de cet audit. La borne de 150 par requête est **prouvée dans le code InfiMatch** ; les plafonds techniques détaillés actuels du fournisseur n’ont pas été vérifiés indépendamment. En particulier, le plafond de 3 150 résultats parfois cité ailleurs n’est **pas confirmé ici** et ne doit pas devenir une hypothèse de production sans lecture de la documentation officielle applicable.

## Proposition progressive : couvrir le périmètre infirmier / intérim

Les étapes suivantes sont des recommandations, pas des changements réalisés. L’objectif doit être une **couverture mesurée du périmètre annoncé**, avec limites visibles, plutôt qu’une promesse indémontrable de « toutes les annonces ».

### 1. Définir et mesurer le périmètre

- Valider les métiers infirmiers retenus, leurs codes du référentiel officiel et les variantes utiles ; conserver un complément textuel pour les annonces mal classées, sans confondre les métiers.
- Définir les contrats d’intérim acceptés et les exclusions, ainsi que la géographie visée, y compris les territoires ultramarins et les annonces sans localisation exploitable.
- Vérifier dans la documentation et l’espace applicatif les paramètres disponibles, les plafonds de pagination, les règles de tri et le quota réellement accordé.
- Enregistrer pour chaque partition : paramètres, date de début et de fin, nombre annoncé par la source, lignes reçues, identifiants uniques, acceptations, rejets, pages parcourues et état incomplet éventuel.
- Ne publier aucun pourcentage de couverture tant que son dénominateur n’est pas défini et disponible.

### 2. Parcourir les pages avec un budget maîtrisé

- Remplacer la lecture répétée de `0-24` par une progression de pages jusqu’à épuisement confirmé, plafond fournisseur ou budget autorisé.
- Exploiter les métadonnées officielles de pagination ; arrêter proprement sur page vide ou absence de progression et conserver un point de reprise.
- Traiter les réponses 429, les délais et les erreurs transitoires par reprises bornées, avec temporisation et prise en compte de `Retry-After` lorsque fourni. Ne pas boucler indéfiniment.
- Limiter la cadence globale de l’application, y compris lorsque plusieurs partitions ou opérateurs déclenchent une acquisition.
- Conserver le dédoublonnage par identifiant et l’idempotence d’import ; mesurer séparément nouvelles lignes, mises à jour et annonces inchangées.

### 3. Découper les recherches trop volumineuses

- Si une recherche atteint un plafond sans avoir épuisé les résultats, la subdiviser selon les paramètres officiellement disponibles : métiers, départements/territoires ou fenêtres temporelles adaptées.
- Tracer les partitions et leur état pour éviter les zones oubliées ; traiter explicitement les annonces qui ne rentrent pas dans une partition géographique connue.
- Dédupliquer les recouvrements par identifiant fournisseur. Un chevauchement volontaire de fenêtres peut absorber des mises à jour tardives, mais ne doit pas multiplier les lignes.
- Ne pas considérer qu’une partition plafonnée est complète. Afficher et journaliser son état incomplet.

### 4. Assurer la fraîcheur et les retraits

- Après une acquisition initiale, préparer une collecte des actualisations si l’API expose un filtre différentiel adapté, avec fenêtres de recouvrement et réconciliation périodique.
- Distinguer date de publication, date d’actualisation fournisseur, dernière observation et dernier contrôle de disponibilité.
- Vérifier le détail des annonces anciennes ou non revues selon un budget défini. Une indisponibilité temporaire du fournisseur ne doit pas être interprétée comme une fermeture.
- Ne déduire une disparition d’un catalogue que si la couverture de la partition est confirmée complète et que cette déduction respecte le contrat fournisseur ; sinon conserver un état « non revérifié » puis appliquer une politique de retrait explicite.
- Planifier et vérifier séparément le nettoyage des offres. Éviter d’activer implicitement la maintenance combinée qui traite aussi des clôtures de comptes et des documents.

### 5. Améliorer la couverture géographique sans inventer de précision

- Réimporter les informations structurées disponibles pour les offres anciennes, afin de ne pas se limiter aux 40 annonces actuellement munies de coordonnées.
- Conserver les coordonnées fournies, leur provenance et leur niveau de précision. Une position de commune n’est pas une adresse de travail vérifiée.
- Si un enrichissement par géocodage est retenu, le réaliser côté serveur avec source, qualité, date, cache et budget d’appels. Ne pas deviner une adresse à partir d’un intitulé ambigu.
- Montrer aux utilisateurs qu’un filtre de rayon exclut les offres non localisées ; prévoir une manière distincte de consulter ces annonces sans les prétendre situées dans le rayon.

### 6. Valider avant généralisation

- Tests de pagination : plusieurs pages, doublons entre pages, partition plafonnée, ordre instable, reprise après erreur et annonces ajoutées pendant la collecte.
- Tests de contrats et de métiers : annonces mal classées, intitulés ambigus, CDI évoqué seulement dans la présentation de l’agence et métiers infirmiers spécialisés.
- Tests de fraîcheur : fermeture avérée, offre absente d’un lot partiel, source indisponible, expiration et reprise d’un import interrompu.
- Mesures avant/après sur un périmètre pilote : identifiants uniques couverts, partitions complètes/incomplètes, annonces localisées, anciennes annonces revérifiées, coût et durée.
- Déploiement progressif et retour possible à l’import borné si les quotas ou temps d’exécution ne permettent pas la charge. Toute limite restante doit être visible dans l’administration.

## Priorités proposées

| Priorité | Action | Preuve attendue |
|---|---|---|
| P0 | Affirmer explicitement que le catalogue est importé et partiel | Libellés et compteurs sans promesse d’exhaustivité |
| P1 | Pagination avec métadonnées de couverture et reprise | Tests multi-pages ; compteurs de pages et identifiants uniques |
| P1 | Contrôle de fraîcheur et traitement autonome des offres anciennes | Exécution vérifiée ; distinction fermeture / non-revérification |
| P1 | Référentiel métier et découpage des requêtes plafonnées | Périmètre documenté ; partitions suivies et non saturées |
| P2 | Géolocalisation enrichie avec niveau de précision | Mesure des offres localisables ; provenance conservée |
| P2 | Optimisation différentielle et budgets d’acquisition | Réduction mesurée des appels sans baisse cachée de couverture |

Ces travaux restent à concevoir, vérifier et réaliser. Le constat d’audit ne constitue pas leur implémentation.
