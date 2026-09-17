# Recuperation locale du frontend

Source : branche front-end, commit 8a4134b1b6cc45ce01b0b707061ccffd97642e2d (feat:AUTH), auteur Git ziwazou. Le dernier commit a supprime 14 fichiers de missions, candidatures et composants associes. Ils ont ete recuperes depuis son parent 348b07a sur la branche locale recuperation-ecrans-front.

## Recupere

Recherche et filtres de missions, detail, formulaire de candidature, liste des candidatures, cartes, types et donnees de demonstration. Routes restaurees sous ProtectedRoute et navigation completee. Les nouvelles pages d'authentification, le contexte Auth et les etapes d'inscription du dernier commit sont conserves. Calendrier et profil restent des pages d'attente ASuivre.

## Verification

Compilation TypeScript/Vite reussie avant et apres recuperation. Navigateur : /missions sans session affiche la connexion ; apres connexion simulee, /missions, /missions/1842, /missions/1842/candidater et /candidatures affichent leurs ecrans. Aucune candidature envoyee, aucun compte backend cree. Demonstration locale : http://127.0.0.1:5173.

## Manque encore pour l'integration reelle

- Auth : le frontend simule une connexion quand VITE_API_URL est absent. Il attend un token Bearer dans localStorage et un champ motDePasse ; le backend utilise une session cookie, un jeton CSRF et password. Definir l'URL seule ne suffit pas.
- Inscription : adapter family NURSE/ENTERPRISE, organizationType, termsVersion et l'enregistrement du profil aux routes existantes. Le frontend conserve notamment des champs bancaires en stockage local dans sa simulation : utiliser uniquement des donnees fictives.
- Session : recuperer /api/v1/auth/csrf, transmettre les cookies et X-CSRF-Token pour les ecritures, harmoniser l'origine/proxy. Ne placer aucun secret Vault dans les variables VITE_ exposees au navigateur.
- Mot de passe oublie : ecran et simulation presents ; aucun envoi reel demontre.
- Missions, favoris, candidatures, notifications, explications du matching, documents et tableaux de bord : remplacer les donnees et etats simules par les appels API autorises. Gerer Idempotency-Key pour les commandes concernees.
- Completer les ecrans non implementes et les parcours entreprise/agence, puis recette commune frontend/backend.

Cette recuperation restaure du code existant ; elle ne declare pas le frontend connecte au backend. Aucun push sur front-end ou Backend effectue dans cette intervention.
