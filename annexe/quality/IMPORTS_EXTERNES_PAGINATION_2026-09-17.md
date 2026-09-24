# Collectes France Travail et JobsPipe : pagination, localisation et actualisation

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

## Perimetre
Offres accessibles aux API dans le perimetre infirmier/interim France d'InfiMatch. Aucun achat, abonnement nouveau ou rechargement automatique de credits. Les API ne constituent pas un instantane immuable ni la totalite des annonces du marche.

## France Travail
- Pagination 150 offres, Content-Range controle. Fenetre officielle3150 : decoupage recursif par date de creation, chevauchement1seconde, tri creation.
- Quatre mots-cles historiques plus ROME J1503 (IADE), J1504 (IBODE), J1506 (IDE), contrat MIS. Fenetre creation1970 au debutducycle.
- Chaque lot conserve file de requetes et identifiants deja parcourus en SQL. Offres et checkpoint valides dans la meme transaction. Les pages repetes ne creent aucune ligne supplementaire.
- Une partition saturee ou reponse incoherente reste explicitement incomplete, jamais annoncee exhaustive.
- Le cycle parcourt tous les ages, pas uniquement nouvelles annonces, afin de mettre a jour les anciennes.
- Les annonces actives retournees dans le cycle sont confirmees par la recherche. Les anciennes non retrouvees sont controlees individuellement apres parcours. Seul204 du detail documente une absence ; erreurs401/403/404/410/429/5xx ne ferment aucune offre.
- Reimport preserve fermeture confirmee jusqu'a reouverture verifiee par detail200 ; protection contre concurrence/microsecondes SQL.

## JobsPipe
- Curseur metadata.next_cursor,25 maximum/page pour Free, cle d'idempotence et reponse acquise conservees afin de reprendre sans repayer le meme appel reussi.
- Reservation durable des credits avant appel, plafondlocal1000/moisUTC, limite distante402 prioritaire. L'usage historique ou externe peut reduire le quota disponible.
- Boucle de curseur, repetition totale d'une page, curseur manquant/incoherent restent INCOMPLETE. Reprise manuelle explicite possible ; aucune relance automatique aveugle.
- Verification des annonces connues via job_ids et status=any avec meme budget. Seuls statutferme/closed_at/expiration explicites retirent. Une absence de reponse ne prouve pas une fermeture.
- L'ancienne entree CLI passe desormais par le collecteur et le budget commun. Son dry-run lit uniquement l'etat local, sans consommer des credits.

## Localisation et doublons
Coordonnees numeriques ou texte acceptees et bornees. Repli centre communal officiel par codeINSEE pour FT ; codepostal et nomunique de commune pour JobsPipe. Valeurs inconnues restent inconnues. Precision COMMUNE_CENTRE explicite ; distances approximatives, sans inventer une adresse.
Dedupe source/identifiant par contrainteunique/upsert, identifiants deja vus parcycle et garde existante de doublons prouves entreFranceTravail/JobsPipe. Aucun rapprochement flou fusionnant arbitrairement des missions distinctes.

## Planification et administration
Cycle quotidien avec reprise via le workflow n8n existant toutes30minutes, sans nouveau planning d'executions. Le lancementquotidienexistant est conserve. Lots bornes compatibles delaiHTTP240s ; checkpoint permet de poursuivre apresinterruption.
Cartes admin : progression/completude, localisees, quotas, prochaine reprise et erreurs. Un lot traite ne signifie pas collecte complete.

## Sources officielles
- https://francetravail.io/api-peio/v2/api/84/openapi
- https://docs.jobspipe.dev/reference/search-jobs
- https://docs.jobspipe.dev/api-reference/pagination
- https://docs.jobspipe.dev/usage/plans
- https://docs.jobspipe.dev/usage/rate-limits
- https://www.francetravail.fr/files/live/sites/normandie/files/normandie/plus-dinfos/statistiques/secteurs/Etude_Soin_Accompagnement

## Validation et livraison
Tests locaux et publication suivis dans le rapport de recette de ce lot. Les valeurs de production seront ajoutees apres le rattrapage effectif.