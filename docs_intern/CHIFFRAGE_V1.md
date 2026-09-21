# Chiffrage V1 — contrainte de livraison fixe

**Contrainte confirmée : 4 personnes, 11 jours, rendu à date fixe.** Le planning de référence est [PLANNING_4_PERSONNES_11_JOURS.md](PLANNING_4_PERSONNES_11_JOURS.md). Le périmètre V1 validé est conservé.

L’estimation initiale de conception reste **348 à 528 heures-personnes** pour un projet neuf ; détail dans CHIFFRAGE_V1.csv. Cette fourchette n’a pas été mesurée sur l’équipe ni sur un dépôt applicatif et doit être recalibrée avec les bibliothèques maîtrisées, le code réutilisable et les premiers lots. Elle ne modifie pas la date de rendu.

La capacité quotidienne réelle n’a pas été fournie. À titre de calcul, quatre personnes sur onze jours représentent 44 journées-personnes. Six heures productives par personne et par jour donneraient 264 heures, mais six heures n’est pas une disponibilité confirmée. L’ancienne hypothèse de cinq personnes et 330 heures est retirée.

L’organisation retient quatre périmètres simultanés : backend métier ; backend données/intégrations ; frontend ; intégration/documents/automatisations. Les tests sont répartis entre les auteurs, la recette est collective. L’intégration quotidienne et les contrats communs limitent le travail refait ; le parallélisme ne réduit pas mécaniquement les heures-personnes.

Ne pas compter deux fois le même travail : Q01 correspond aux tests dédiés au-delà des vérifications courantes des modules ; Q03 à la recette intégrée et ses corrections. Consigner les heures réellement passées dans [le relevé des temps humains](rendu/TEMPS_HUMAINS.csv), sans remplir le réalisé avec l’estimation.

Au cadrage J+2, confronter charge, avancement et dépendances à cette contrainte fixe. Aucun report de date ni retrait de fonctionnalité validée n’est présumé autorisé. Les difficultés sont traitées tôt et leur état est déclaré honnêtement ; une fonction bloquée ne devient pas livrée parce que l’échéance est atteinte.
