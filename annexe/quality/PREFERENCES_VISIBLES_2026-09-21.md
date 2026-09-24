# Cookies et accessibilité dès l’arrivée

Les préférences du site précèdent maintenant le contenu. Le bouton Accessibilité se trouve à droite, avec son libellé visible, sur les pages publiques, l’inscription et l’espace connecté. La barre reste dans le flux et ne masque pas les commandes de navigation.

La fenêtre cookies apparaît automatiquement dès la première visite sans choix valide, y compris à l’entrée directe dans l’inscription. Elle est centrée et propose des actions accepter/refuser de même importance. Un choix valide déjà mémorisé reste respecté ; le bouton Cookies permet de le rouvrir.

Une commande Accessibilité est également proposée dans la fenêtre cookies. Elle suspend cette fenêtre sans accepter ni refuser les cookies ; la fermeture des options ramène au choix en attente. La navigation clavier et le retour du focus sont conservés. Aucun chargement Google n’est autorisé par l’ouverture des options d’accessibilité.

La recette officielle `frontend/scripts/test-browser-accessibility.mjs` couvre la première visite sur l’accueil, l’inscription et son étape identité, les formats mobile et ordinateur, le passage entre les deux panneaux, la mémorisation du refus et l’absence de chargement Google. Les contrôles existants du clavier, du zoom et de l’espacement restent exécutés.
