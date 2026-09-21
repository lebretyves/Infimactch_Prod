# Vérification des restrictions Discord

Audit en lecture seule le 21 septembre 2026 du serveur relié au bot InfiMatch. Aucune modification nécessaire : la configuration satisfait déjà la restriction des utilisateurs ordinaires à la réception des notifications.

- Deux rôles seulement : everyone et le rôle géré du bot.
- everyone : permission 65536, historique des messages uniquement. Aucune administration, gestion des rôles/salons/webhooks, invitation, écriture, création de fils ou connexion vocale.
- Un salon texte de test privé : visibilité refusée à everyone, exception individuelle limitée à la lecture. Aucune autorisation d’écriture supplémentaire dans les salons.
- Le bot conserve lecture/envoi/liens nécessaires aux notifications. Les notifications personnelles existantes utilisent les messages privés.
- Le propriétaire conserve l’administration du serveur. Les permissions de serveur ne suppriment pas les réglages personnels Discord des utilisateurs.

Contrôle via API des rôles et surcharges de salons, sans message envoyé. Rapport technique local conservé dans audits/discord-permissions-current.json, non publié dans le dépôt. Référence : https://docs.discord.com/developers/topics/permissions.
