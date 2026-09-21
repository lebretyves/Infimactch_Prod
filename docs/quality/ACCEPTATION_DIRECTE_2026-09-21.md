# Acceptation directe des candidatures

Suppression du bouton et de la route POST applications/:id/selection. Le recruteur habilité dispose de « Accepter la candidature » et « Refuser cette candidature ». Après confirmation de son choix dans la page, accepter crée directement l’affectation, marque la candidature ACCEPTED et la mission FILLED, puis produit AssignmentCreated pour le PDF et les envois de confirmation existants. Aucune nouvelle notification de présélection n’est créée.

Les anciens SELECTED restent en attente de décision et peuvent être acceptés ou refusés ; aucune acceptation automatique ni modification massive de données. Les anciens événements historiques et messages déjà livrés ne sont pas supprimés.

Validation : 346 tests unitaires backend passent, dont acceptation directe depuis SUBMITTED et compatibilité SELECTED avec production de l’événement de confirmation. Build backend/frontend réussis. Test navigateur avec réponses fictives : absence de Sélectionner, refus visible, acceptation directe, refus serveur puis nouvelle tentative réussie. Tests PostgreSQL mis à jour mais non exécutés : services isolés non démarrés. Aucune mission réelle modifiée par la recette, aucun e-mail réel envoyé.
