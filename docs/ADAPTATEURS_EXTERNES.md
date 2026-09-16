# Adaptateurs externes et limites des preuves

## RPPS
Le fournisseur utilisé est l'API ANS FHIR v2, ressource Practitioner, recherche identifier exacte. L'en-tête attendu est ESANTE-API-KEY. Le système d'identifiant reconnu est https://rpps.esante.gouv.fr, ainsi que sa forme HTTP historique. Aucun identifiant technique de ressource n'est confondu avec un RPPS.

Sources consultées le 14 septembre 2026 : [documentation ANS Practitioner](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/resources/practitioner.html), [accès ANS](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/getting-started/get-api-key.html), [FR Core Practitioner](https://hl7.fr/ig/fhir/core/2.2.0/StructureDefinition-fr-core-practitioner.html).

Les tests utilisent des réponses FHIR synthétiques. Le parcours fonctionnel utilise une fixture RPPS SQL, explicitement marquée dans le test. Ce n'est pas une validation d'un professionnel réel ni une preuve d'identité ou d'expérience.

Le numéro courant possède une version. Une réponse à une ancienne version est ignorée. Une recherche vide valide donne NOT_FOUND ; échec réseau, 401/403/429/5xx, réponse incohérente ou clé absente donnent PENDING. Les modifications n'annulent pas implicitement les affectations.

## France Travail
L'adaptateur et la CLI sont présents. [Catalogue officiel](https://francetravail.io/produits-partages/catalogue/offres-emploi/documentation). Les paramètres d'authentification, droits et formats restent à confirmer avec les accès propres au projet ; aucun appel authentifié réussi n'a été réalisé.

La commande sans clés a été exécutée : échec explicite avant import. Ne pas créer de manifeste d'acquisition réelle à partir des fixtures.

Nettoyage : espaces/HTML, contrat MIS exigé, IDs bornés, déduplication source/ID, upsert, provenance et empreinte du brut. Aucune date de début de mission n'est fabriquée depuis la date de publication. Les qualifications normalisées sont heuristiques : elles ne prouvent pas les diplômes requis. Les annonces externes restent distinctes des missions internes et la candidature redirige vers France Travail.

À réception des accès, exécuter le dry-run puis l'import, contrôler un échantillon, les conditions de réutilisation et produire le manifeste réel avec date, périmètre, transformations, rejets et empreinte. Les offres importées sont visibles dans /listings/external et dans la recherche commune. Les filtres stricts excluent les annonces dont les champs requis sont inconnus. Les fixtures SQL de recette utilisent explicitement la source TEST_FIXTURE.
