# Boutons de visibilité sur le dashboard administrateur — 23 septembre 2026

La « Vue d’ensemble » contient maintenant une section « Offres externes sur le site », avec les boutons indépendants « Désactiver France Travail » et « Désactiver JobsPipe ». Chaque bouton devient « Réactiver … » après désactivation.

Les actions utilisent les endpoints existants `POST /admin/operations/sources/:provider/visibility` et la confirmation journalisée existante. Les permissions `sources` et `sources:write` restent appliquées. Un état absent ne permet pas de modifier la source.

Une source désactivée disparaît des résultats, recommandations, fiches et favoris côté intérimaire à la prochaine actualisation. Les offres restent en base et les imports continuent ; la pause des imports garde son contrôle distinct. Quand les deux sources sont masquées, le frontend ne propose plus d’offres externes.

Vérifications : build et typecheck admin réussis ; suite navigateur admin existante réussie ; scénario ciblé réussi pour chaque désactivation/réactivation, annulation sans requête, échec serveur sans faux succès, CSRF, justification, lecture seule, état manquant, absence de permission et affichage 375/1440 px. Les API de ce scénario sont simulées ; aucun réglage de production n’a été désactivé pour tester les boutons.

Le comportement SQL est couvert par les quatre tests existants dans `backend/test/integration/external-visibility.spec.ts`, réussis lors de la campagne précédente : [preuve SQL](../proofs/six-features-20260923/isolated-external-visibility.spec.js.txt). Le backend n’a pas changé pour cet ajout au dashboard.
