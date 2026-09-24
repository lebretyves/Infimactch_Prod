# Coût de réalisation et d’exploitation — 24 septembre 2026

## Statut et périmètre

Budget prospectif, aucun abonnement acheté ni tarif négocié. Montants de services et matériel hors taxes ; salaires exprimés en brut ou coût employeur selon le libellé. Prix publics consultés le 24/09/2026, à confirmer lors de la commande. Convention de change de budget **1 USD = 1 EUR**, qui ne prétend pas être le taux de marché. Les hypothèses sont modifiables dans [le modèle JSON](couts-production.json) et [le classeur](COUTS_PRODUCTION.xlsx). Recalcul : `python docs/rendu/2026-09-23/calcul-couts.py` ; [résultats numériques](resultats-couts.json).

## Réalisation du POC : heures et valorisation

Effectif prévu : 5 personnes × 11 jours × 7 h = **385 h-personnes**. Effectif effectif déclaré : 4 personnes × 11 jours × (7 h + environ 2 h le soir) = **environ 396 h-personnes**, soit 308 h de journée et 88 h du soir, 99 h par personne. Écart à la capacité initiale : +11 h, soit +2,86 %. L'estimation fonctionnelle initiale de 348–528 h (centre 438 h) est une autre référence : 396 h est dans cette fourchette, 42 h sous son centre. Ce sont des heures reconstituées d’après la déclaration de l’équipe, pas un relevé quotidien ni une ventilation vérifiée par fonctionnalité.

