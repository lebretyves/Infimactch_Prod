# Trois meilleures offres partenaires — 24 septembre 2026

Les recommandations proposent au maximum trois missions ouvertes et futures correspondant aux diplômes du profil, classées par score indicatif décroissant. Les critères non satisfaits restent visibles ; les contrôles stricts de candidature et d’affectation ne changent pas. Sans diplôme renseigné, les suggestions générales restent distinctes et sans pourcentage personnalisé.

Le calcul utilise PostgreSQL en lecture seule dans une transaction cohérente, avec distances PostGIS, lots de 100, plafond de 10 000 missions et budget de 8 secondes. En cas de dépassement, une erreur explicite remplace un classement incomplet. Aucun enregistrement MongoDB n’est créé.

## Preuves

- [Unitaires et couverture](unit-coverage.txt) : 692/692 réussis ; lignes 95,01 %, branches 90,08 %, fonctions 82,65 %.
- [Campagne isolée](result.json) et [trois suites](suite-results.json) : recommandations partenaires, classement externe et visibilité externe réussis.
- [Intégration partenaires](partner-recommendations.spec.js.txt) : catalogue de 108 missions, sélection au-delà du premier lot, exclusions des missions passées/non ouvertes/autre diplôme, compte inactif refusé.

La première exécution d’intégration a échoué sur une fixture FILLED sans affectation, interdite par la base. La fixture a été corrigée en DRAFT, puis les trois suites ont été réexécutées avec succès. Les preuves publiées ici sont celles de cette réexécution. Aucun assouplissement des contraintes de production.

Publication de ce changement : à confirmer après fusion de sa PR. L’approbation de la PR #4 ne couvre pas ce changement supplémentaire.

- [Build frontend](frontend-build.txt) : typage et compilation de production r?ussis.
- [Parcours navigateur](frontend-browser.txt) : campagne compl?te r?ussie, dont trois offres indicatives 87/68/42, crit?res bloquants expliqu?s, filtres et visibilit? externe conserv?s.
