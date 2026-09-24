# Ajout et retrait des établissements agence — 21 septembre 2026

Mes établissements propose Ajouter un établissement, une recherche FINESS avec préremplissage ou une saisie manuelle (FINESS facultatif), puis Supprimer de ma liste avec confirmation intégrée.

L’ajout crée une fiche propre à l’agence et ne réutilise que ses rattachements existants pour éviter les doublons. Un même FINESS ne confère jamais l’accès au compte privé d’une autre organisation. Une clé d’idempotence protège les réessais. Les droits de membre actif de l’agence sont vérifiés avant chaque action.

Le retrait supprime uniquement le rattachement agence/établissement ; il conserve la fiche, les missions et leur historique. Les brouillons et missions ouvertes/pourvues bloquent le retrait. Le verrou sur le rattachement sérialise le retrait avec la création d’une nouvelle mission. Plusieurs agences restent indépendantes ; les établissements détenus directement n’affichent pas de retrait de rattachement inexistant.

Validation : 364 tests unitaires backend réussis, compilations frontend/backend réussies. Recette navigateur avec API fictive : FINESS, remplissage, envoi puis réessai avec la même clé, rechargement de liste, retrait bloqué puis réussi, absence de fenêtre native et de débordement mobile. Aucun établissement réel ajouté ou retiré lors des tests. Pas de migration de base nécessaire.
