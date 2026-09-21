# Candidatures incomplètes : candidat et entreprise

Demande : permettre l’envoi et la décision malgré les alertes de profil incomplet. Diplôme absent, RPPS non vérifié/en attente/non retrouvé, compétences, expérience, mobilité et disponibilités incomplètes deviennent des avertissements lors de la candidature et de l’acceptation. Le matching automatique reste distinct et conserve ses règles ; aucun profil n’est marqué vérifié artificiellement.

Les alertes restent affichées. Le consentement aux conditions actuelles est nécessaire pour envoyer et accepter ; le refus ne requiert plus de consentement renouvelé après une modification de mission. Missions fermées/déjà commencées, comptes désactivés, conflits d’affectation et horaires non précisés à l’acceptation restent bloquants.

Validation : 353 tests unitaires réussis, builds backend/frontend réussis. Recettes navigateur sur réponses fictives : profil sans diplôme/RPPS en attente, alertes visibles, case de consentement avant envoi, candidature enregistrée, acceptation entreprise malgré profil incomplet. Tests PostgreSQL mis à jour mais non exécutés, services isolés non démarrés. Aucune mission ni notification réelle créée par les tests. Pas de migration ni modification massive des données.
