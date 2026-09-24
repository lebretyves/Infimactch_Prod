# Notifications Discord dans la fiche administrateur

La fiche Comptes et dossiers > utilisateur affiche un panneau en lecture seule, reserve aux roles ayant le droit accounts (Responsable et Support). L'API GET /api/v1/admin/accounts/{id}/notifications journalise sa consultation.

- Association : absente, code en attente, tentative expiree/non terminee, ou association validee ; identifiant et date de connexion seulement apres validation.
- Messages prives : desactives, actives ou aucun evenement effectif ; preferences individuelles de mise en sourdine appliquees aux evenements choisis.
- Notifications internes : nombre total et nombre non lu, independants de Discord.
- Envois personnels Discord : comptages par statut et dix derniers resultats, dates et nombre de tentatives. Les codes d'erreur sont limites a des codes HTTP Discord ou un libelle generique. Aucun contenu de message, code de validation, hash, jeton ou identifiant de session n'est retourne.
- Salons des organisations : etats et preferences distincts des messages prives, uniquement pour les rattachements actifs du compte.

Une association validee ne prouve pas la presence en ligne. SENT signifie que Discord a accepte l'envoi, pas que le destinataire a lu le message. Les historiques lies a une destination supprimee ne sont pas reconstruits artificiellement.

Aucune action de liaison, de modification des preferences ou d'envoi de test n'est declenchee par la consultation de la fiche.
