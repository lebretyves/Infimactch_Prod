# Offres externes — contrat de correspondance V1
Voir [le rectificatif du catalogue](RECTIFICATIF_CATALOGUE_V1.md).
Les routes POST /api/v1/listings/search, GET /api/v1/listings/external et GET /api/v1/listings/e_UUID ajoutent correspondence :
- mode: EXTERNAL_CRITERIA ; score: null ; eligibilityVerified: false.
- criteria: qualification, location, contract, experience, workingTime ; chaque entrée contient value et status.
- status: PROVIDER_REPORTED (déclaré par le fournisseur), UNKNOWN (inconnu), REVIEW_REQUIRED (à vérifier).
- warnings: codes de contrôle qualité, à traduire par le frontend.
- missingForFullMatching: dates exactes, horaires confirmés, lieu vérifié, exigences structurées et admissibilité du professionnel.
applicationMode reste REDIRECT ; eligibility est INCOMPLETE. Ces critères ne sont pas un calcul personnalisé d'admissibilité.

provenance.normalizationVersion=2 et provenance.facts conservent les données publiques nettoyées.
Les anciennes lignes sans facts portent LEGACY_OFFER_REIMPORT_REQUIRED ; les réimporter avant de présenter leurs critères comme renseignés.
Les filtres stricts actuels restent conservateurs : la présence de coordonnées fournisseur non vérifiées ne suffit pas à faire passer un filtre de rayon.
Les annonces de qualification inconnue restent dans la liste publique générale, pas dans les résultats ciblés sur une qualification.

Alertes :
- QUALIFICATION_UNCONFIRMED / BLOCK_DIPLOMA_UNCONFIRMED : diplôme requis non établi.
- QUALIFICATION_AMBIGUOUS : plusieurs qualifications spécialisées dans le titre.
- CONTRACT_TEXT_REVIEW_REQUIRED : mention CDI, CDD ou vacation dans une annonce structurée MIS.
- EXPERIENCE_TEXT_REVIEW_REQUIRED : débutant accepté dans le champ, exigence potentielle dans le texte.
- LOCATION_TEXT_REVIEW_REQUIRED : arrondissements parisiens différents dans titre et libellé du lieu.
Ce sont des heuristiques limitées, pas une analyse exhaustive ni une validation humaine.

Commande : node backend/dist/cli.js import-offers --limit 150 --department 75
--limit borne chaque recherche (quatre mots-clés), au plus 600 résultats avant dédoublonnage.
Sans --department : recherche nationale. --dry-run ne persiste pas les résultats.
Le département est contrôlé localement via le code commune ; lieu inconnu ou hors département exclu de la collecte ciblée.
Reproduction de la preuve réelle : node scripts/verify-france-travail-rectification.cjs (utilise les accès locaux, effectue un import et son rejeu).


## Comparaison partielle avec le profil — 15 septembre 2026
Implémentée : la recherche authentifiée ajoute profileCorrespondence à chaque annonce externe. Les réponses publiques restent impersonnelles.
GET /api/v1/me/listings/e_UUID/correspondence compare une annonce active et non expirée au profil du seul utilisateur connecté. Session requise ; réponse no-store ; aucun identifiant de profil tiers n'est accepté. Offre absente/expirée ou profil absent : 404 ; session absente : 401.

profileCorrespondence :
- mode=PARTIAL_PROFILE_COMPARISON ; rulesVersion=external-partial-v1 ; comparedAt ; score=null ; eligibilityVerified=false.
- result : POSSIBLE_MATCH (piste sur les critères disponibles), TO_CONFIRM, KNOWN_MISMATCH, BLOCKED_RPPS ou RPPS_PENDING.
- criteria : qualification, service, experience, location, shift, availability, assignmentConflicts, requiredSkills, contract, rpps.
- statuts : MATCH / MISMATCH sur les informations déclarées ; INDICATIVE_MATCH / INDICATIVE_MISMATCH pour les indices non suffisants ; PROFILE_MISSING / OFFER_MISSING ; REVIEW_REQUIRED.
- reason explique chaque statut ; value éventuel contient uniquement les informations utiles à l'explication.
- knownMismatches, indicativeMismatches, profileToComplete, offerToClarify, warnings.
POSSIBLE_MATCH peut reposer uniquement sur la qualification et le RPPS. Afficher le détail et les informations manquantes ; ce n'est pas un niveau de confiance ni une garantie.
Les dates exactes, les conflits, la disponibilité et les compétences obligatoires non interprétées ne sont jamais déclarés vérifiés.
Le service est un indice issu d'un titre non ambigu parmi une liste bornée. L'expérience compare une durée annoncée non ambiguë à l'expérience totale déclarée, sans double comptage ni expérience future. Elle ne vérifie pas une expérience spécifique.
La distance fournisseur et les horaires généraux ne deviennent jamais des incompatibilités certaines. Les critères non interprétables restent inconnus.
RPPS_FOUND ne prouve pas l'admissibilité complète. Un résultat bloquant dans cette comparaison ne désactive pas le lien vers le site externe.

POST /api/v1/listings/search accepte includeUncertainExternal, booléen optionnel, false par défaut.
Avec true, la recherche peut inclure des annonces de la qualification sélectionnée même si des filtres stricts ne sont pas vérifiables. Les branches internes restent strictes.
Chaque annonce externe expose unverifiedSearchFilters (noms des filtres non vérifiés) et requestedFiltersVerified. Le filtre de qualification utilise la classification fournisseur ; même si requestedFiltersVerified=true, eligibilityVerified reste false.
La comparaison utilise le profil enregistré ; une recherche ponctuelle avec un autre rayon ou service ne remplace pas les préférences du profil. Les filtres ponctuels non vérifiés sont signalés séparément.
Pas de tri par score externe ; pas de stockage de cette comparaison ; calcul à la lecture.
La clause antérieure sur l'exclusion des données inconnues reste le comportement par défaut, avec cette exception explicite d'inclusion de pistes.
Exemple : {"qualifications":["IDE"],"start":"2030-01-10T08:00:00Z","end":"2030-01-10T20:00:00Z","includeUncertainExternal":true}
Message produit conseillé : « Correspondance partielle — informations à confirmer ». Ne pas afficher « compatible avec votre planning ».

Reproduction : npm run verify ; node scripts/verify-partial-matching-live.cjs (acquisition réelle et profils fictifs en mémoire, aucun profil réel modifié).
