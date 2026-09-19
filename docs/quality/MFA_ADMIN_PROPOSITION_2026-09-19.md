# MFA administrateur : proposition distincte, non activée

La décision explicite du propriétaire du17septembre2026 reste applicable : accès administrateur par email/mot de passe, avec reconfirmation pour les actions sensibles. Le lot de limites partagées ne réactive pas la MFA et ne change pas l'accès du propriétaire. La récupération autonome par email concerne uniquement les comptes clients ; tous les comptes figurant dans platform_admin en sont exclus.

Une évolution ultérieure peut proposer un second facteur à l'administrateur, avec enrôlement volontaire vérifié avant activation, protection du secret, contrôle des tentatives et révocation des sessions après changement de facteur. Elle exige aussi un vrai parcours de secours : codes à usage unique dont seuls les hashes sont conservés, conservation explicite par le propriétaire, procédure de récupération à identité vérifiée et journalisation. Ne jamais activer un facteur uniquement parce qu'un ancien champ totp_secret ou ancien module existe encore.

La recette préalable doit comprendre : première activation, connexion réussie/refusée, tentative de rejeu du facteur, appareil perdu, code de secours utilisé deux fois, changement/révocation du facteur, panne du stockage et restauration contrôlée de l'accès propriétaire. L'accès des autres administrateurs ne doit pas permettre de s'octroyer OWNER ni de désactiver le dernier responsable sans procédure autorisée.

Aucune de ces fonctions MFA n'est déclarée développée ou activée par cette proposition. L'authentification actuelle reste décrite dans ADMIN_ACCES_SIMPLE_2026-09-17.md. Toute évolution de ce choix est une décision explicite distincte, sans mot de passe ni code de secours à transmettre dans la conversation.
