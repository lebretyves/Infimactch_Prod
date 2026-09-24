# Corrections compte, missions et préférences — 21 septembre 2026

- Comptes liés à Google : confirmation de clôture par identité Google, sans mot de passe local. Accord explicite, nonce dédié de cinq minutes lié à la session et au compte, vérification du jeton signé et du sujet associé, état actif et version de session contrôlés avant écriture. Aucun changement de compte ni association automatique. Examen administrateur conservé.
- Entreprises : refus des candidatures rendu visible ; confirmation et annulation intégrées dans la page à la place de window.confirm. Les erreurs et succès reçoivent le focus.
- Accessibilité : icône fauteuil roulant, près du menu sur accueil mobile ; cookies en pied de page.

Validation : 344 tests unitaires backend réussis, constructions backend/frontend réussies. Recette navigateur avec API fictive : accord obligatoire, aucun mot de passe demandé pour Google, mauvais compte refusé puis nouvelle tentative réussie, demande enregistrée sans navigation de connexion. Missions : validation sans fenêtre native, erreur puis succès. Vérification préférences à 375, 768 et 1440 px.

Limites : le blocage réel de validation de mission et le lien de récupération signalés initialement ne sont pas reproduits. La récupération avec session entreprise passe en simulation. Aucun compte réel supprimé ; aucune clôture exécutée par les tests. Aucune migration nécessaire.
