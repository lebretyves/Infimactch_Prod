# Vos crushs — 21 septembre 2026

La section Vos pistes de mission de l’accueil intérimaire devient Vos crushs : encadré bleu nuit InfiMatch, trois cartes côte à côte sur grand écran, adaptation tablette/mobile et favoris par cœur. Chaque mission partenaire disposant d’un score réel affiche son Matching en pourcentage. Aucun pourcentage n’est inventé pour une offre externe ou une compatibilité non confirmée.

Le helper missionCrushs conserve le classement de l’API et limite la sélection à trois cartes réelles sans doublon. Toutes privilégie les missions partenaires, puis complète avec les offres externes. Partenaires et Externes respectent la source choisie. Le serveur fournit déjà les trois meilleurs partenaires selon le score ; les critères externes partiels ne constituent pas un score comparable.

Fonctions conservées : filtres dans l’URL, détails et identifiant d’explication de matching, favoris, toutes les offres, actualisation de source, avertissements, profil incomplet, absence de résultat et réessais. Le cœur ne déclenche pas de candidature.

Validation : quatre tests de sélection réussis ; compilation frontend réussie ; recette navigateur avec API fictive sur le maximum de trois cartes, les pourcentages94/88/80, les liens classés, ajout/retrait de favoris, filtres, remplissage externe, profils incomplets sans faux taux, état vide, erreur/réessai et absence de débordement1440/768/375. Aucun compte ni candidature réelle modifié. Aucun changement backend ni migration.

Évaluation indépendante finale : PASS ; taux visibles sur ordinateur/mobile, focus clavier et cibles de favoris vérifiés.
