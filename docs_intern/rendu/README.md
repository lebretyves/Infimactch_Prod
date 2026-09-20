# Rendu Epitech — InfiMatch

Dossier préparé avec réserves, état au 21 septembre 2026. Le [sujet](../references/D-WEB-901-project.pdf) demeure la référence. L'archive ZIP locale assemblée précédemment est un instantané ; les documents versionnés ci-dessous sont les entrées courantes.

## Sept livrables

| Livrable | Pièces | À finaliser |
| --- | --- | --- |
| Cahier des charges J+2 | [Exigences](../REQUIREMENTS_V1.md), [planning](../PLANNING_4_PERSONNES_11_JOURS.md), [estimation](../CHIFFRAGE_V1.csv) | Preuve de présentation/validation J+2 |
| Code | [README](../../README.md), backend et frontend du dépôt | Identifier la version effectivement remise |
| Workflows nocode | [Matching](../../workflows/matches.json), [confirmation](../../workflows/confirmation.json), [relances](../../workflows/reminders.json) | Deux résultats réels documentés |
| Données publiques | [Contrat](../OFFRES_EXTERNES_V1.md), [CLI](../../backend/src/cli.ts), backend/src/public-data | Montrer leur usage dans le produit |
| Étude de marché | [Étude sourcée](../presentation/DOSSIER_SOUTENANCE.md) | Hypothèses terrain à présenter comme telles |
| Chiffrage réel | [Formulaire humain](TEMPS_HUMAINS.csv), [estimation](../CHIFFRAGE_V1.csv) | Heures de l'équipe et écarts ; ne pas utiliser les durées agent comme heures humaines |
| Pitch | [PowerPoint](../presentation/InfiMatch_Soutenance.pptx), [PDF](../presentation/InfiMatch_Soutenance.pdf), [démonstration](../presentation/DEMONSTRATION.md) | Actualiser les références historiques et répéter à quatre |

## Automatisations

Le [rapport du 18 septembre](../AUTOMATIONS_VALIDATION_2026-09-18.md) décrit matching, confirmation PDF et relances sur un scénario fictif. Il atteste sa campagne, pas l'état de toute la file ni une réception Discord actuelle. Les exports du dépôt sont des modèles sans credentials. La recette finale doit conserver l'exécution et le résultat effectivement observé.

## Qualité et gains

Deux pratiques documentées : [requêtes de matching regroupées](../quality/OPTIMISATION_MATCHING_2026-09-20.md) et [imports bornés / parsing réutilisé](../quality/IMPORTS_SOBRIETE_2026-09-19.md). Les gains locaux de requêtes ne se convertissent pas directement en euros ou en CO2. [Accessibilité ciblée](../quality/RGAA_CORRECTIONS_2026-09-20.md) : aucune conformité complète revendiquée.

## Clôture

Compléter [la recette finale](RECETTE_FINALE.csv), les heures humaines, les décisions de responsabilité/conservation et les essais humains. Vérifier le parcours publié, les deux workflows et le MFA réel. Les réserves de sauvegarde indépendante et rotation des secrets restent celles de l'audit. Les fonctions admin avancées proposées ne sont pas exigées explicitement par le sujet.

## Schémas et dossier technique

- [Architecture](../SCHEMA_ARCHITECTURE_V1.md), [flux métier](../FLUX_V1.md) et [automatisations](../AUTOMATISATIONS.md).
