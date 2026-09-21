# Création et suivi des missions

Mise à jour : 21 septembre 2026.

## Parcours actuel

Les agences et les établissements utilisent un seul espace : **Missions et suivi**.
Le bouton **Créer une mission** ouvre le formulaire complet. La validation
**Créer et publier la mission** appelle `POST /missions/open` et publie directement
l’annonce. Le salaire, le lieu et les conditions nécessaires sont renseignés avant
la publication. Les droits de l’organisation et les contrôles du serveur restent
applicables.

L’onglet et le formulaire séparés « Besoins » ont été retirés, ainsi que les blocs
« Besoins à préparer » et « Mes derniers besoins » de l’accueil. Le suivi utilise
les missions publiées, leurs candidatures et leurs affectations.

## Reprise des données antérieures

Aucune donnée métier n’est supprimée ou publiée automatiquement. Les anciennes
saisies sans mission associée peuvent être complétées depuis la liste des missions,
dans « Annonces à compléter ». Cette rubrique disparaît lorsqu’il n’existe aucun
ancien enregistrement à reprendre sur une liste vide. La navigation paginée conserve
l’accès aux enregistrements plus anciens.

L’adresse historique `/besoins` redirige vers `/missions`. Un ancien lien précis
`/besoins#besoin-UUID` ouvre la mission associée si elle existe, sinon le formulaire
prérempli. Une erreur d’accès n’entraîne jamais une création automatique.
Les relations et les API historiques sont conservées pour la compatibilité ;
le nouveau parcours ne crée plus de `staffing_request`.

## Validation

`frontend/scripts/test-mission-publication.mjs`, exécuté par
`npm run test:browser`, vérifie la publication en un formulaire pour les deux
rôles, la clé d’idempotence, l’absence d’écriture dans les anciennes demandes,
la reprise des données, la pagination, les erreurs et les redirections sans doublon.

Les API sont simulées dans cette recette navigateur : elle ne crée aucune annonce
en production. La publication serveur existante n’a pas été modifiée.
