# Tests navigateur et secours de rendu — 20 septembre 2026

## Corrections
- Scripts officiels notification-read et mixed-recommendations : réponses email-deliveries et matching/rules explicites ; attentes de réponses associées aux filtres Partenaires/Externes, sans délai fixe de diagnostic.
- Journal des emails : validation de la liste, des champs rendus, des dates et des événements avant affichage ; erreur compréhensible avec actualisation, sans message technique serveur.
- Règles du matching : validation des quatre poids numériques, bornés et totalisant 1 ; erreur locale et possibilité de réessayer.
- Routeur public et utilisateur : page de secours pour les erreurs de rendu, titre focalisé, aucune pile technique affichée, rechargement explicite et lien accueil. Avertissement sur les données non enregistrées.
- Commande npm run test:browser : serveur local éphémère, trois scripts officiels, fermeture du serveur et arrêt sur échec ou dépassement de 120 secondes par script.
- GitHub Actions installe Chromium et exécute la commande après compilation. Les captures vont sous frontend/artifacts/browser-checks et sont ignorées par Git.

## Résultats
Build frontend, build administrateur, npm test et test:seo réussis.
Recette complète réussie avec Edge puis Chromium (Playwright installé avec certificats système, vérification TLS conservée).
Deux scénarios historiques : consultation/lecture des notifications et recommandations mixtes, filtres, pagination, favoris, états vides et erreurs.
Huit scénarios : réponse réseau absente, HTTP 503, JSON incohérent et requête retardée, chacun sur emails et règles ; récupération vérifiée après réponse valide. Le chargement lent est contrôlé par libération explicite de la réponse, pas un délai arbitraire.
Un scénario de secours : notification contenant un objet à la place du texte, page de secours visible sans erreur React technique, puis retour réussi aux notifications par Réessayer.
Toutes les API sont simulées : aucun compte créé, aucune notification envoyée et aucune donnée réelle modifiée.

## Limites
La page de secours couvre les erreurs de rendu des routes publiques/utilisateur ; elle ne remplace pas la gestion des erreurs asynchrones ni celle des fournisseurs. Les protections de forme ajoutées ciblent les deux réponses identifiées, pas tous les endpoints. Cette recette ne constitue pas un audit RGAA complet. GitHub Actions Epitech était bloqué par le budget de l’organisation lors du lot précédent ; le code et la commande sont néanmoins sauvegardés dans Backend.