La fiche [APEC Chef de projet digital](https://www.apec.fr/tous-nos-metiers/commercial-marketing/chef-de-projet-digital.html), qui cite aussi « chargé de projet digital », indique une moyenne de **41 000 EUR brut/an**. Sur la convention de 35 × 52 = 1 820 heures payées/an, le taux est **22,53 EUR brut/h**. Calculs effectués avec le taux non arrondi. Ce benchmark ne constitue pas un salaire DevOps constaté ni une facture de prestataire.

| Valorisation | Montant EUR |
| --- | ---: |
| Travail déclaré, 396 h au taux brut de référence | 8 920,88 |
| Amortissement matériel affecté aux 11 jours | 133,33 |
| Travail brut + matériel imputé | **9 054,21** |
| Travail avec hypothèse de charges employeur +42 %, puis matériel | **12 800,98** |

Le dernier montant est la valorisation économique de réalisation retenue pour comparer avec l’exploitation en coût employeur. Ce n’est pas une dépense réellement payée. Les majorations éventuelles du travail supplémentaire ne sont pas calculées, faute de statut et d’organisation horaire précis. Les charges à +42 % sont une hypothèse de simulation, pas un taux universel : à vérifier dans le [simulateur Urssaf](https://mon-entreprise.urssaf.fr/simulateurs/salaire-brut-net). Les abonnements historiquement payés pendant le POC ne sont pas documentés et ne sont pas inventés.

## Matériel : achat et amortissement sans double comptage

Hypothèse acceptée par l’équipe : quatre postes pendant la réalisation, un poste pour la maintenance, durée d’utilisation économique **3 ans**, valeur résiduelle nulle. Budget par poste : ordinateur 1 500 EUR + écran 250 EUR + station d’accueil 150 EUR + clavier/souris/casque 100 EUR = **2 000 EUR HT**. Il s’agit d’une enveloppe estimative, pas d’un prix produit vérifié ni d’une facture.

- Achat initial des quatre postes : **8 000 EUR HT de trésorerie**, si aucun matériel n’est disponible.
- Amortissement annuel des quatre postes : 8 000 / 3 = 2 666,67 EUR.
- Affectation au projet sur **220 jours d’utilisation professionnelle/an** : 8 000 / 3 / 220 × 11 = **133,33 EUR**. Les soirées ne créent pas une deuxième journée d’amortissement. Cette clé de coût interne n’est pas un calcul d’amortissement fiscal ou comptable au prorata calendaire.
- Maintenance : un poste à 2 000 / 36 = **55,56 EUR/mois**. Il peut être repris parmi les quatre postes : **pas d’achat d’un cinquième poste nécessaire**. Les trois autres doivent être réaffectés à d’autres projets pour sortir du coût InfiMatch. S’ils restent tous dédiés à InfiMatch, ajouter **166,67 EUR/mois** aux scénarios.

On n’ajoute jamais les 8 000 EUR d’achat et leur amortissement dans le même coût économique. Trésorerie initiale théorique avec salaires chargés + achat de quatre postes : **20 667,65 EUR**, hors frais historiques inconnus ; valorisation de réalisation avec seulement la quote-part de matériel : **12 800,98 EUR**. Le coût initial du logiciel n’est pas amorti une seconde fois dans le coût mensuel présenté ci-dessous.

## Abonnements et provisions mensuelles

| Service | Base mensuelle | Périmètre | Source / nature |
| --- | ---: | --- | --- |
| Vercel Pro | 20,00 USD | 1 siège déployant, crédit de consommation inclus | [Tarif](https://vercel.com/docs/plans/pro-plan) |
| Supabase Pro | 25,00 USD | 1 projet Micro, crédit compute déduit | [Tarif](https://supabase.com/pricing) |
| MongoDB Atlas M10 | 58,40 USD | Prix de départ 0,08 USD/h × 730 h, région à confirmer | [Tarif](https://www.mongodb.com/pricing) |
| n8n Cloud Pro | 50,00 EUR | 10 000 exécutions/mois, facturation annuelle 600 EUR | [Tarif](https://n8n.io/pricing/) |
| SMTP2GO Starter | 10,00 USD | 10 000 emails/mois, tarif du corps de la page à confirmer à la commande | [Tarif](https://www.smtp2go.com/pricing/) |
| JobsPipe Builder | 49,00 USD | 25 000 annonces distinctes/mois ; pas 25 000 missions validées | [Tarif](https://jobspipe.dev/pricing) |
| GitHub Team | 16,00 USD | 4 utilisateurs × 4 USD ; une organisation payante modélisée | [Tarif](https://github.com/pricing) |
| Hébergement Vault Community | 10,00 EUR | Provision serveur ; architecture cible, aucune migration effectuée | Hypothèse de budget, pas un devis |
| Sauvegardes externes chiffrées | 10,00 EUR | Provision stockage, transferts à mesurer | Hypothèse de budget, pas un devis |
| Supervision | 15,00 EUR | Provision outil de surveillance | Hypothèse de budget, pas un devis |
| Domaine | 1,67 EUR | Provision renouvellement 20 EUR/an | Hypothèse de budget, pas un devis |

Total abonnements et provisions techniques : **265,07 EUR/mois**. Sur ce total, 228,40 EUR proviennent des tarifs publics convertis selon la convention ; 36,67 EUR sont des provisions. Vercel est compté pour une équipe, pas trois fois pour trois applications ; Supabase pour un projet avec son crédit compute, pas deux fois. MongoDB reste un prix de départ, à ajuster à la région, au stockage, aux sauvegardes et aux transferts. GitHub Team est chiffré pour une organisation commerciale de quatre utilisateurs : aucun achat ni modification de l’organisation Epitech, dont la facturation reste sous responsabilité de ses administrateurs.

France Travail, FINESS/ANS, liens de navigation cartographique et bot Discord n’ont pas d’abonnement payant ajouté dans ce scénario ; ils restent soumis à leurs modalités d’accès et quotas. Le modèle n’inclut pas de SMS, API Google Maps payante, IA générative payante ou licence Vault Enterprise. Le serveur Vault est une cible budgétaire séparée du poste local actuel ; sa migration et sa sécurisation nécessiteraient une intervention. La procédure Vault reste manuelle, conformément au choix de l’équipe.

## Maintenance à temps plein et budget mensuel

| Poste | EUR/mois |
| --- | ---: |
| Une personne, 41 000 brut/an × 1,42 / 12 | 4 851,67 |
| Abonnements et provisions techniques | 265,07 |
| Réserve technique de 20 % | 53,01 |
| Amortissement d’un poste | 55,56 |
| Provision connexion et énergie du poste | 40,00 |
| **Total de fonctionnement budgété** | **5 265,30** |

Soit **63 183,63 EUR/an**, avec n8n payé annuellement. La réserve n’est pas un devis fournisseur et ne garantit pas de couvrir toute montée en charge. Un salarié à temps plein ne couvre pas 24 h/24, les congés ou toutes les spécialités. La base 1 820 heures est une convention de valorisation salariale, pas une garantie d’heures productives. Location de bureaux, assurance, comptabilité, commercial, frais de paiement, marge et fiscalité de l’entreprise restent hors périmètre : il s’agit du coût technique du service et de sa maintenance.

## Coût d’un cycle jusqu’à validation

Cycle : création/publication du besoin à recherche et matching à candidature à décision humaine à affectation validée, avec document et notifications. Le dénominateur est le nombre de **missions effectivement validées**, pas le nombre d’annonces importées ou de candidatures. La formule est **budget mensuel / validations mensuelles** : c’est un coût moyen alloué, pas un tarif API facturé pour chaque clic. Le temps du recruteur qui décide et la rémunération du soignant ne sont pas inclus.

| Missions validées/mois | Coût moyen complet du périmètre par validation | Exécutions n8n, scénario technique |
| ---: | ---: | ---: |
| 100 | **52,65 EUR** | 1210 |
| 500 | **10,53 EUR** | 4730 |
| 1000 | **5,27 EUR** | 9130 |

Les quotas ne sont pas une preuve de capacité en charge. Les exports publiés montrent 6 reprises/jour, 2 imports France Travail/jour, 1 import JobsPipe/jour et 1 maintenance/jour, soit **300 déclenchements pour 30 jours**. Hypothèse illustrative : **8 exécutions par mission validée** (2 orchestrations et 6 relais Discord), avec 10 % de réserve de reprises : (300 + 8 × N) × 1,10. Ce ratio n’est pas mesuré : diffusion à beaucoup de candidats, sous-workflows facturables, rappels, échecs, annulations et missions non pourvues peuvent le dépasser. À 1 000 validations, le scénario utilise 9 130/10 000 exécutions ; à 80 % de réussite, 1 250 cycles tentés conduiraient à 11 330 exécutions selon la même hypothèse et imposeraient un autre budget n8n. Sur 31 jours, remplacer 300 par 310.

Autre hypothèse à vérifier dans les journaux : 4 emails/cycle plus 100 emails de fond donnent 4 100 emails à 1 000 validations, sous le quota de 10 000. JobsPipe compte les nouvelles annonces livrées pendant le mois (pas les appels ni les validations) : 25 000 annonces incluses, recharge facturable. Les imports externes ne garantissent aucun recrutement. Les octets transférés, durée CPU, taille des documents et appels réels ne sont pas mesurés par ce modèle : tout dépassement impose un recalcul avant de promettre un prix ferme.

Sensibilité : à +35 % de charges employeur, le total baisse de 239,17 EUR/mois ; à +50 %, il augmente de 273,33 EUR/mois. Une variation de 10 % du dollar affecte les 178,40 USD/mois du panier, soit 17,84 EUR avant réserve, 21,41 EUR réserve comprise. Coût marginal technique non déterminé : il peut rester faible dans les quotas, sans être assimilable au coût moyen ci-dessus.
