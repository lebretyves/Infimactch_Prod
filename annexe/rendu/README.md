# Rendu Epitech — InfiMatch


## Dossier actualisé du 23 septembre 2026

Dernières corrections : [suivi de l’audit](../quality/SUIVI_AUDIT_FINAL_2026-09-23.md) et [preuves vérifiées](../proofs/audit-final-20260923/README.md).
**[Ouvrir les sept livrables](2026-09-23/README.md)** : CDC, installation, neuf exports n8n publiés, nettoyage FINESS, étude de marché sourcée, classeur estimé/réel et pitch de 15 minutes (PowerPoint, PDF, notes).

Les heures humaines et la preuve du cadrage J+2 restent à compléter. Les informations ci-dessous décrivent la préparation antérieure du 21 septembre ; les preuves et limites du dossier daté du 23 font référence pour la nouvelle livraison.


Dossier préparé avec réserves, état au 21 septembre 2026. Le [sujet](../references/D-WEB-901-project.pdf) demeure la référence. L'archive ZIP locale assemblée précédemment est un instantané ; les documents versionnés ci-dessous sont les entrées courantes.

## Sept livrables

| Livrable | Pièces | À finaliser |
| --- | --- | --- |
| Cahier des charges J+2 | [Exigences](../REQUIREMENTS_V1.md), [planning](../PLANNING_4_PERSONNES_11_JOURS.md), [estimation](../CHIFFRAGE_V1.csv) | Preuve de présentation/validation J+2 |
| Code | [README](../../README.md), backend et frontend du dépôt | Voir le registre de livraison et le manifeste du rendu |
| Workflows nocode | [Matching](../../workflows/matches.json), [confirmation](../../workflows/confirmation.json), [relances](../../workflows/reminders.json) | Rassembler les traces des deux essais réussis et leurs résultats |
| Données publiques | [Contrat](../OFFRES_EXTERNES_V1.md), [CLI](../../backend/src/cli.ts), backend/src/public-data | Montrer leur usage dans le produit |
| Étude de marché | [Étude sourcée](../presentation/DOSSIER_SOUTENANCE.md) | Hypothèses terrain à présenter comme telles |
| Chiffrage réel | [Formulaire humain](TEMPS_HUMAINS.csv), [estimation](../CHIFFRAGE_V1.csv) | Heures de l'équipe et écarts ; ne pas utiliser les durées agent comme heures humaines |
| Pitch | [PowerPoint](../presentation/InfiMatch_Soutenance.pptx), [PDF](../presentation/InfiMatch_Soutenance.pdf), [démonstration](../presentation/DEMONSTRATION.md) | Actualiser les références historiques et répéter à quatre |

## Automatisations

Le [rapport du 18 septembre](../AUTOMATIONS_VALIDATION_2026-09-18.md) décrit matching, confirmation PDF et relances sur un scénario fictif. Il atteste sa campagne, pas l'état de toute la file ni une réception Discord actuelle. Le porteur confirme que les automatisations ont déjà fonctionné ; retrouver les traces existantes avant de décider de les rejouer. Les exports du dépôt sont des modèles sans credentials. La recette finale doit conserver l'exécution et le résultat effectivement observé.

## Qualité et gains

[Bilan SEO actualisé du 22 septembre 2026](../quality/POSITIONNEMENT_SEO_2026-09-22.md) : SEO Lighthouse mobile 100/100 sur deux passages, performances 97–98/100. Indexabilité technique vérifiée ; positionnement Google et données Search Console non attestés par cette campagne.

Deux pratiques documentées : [requêtes de matching regroupées](../quality/OPTIMISATION_MATCHING_2026-09-20.md) et [imports bornés / parsing réutilisé](../quality/IMPORTS_SOBRIETE_2026-09-19.md). Les gains locaux de requêtes ne se convertissent pas directement en euros ou en CO2. [Accessibilité ciblée](../quality/RGAA_CORRECTIONS_2026-09-20.md) : aucune conformité complète revendiquée.

## Versions et recette

Le [registre de livraison](LIVRAISON_VERIFIEE.json) fixe les dernières versions applicatives vérifiées. Dans [la recette finale](RECETTE_FINALE.csv), la version reste vide tant que le scénario n’a pas été exécuté et documenté : renseigner le SHA réellement testé, la date et la preuve, sans préremplir une ancienne version. Les preuves historiques réussies peuvent être utilisées avec leur date et leur périmètre ; elles ne deviennent pas une recette de la version actuelle.

## Clôture

Compléter [la recette finale](RECETTE_FINALE.csv), les heures humaines, les décisions de responsabilité/conservation et les essais humains. Vérifier le parcours publié, les deux workflows et le MFA réel. Les réserves de sauvegarde indépendante et rotation des secrets restent celles de l'audit. Les fonctions admin avancées proposées ne sont pas exigées explicitement par le sujet.

## Schémas et dossier technique

- [Architecture](../SCHEMA_ARCHITECTURE_V1.md), [flux métier](../FLUX_V1.md) et [automatisations](../AUTOMATISATIONS.md).

[Seconde vérification documentaire et réserves restantes](../VERIFICATION_DOCUMENTAIRE_2026-09-21.md).


## Actualisation du 24 septembre 2026

Déclaration équipe : 5 personnes prévues (385 h), 4 effectives, 11 jours de 7 h et environ 2 h le soir, soit environ **396 h**, dont 88 h le soir. Cette déclaration actualise les mentions historiques de temps inconnus ; la ventilation par lot reste à établir. Valorisation employeur hypothétique et matériel amorti : **12 800,98 EUR**. Exploitation avec un salarié et matériel : **5 265,30 EUR/mois**. Détail et hypothèses : `annexe/rendu/2026-09-23/09_COUTS_PRODUCTION.md`.
