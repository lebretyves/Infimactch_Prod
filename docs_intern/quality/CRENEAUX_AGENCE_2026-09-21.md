# Créneaux des missions agence — 21 septembre 2026

La création de mission propose Matin, Après-midi et Nuit. Aucun horaire fixe n’est ajouté, conformément à la demande. Les dates et la précision des horaires enregistrés restent inchangées.

Les valeurs MORNING et AFTERNOON sont acceptées par l’API et une migration étend la contrainte SQL. Les anciennes valeurs DAY, MIXED et UNKNOWN restent compatibles et visibles lors de la modification d’une mission existante. Les détails côté candidat et les filtres agence/candidat affichent les nouveaux créneaux. Les préférences DAY existantes couvrent Matin et Après-midi, et la recherche candidat Jour inclut les deux.

Validation : 356 tests unitaires backend réussis ; compilations frontend et backend réussies ; test navigateur avec API fictive sur création, modification et rechargement des trois valeurs, compatibilité d’une mission DAY et conservation des dates sans heures fixes. Aucun mail ni affectation réelle n’a été déclenché par ces tests.
