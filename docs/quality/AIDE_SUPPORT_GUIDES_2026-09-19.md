# Aide, support et guides — 19 septembre 2026

## Parcours livré

`/aide` est accessible sans connexion et depuis la navigation client et la connexion. Le contact public autorisé est `yleb.user@outlook.fr`. Les comptes connectés disposent d’un formulaire catégorie/sujet/description sans pièce jointe, d’une référence, d’un accusé interne, de leurs demandes paginées et des échanges. Une réponse du client rouvre une demande résolue.

Le tableau de bord propose Aide et support aux rôles ayant la permission `accounts`. La réponse nécessite `accounts:write` et une confirmation du mot de passe de moins de cinq minutes. Une réponse administrative crée une notification interne chez le demandeur. Aucun email ni délai de réponse n’est promis. L’exploitation doit réellement consulter cette file.

Quatorze guides écrits couvrent connexion/récupération, inscription/RPPS/diplômes, CV, agenda, recherche/matching, candidature, organisation, publication, confirmation/PDF, annulation, documents/RIB, notifications, clôture et traitement administratif. Recherche insensible aux accents et filtre par rôle : intérimaire, établissement, agence, administrateur.

Quatre captures et quatre vidéos WebM de navigation de l’aide sont disponibles dans `frontend/public/guides`, avec sous-titres français VTT et version écrite. Elles montrent l’interface locale sans données personnelles. **Ce sont des vidéos d’utilisation du centre d’aide, pas quatre démonstrations complètes des parcours métier ni des preuves de fonctionnement en production.** Chargement vidéo à la demande (`preload=none`), aucune lecture automatique.

## API et confidentialité

Migration additive `SupportTickets1789851600000`, module `SupportModule`.

- `GET/POST /me/support-tickets`, `GET /me/support-tickets/:id`, `POST /me/support-tickets/:id/replies` : session active et propriété du ticket.
- `GET /admin/support-tickets`, `GET /admin/support-tickets/:id`, `POST /admin/support-tickets/:id/replies` : session administrative et permissions vérifiées côté serveur.
- Écritures protégées par le CSRF global, UUID et longueurs validés ; catégorie/statut sur listes fermées. Les descriptions et réponses sont du texte, jamais du HTML rendu.
- Limites transactionnelles partagées : cinq nouvelles demandes et quarante réponses par compte sur une heure ; listes de vingt éléments. Rejeu avec la même référence client sans deuxième ticket, réponse ou notification. Une réutilisation de référence avec un autre texte est refusée.
- Verrou du compte avant écriture et vérification `active` : une requête suspendue derrière une clôture ne recrée pas un dossier sur un compte fermé.
- Une clôture supprime les tickets du compte avec toutes leurs réponses, y compris les textes rédigés par les administrateurs. Les réponses rédigées par ce compte dans d’autres dossiers sont anonymisées. L’audit n’enregistre pas le contenu des messages.
- Aucun formulaire anonyme qui enregistrerait des pièces ou demanderait des données sensibles ; les utilisateurs sans accès disposent de l’aide et du contact public.

## Validation

- Compilation backend/frontend réussie.
- Deux tests unitaires backend : limites/texte brut et permissions OPS/AUDITOR/SUPPORT/OWNER/réauthentification.
- Cinq tests PostgreSQL isolés : accès croisés, création concurrente/idempotence/accusé unique, plafond/pagination, réponse/résolution/réouverture, clôture et effacement des contenus. Premier passage 5/5 ; l’assertion supplémentaire sur le compte devenu inactif est incluse dans la campagne finale.
- Deux tests frontend : recherche accentuée et filtrage par rôle.
- Recette navigateur locale : page publique, contact, recherche, création d’un ticket fictif, référence, contenu ressemblant à un script affiché sans exécution, largeurs 320/768/1440 sans débordement. L’API de cette recette navigateur est simulée ; les tests PostgreSQL portent séparément sur le service réel.
- Preuves : `E:/Interimatch/audits/2026-09-19-support/tests.txt`, `browser-result.json`, `help-mobile.png`, `ticket-mobile.png`.

Aucun email envoyé, aucune donnée de production modifiée par ce lot. Migration, déploiement et surveillance effective du support restent sous le pilotage de la livraison globale.
