# Données publiques et nettoyage utilisé
## FINESS — Structures
Producteur : Agence du Numérique en Santé. [Jeu officiel](https://www.data.gouv.fr/datasets/finess-structures-1), consulté le 23 septembre 2026, Licence Ouverte 2.0. JSON quotidien et instantanés mensuels/annuels ; les établissements fermés sont aussi présents. Le référentiel normalisé alimente la recherche d'établissements dans les parcours entreprise.

## Code
- [Téléchargement et import](../../../scripts/import-finess-local.mjs) : instantané mensuel, origine HTTPS officielle, téléchargement et CLI.
- [Transformation réellement utilisée](../../../backend/src/reference-data/finess.ts) : normalizeFiness, finessCoordinates et importFiness.
- [Tests](../../../backend/test/unit/finess.spec.ts) et [tests d'import](../../../backend/test/unit/finess-import.spec.ts).
- [CLI](../../../backend/src/cli.ts), utilisant notamment Commander.
- [Démonstration sans réseau ni base](demonstration-finess.cjs), appelant la fonction réelle compilée.

## Transformations
| Entrée | Règle | Résultat |
| --- | --- | --- |
| FINESS | Validation du format ; conservation en chaîne | Zéros initiaux et codes corses conservés |
| Texte | Nettoyage des espaces et borne de longueur | Libellés cohérents |
| Doublon d'identifiant | Rejet de l'instantané | Pas d'écrasement silencieux |
| Coordonnées | Contrôle numérique et bornes géographiques | Coordonnées en degrés ou null |
| Paires contradictoires/projetées | Valeurs non inventées | Absence explicite |
| État | Conservation | Fermeture non effacée |
| Provenance | URL, date et empreinte d'import | Traçabilité |

## Reproduction
Après npm ci et npm run build :
~~~powershell
node docs/rendu/2026-09-23/demonstration-finess.cjs
~~~
Le fichier demonstration-finess-resultat.json montre avant/après sur une fixture synthétique explicitement identifiée. Il ne prétend pas être un extrait réel téléchargé.

Import réel dans une base locale préparée :
~~~powershell
npm run finess:import
~~~
Le script accepte --url pour figer une ressource officielle.

France Travail et JobsPipe disposent de leurs propres transformations dans backend/src/public-data. Leurs conditions de réutilisation ne sont pas celles de FINESS. Une offre importée n'est pas la preuve d'un partenariat commercial ; collecte et visibilité frontend sont deux réglages distincts.
