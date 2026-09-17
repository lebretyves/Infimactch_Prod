# Récupération backend et corrections de conservation — 16 septembre 2026

Base récupérée : af0720d. Les effets frontend de f2f66ec et 8eaf517 sont annulés par deux commits de revert ; aucun changement n’est copié dans le frontend local.

## Corrections

- Les événements référencés par `reminder_window` restent conservés : leur suppression bloquait sur une clé étrangère. Les conserver protège aussi contre une nouvelle relance de la même fenêtre.
- La purge et la clôture ne suppriment aucun fichier dans leur transaction SQL. Après commit, le nettoyage prend le verrou du fichier et vérifie que son document n’existe plus. Un rollback conserve donc fichier et référence. Les documents sélectionnés pour purge sont verrouillés contre un changement d’état concurrent.
- La clôture efface les coordonnées et champs détaillés du profil, compétences, expérience, disponibilités, préférences, qualifications déclarées, favoris, notifications et réponses idempotentes. Elle invalide le mot de passe, les sessions, Google et les memberships. Les détails d’audit attribués au compte sont nettoyés.
- La CLI supprime ensuite les historiques MongoDB du compte. La création d’un historique prend un verrou partagé sur le compte actif pour être coordonnée avec sa clôture. Une erreur MongoDB produit un échec explicite ; relancer la commande termine l’opération.
- Une suppression physique interrompue laisse un fichier orphelin, pas un document lisible sans fichier. La réconciliation documentaire existante permet de reprendre le nettoyage après incident.

## Limites explicites de conservation

Les missions, candidatures, affectations et PDF de confirmation constituent l’historique métier conservé ; le compte reste une ligne désactivée avec identifiant technique. Il s’agit d’une clôture avec effacement des données de profil, pas d’une garantie de disparition de toute donnée personnelle de tous les historiques ou des organisations partagées.

Les anciennes sauvegardes ne sont pas réécrites. Leur conservation et la réapplication des demandes d’effacement après restauration restent des opérations d’exploitation. La purge est une commande opérateur : aucune nouvelle tâche de suppression automatique n’est activée et aucune purge n’a été appliquée à la base locale utilisateur.

## Restauration réellement exécutée

Le contrôle compare les comptes au manifeste de l’instantané, et non à la base de production actuelle. Les nouveaux backups enregistrent ces comptes. Les anciens manifestes sans comptes de référence restent explicitement identifiés.

Le script `prepare-representative-backup.mjs <sauvegarde>` prépare une copie privée avec PostgreSQL fictif neuf, une mission, une affectation et un PDF chiffré. MongoDB, Vault et n8n proviennent d’une sauvegarde historique vérifiée. Ce mélange contrôlé est un exercice de restauration, pas une nouvelle sauvegarde cohérente de production.

`restore-test.mjs <copie> --require-representative` exige une mission, une affectation et un document, vérifie les empreintes, restaure les bases, déchiffre tous les documents référencés et contrôle Vault et les workflows. Exercice réussi : 2 comptes fictifs, 1 mission, 1 affectation, 1 document déchiffré. Preuve : [restore.json](proofs/v1-hardening/restore.json).

## Tests

Tests sur PostgreSQL réel : rollback sans perte du fichier, nettoyage après commit et rejeu, conservation des références de relance, effacement du profil et révocation de session. Test CLI avec MongoDB réel : effacement des historiques et rejeu. La campagne finale est enregistrée dans [result.json](proofs/v1-hardening/result.json) et [coverage.txt](proofs/v1-hardening/coverage.txt).

Validation finale locale : 159 tests backend réussis ; couverture lignes 81,16 %, branches 80,45 %. PostgreSQL, MongoDB, n8n et régressions de sécurité isolés.
