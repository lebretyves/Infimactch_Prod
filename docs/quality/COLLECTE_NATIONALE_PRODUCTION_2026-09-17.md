# Collecte nationale des offres externes — 17 septembre 2026

Vérification en production le 17 septembre 2026 à 22:03 (Europe/Paris).

| Source | Offres actives | Avec coordonnées | Avec résultat du parseur |
|---|---:|---:|---:|
| France Travail | 4 773 | 4 626 | 4 773 |
| JobsPipe | 70 | 66 | 70 |
| Total | 4 843 | 4 692 | 4 843 |

Le précédent audit comptait 254 offres France Travail et 1 JobsPipe actives. Les 4 802 résultats cités étaient un total de recherche fournisseur, avec recoupements possibles entre recherches, et non le nombre final d'offres uniques admissibles.

## Collecte et périmètre

France Travail : cycle terminé à 21:56, 127 pages, 3 partitions, 4 823 identifiants uniques reçus, 4 788 acceptations et 35 rejets pendant le cycle. Les acceptations du cycle ne constituent pas le stock final : les offres existantes et retraits interviennent également. Recherche nationale sur les métiers infirmiers, contrats MIS, avec découpage temporel pour dépasser les plafonds de pagination.

JobsPipe : cycle terminé à 21:53, 353 identifiants uniques examinés par deux recherches complémentaires (texte intérim et types temporary/contract). Le filtre métier et la preuve de contrat intérimaire restent nécessaires : temporary/contract ne prouve pas seul l'intérim. Stock final : 70 actives. Registre local de consommation : 652 crédits ce mois sur un plafond configuré de 1 000 ; ce registre ne garantit pas le solde distant en cas d'utilisation hors application. Aucun abonnement acheté.

La couverture concerne les annonces accessibles aux deux API et le périmètre intérim infirmier configuré, pas toutes les annonces du marché ni tous les contrats. Les missions internes des partenaires suivent un autre circuit.

## Parsing, matching et localisation

Descriptions conservées avec leurs limites de paragraphes, reconnaissance des formulations au pluriel, distinction du métier, du contrat et des diplômes. Les classifications ROME et ISCO restent des informations fournisseur et ne prouvent pas un diplôme. Les données absentes restent inconnues. Les 218 offres dont la qualification normalisée reste inconnue ne sont pas arbitrairement classées IBODE.

Tous les éléments actifs ont un résultat de parsing ; cela ne signifie pas que toutes les conditions d'éligibilité sont vérifiées. Les correspondances externes signalent leurs critères manquants. Les coordonnées manquantes sont recherchées séparément de la pagination via les communes officielles ; un centre communal est signalé comme approximatif. Il reste 147 France Travail et 4 JobsPipe sans coordonnées utilisables, exclus des filtres par rayon. Les villes ambiguës ne sont pas géocodées arbitrairement.

## Dédoublonnage, retrait et actualisation

Aucun doublon source + identifiant ; aucun doublon exact entre sources selon les règles URL de détail/contenu et lieu. Cela ne garantit pas l'absence de republications reformulées.

Après accord explicite, 18 annonces hors métier infirmier (15 aides-soignants, 2 auxiliaires de puériculture et 1 médecin anesthésiste) ont été désactivées et retirées du catalogue/matching. Les lignes source sont conservées pour la traçabilité ; aucune suppression physique n'a été effectuée. La règle de normalisation empêche leur réimport actif.

Reprise de collecte intégrée au workflow n8n existant toutes les 30 minutes ; lancement quotidien conservé. France Travail conserve les points de reprise et contrôles de fermeture. JobsPipe utilise des incréments quotidiens, une réconciliation complète mensuelle et des contrôles de statut espacés de sept jours pour respecter le budget. Une absence ponctuelle ou un échec fournisseur ne prouve pas la fermeture. Le contrôle automatique de 22:00 a démarré les deux sources après la fin des cycles.

## Livraison et validation

Code publié sur Main : 8fee91e puis 2ebb08c ; sur Epitech Backend : 33a02d3 puis 73a9cd0. Déploiement backend vérifié READY : dpl_Dkx7GykGubFyJ9niGTzjw2Ukekkj.

188 tests unitaires et 4 tests d'intégration PostgreSQL passent ; compilation TypeScript réussie. Vérification HTTP publique : total 4 843, pages offsets 0, 100 et 4 842 non vides, offset 4 843 vide. Preuves : NATIONAL_IMPORTS_PRODUCTION_2026-09-17.json et NATIONAL_PUBLIC_CHECK_2026-09-17.json.

La collecte manuelle a terminé ses deux cycles ; la révocation finale de son jeton Vault a ensuite renvoyé 403 après expiration. Les états persistés et les contrôles de lecture suivants confirment la réussite de la collecte.

Références de conception : [recherche JobsPipe](https://docs.jobspipe.dev/reference/search-jobs), [filtres](https://docs.jobspipe.dev/api-reference/filters), [pagination](https://docs.jobspipe.dev/api-reference/pagination), [quotas](https://docs.jobspipe.dev/usage/plans), [JobPosting](https://schema.org/JobPosting).
