# Suivi Vault et reste a faire V1

Demande utilisateur : donner le reste a faire et garder Vault a jour.

Consigne pour les prochaines interventions : apres toute modification autorisee des secrets ou de la configuration, comparer les valeurs attendues avec Vault sans les afficher. Synchroniser uniquement les changements voulus et valider les consommateurs concernes. Ne pas ecraser une divergence sans en comprendre la cause. Aucun service de synchronisation permanente n'est installe. Une mise a jour des valeurs KV ne change pas les mots de passe des serveurs et ne recharge pas les processus deja demarres. Les rotations AppRole restent une operation distincte.

Verification du jour : Vault initialise et deverrouille ; backend 8 cles, infrastructure 4 cles, soit 11 secrets distincts. Aucun manque, difference ou ajout inattendu ; versions KV 1. Aucune ecriture de secrets necessaire.

Usage constate : PostgreSQL porte les donnees metier ; MongoDB conserve les resultats et explications du matching interne. Le stockage des reponses brutes externes dans MongoDB est une possibilite, pas une fonctionnalite prouvee.

Reste V1 : controle d'experience reglementaire ETP et justificatifs ; HTTPS du deploiement et echanges entre services ; droits minimaux SQL/Mongo et recette des permissions ; idempotence documentaire, orphelins et conservation ; rafraichissement/retrait des offres ; worker et instance n8n retenue ; restauration commune incluant Vault et moyens de recuperation ; contrats OpenAPI, installation propre et recette frontend. Vault : bascule des processus restants, suivi expiration AppRole/certificats, restauration isolee, separation des parts de recuperation, resolution de l'interface Edge blanche. Les validations precedentes ne valent pas recette complete.
