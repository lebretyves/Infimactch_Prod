# Photo, matchs, calendrier et vidéos d’aide — 24 septembre 2026

## Corrections

- Mot de passe oublié : photographie des soignantes réutilisée depuis le composant commun, sur ordinateur et mobile. Le formulaire reste prioritaire sur mobile. Aucun email réel envoyé pour les vérifications.
- Vos matchs : retrait du bouton Toutes dans cette seule section ; Partenaires par défaut, Externes lorsque la visibilité le permet. Les anciens liens origine=toutes restent utilisables et affichent les partenaires. Le filtre Toutes reste disponible dans la recherche générale.
- Une panne de recommandations ne s’affiche plus simultanément comme un catalogue vide. Le message d’absence de match propose le catalogue et explique les critères à vérifier. Le masquage administrateur des offres externes reste respecté.
- Calendrier mensuel : clic sur une journée ouvre une fenêtre de modification des créneaux, avec état d’enregistrement, erreur éventuelle et retour du focus à la fermeture. Les créneaux réservés par une mission confirmée restent verrouillés.
- Six tutoriels réenregistrés depuis le frontend actuel avec des API et données fictives, voix française et sous-titres. Le tutoriel agenda présente le nouvel éditeur mensuel. [Preuves des vidéos](../proofs/help-videos-2026-09-24/README.md).

## Diagnostic de l’absence de matchs

Le diagnostic demandé a été exécuté en lecture seule sur le compte indiqué par l’utilisateur. Les critères actuels ne donnaient aucune mission partenaire éligible ; les sources externes étaient masquées pour l’affichage. Aucune modification du profil, des disponibilités, des règles métier ou des réglages administrateur n’a été effectuée pour fabriquer un résultat. Les données détaillées du compte ne sont pas publiées dans Git.

## Validation

105 tests frontend réussis et typage valide. Contrôles ciblés : photo chargée et absence de débordement ; filtres partenaires/externes, favoris, anciennes URL, panne et absence de résultats ; calendrier mensuel, trois états, erreur puis nouvelle tentative, créneau confirmé, clavier/focus et changement d’heure Paris. API simulées et aucune action sur une mission réelle.

Les preuves de build, parcours navigateur et lecture des vidéos accompagnent la livraison. Le backend n’est pas modifié par ce lot ; aucune nouvelle migration nécessaire. La présence de ce rapport ne prouve pas la fusion ni le déploiement.
