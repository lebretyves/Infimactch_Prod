# Coût de réalisation de l’application InfiMatch

[**Télécharger le PDF dédié au coût du projet**](COUT_REALISATION_INFIMATCH.pdf)

Estimation reconstituée le 24 septembre 2026 : **12 800,98 EUR** pour le travail valorisé en coût employeur et la quote-part d’amortissement du matériel. Ce montant n’est ni une facture ni un coût complet constaté.

| Poste | Valeur |
| --- | ---: |
| Équipe effective | 4 personnes |
| Durée | 11 jours |
| Travail quotidien déclaré | 7 h + environ 2 h le soir |
| Volume total déclaré | Environ 396 h-personnes |
| Travail au salaire brut de référence | 8 920,88 EUR |
| Charges employeur supposées à 42 % | 3 746,77 EUR |
| Matériel amorti affecté au projet | 133,33 EUR |
| **Total estimatif de réalisation** | **12 800,98 EUR** |

## Documents et calculs retrouvés

- [Détail des hypothèses et du calcul](../../annexe/rendu/2026-09-23/09_COUTS_PRODUCTION.md).
- [Déclaration des heures et limites du chiffrage réel](../../annexe/rendu/2026-09-23/06_CHIFFRAGE_REEL.md).
- [Classeur de calcul des coûts](../../annexe/rendu/2026-09-23/COUTS_PRODUCTION.xlsx).
- [Paramètres du modèle](../../annexe/rendu/2026-09-23/couts-production.json), [calcul Python](../../annexe/rendu/2026-09-23/calcul-couts.py) et [résultats](../../annexe/rendu/2026-09-23/resultats-couts.json).
- [Soutenance : coût de réalisation page 11](../../annexe/rendu/2026-09-23/InfiMatch_Soutenance_Pro_2026-09-23.pdf).
- [Exploitation mensuelle et rentabilité commerciale, dans un dossier distinct](../business/2026-09-24/README.md).

## Périmètre et réserves

Référence salariale retenue dans le travail du matin : 41 000 EUR brut/an, sur 1 820 heures payées/an, soit 22,53 EUR brut/h. Source : [fiche APEC Chef de projet digital](https://www.apec.fr/tous-nos-metiers/commercial-marketing/chef-de-projet-digital.html), citée dans le dossier du 24 septembre. Charges employeur de 42 % : hypothèse, pas un taux contractuel vérifié.

Matériel : quatre postes à 2 000 EUR HT, amortis sur trois ans et 220 jours d’utilisation professionnelle/an ; quote-part de onze jours : 133,33 EUR. L’achat éventuel de 8 000 EUR n’est pas ajouté à cette quote-part. Avec achat intégral des postes, le besoin théorique de trésorerie serait de 20 667,65 EUR, hors frais inconnus.

Les 396 heures sont déclarées et reconstituées, sans relevé quotidien vérifié par fonctionnalité. Les éventuelles majorations des heures supplémentaires, les abonnements réellement payés pendant la réalisation, les autres licences/outils, les locaux, l’énergie et les frais généraux ne sont pas établis. Ils ne sont pas inventés dans ce total. Les frais récurrents futurs et la maintenance sont présentés dans le dossier d’exploitation.

Le PDF est régénérable avec `python scripts/build-project-cost-dossier.py` ; il relit les paramètres du modèle existant pour éviter une seconde source de calcul.
