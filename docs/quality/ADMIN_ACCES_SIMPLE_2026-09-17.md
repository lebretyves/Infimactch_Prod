# Acces administrateur simplifie

Decision explicite du proprietaire le 17 septembre 2026 : email + mot de passe uniquement pour tous les acces administrateurs, confirmation du mot de passe pour les operations sensibles. Cette decision remplace les exigences MFA et les instructions Authenticator des rapports precedents.

Le domaine admin reste independant. Les roles autorises, la protection CSRF, les cookies securises, les sessions separees, la revocation, la limitation des tentatives et le verrouillage sont conserves. Expiration apres 15 minutes sans activite ou huit heures absolues. Confirmation du mot de passe pour une action sensible apres cinq minutes.

Un compte administrateur dedie deja active utilise directement son mot de passe existant. L'invitation n'est requise qu'au premier acces non active. Aucun role n'est accorde depuis l'inscription publique. Les comptes dedies restent exclus de l'espace client. L'ancien endpoint MFA est retire ; les anciennes cles MFA ne servent plus a se connecter. Aucun QR code ni secret n'est affiche.

Les anciennes procedures de recuperation MFA et leurs scripts sont historiques et ne doivent plus etre utilises avec ce mode. Le mot de passe reste confidentiel et ne doit pas etre envoye dans une conversation.

Validation : suite isolee backend, controles d'acces, activation, reconnexion apres expiration, confirmation du mot de passe correcte/incorrecte, dernier responsable protege et interface navigateur.
