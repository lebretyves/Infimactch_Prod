# Historique de décisions — InfiMatch
Résumé fidèle des échanges disponibles, pas un export intégral de la conversation.
- Nom de l'application confirmé : InfiMatch.
- Quatre personnes, onze jours, rendu fixe.
- Cible confirmée par l'utilisateur : respect de 100 % du prompt backend.
- Nouvelle numérotation Word retenue.
- F12 : notification, confirmation PDF et relance.
- F18 : API RPPS à la saisie ; non retrouvé bloquant, indisponible en attente.
- Aucune validation manuelle RPPS par l'agence ajoutée.
- Attestation V2 ; références hors V1, V2 envisagée.
- Affectation finale par agence reste une action humaine.
- Sauvegarder décisions, historique du travail et preuves ; jamais inventer un test réussi.


## 2026-09-15 - Rectification France Travail autorisee
Utilisateur : appliquer les propositions issues des essais IDE/IADE/IBODE et fournir le rectificatif du catalogue. Explication donnee : externe = source France Travail/partenaire, candidature par redirection ; interne = gere dans InfiMatch. Corrections et tests decrits dans ../RECTIFICATIF_CATALOGUE_V1.md. 62 tests reussis, import reel 134 offres et rejeu sans doublons. Incident du script de preuve HTTP : limite de taille de reponse du client de test, relance reussie apres augmentation explicite de cette limite. Aucun secret dans les preuves.


## 2026-09-15 - Comparaison partielle des annonces externes
Demande utilisateur : implementer la gestion des informations manquantes et fournir une explication transmissible. Comparaison privee au profil, champs a completer/a confirmer, incompatibilites connues, indices et option explicite de pistes incompletes. 71 tests passes ; HTTP prive et absence de fuite entre deux profils verifies. 134 offres reelles acquises, comparees a des profils fictifs sans mutation. Aucun score complet externe. Le catalogue original reste en attente de remplacement, bloque precedemment par Windows ; son etat nest pas change par cette livraison.


## 2026-09-15 — Bilan Word kick-off et sauvegarde de reprise
Demande : Word réalisé/reste à faire, intégration de la checklist utilisateur, lecture historique et reprise des sauvegardes de conversation. Livrable : docs/BILAN_BACKEND_KICKOFF_V1.docx. Sources recoupées : sujet, historique, preuves et code ciblé. 71 tests / 79,38 % lignes / 84,33 % branches sont les dernières preuves existantes, sans nouvelle exécution. Synthèse et échange joint archivés dans docs/history/conversations. Archive documentaire horodatée et manifeste SHA-256 dans E:/Interimatch/backups ; exclut secrets, bases et fichiers privés. Pas de planificateur permanent installé.


## 2026-09-15 ? Vault V1 et pr?paration V2
Installation Vault locale et dossier V2 autoris?s. TLS, Raft, KV v2, audit et AppRoles op?rationnels ; 10 tests Vault et 55 unitaires backend passants. Recette de red?marrage et API v?rifi?e. .env historique conserv?. Rotation des SecretID non ex?cut?e apr?s refus du contr?le automatique ; restauration compl?te non d?montr?e. Voir docs/VAULT_V1.md, V2/README.md et docs/history/conversations/20260915-144917-vault-v1-v2.md. Sauvegarde locale sans secrets effectu?e.


## 16 septembre 2026 ? R?cup?ration s?curit? et sessions

Les deux branches s?curit? sont int?gr?es au code local avec adaptations Google, Vault, migrations et frontend documents/RIB. 101 tests unitaires backend et 10 tests API frontend passent ; les deux compilations passent. Migrations et activation non effectu?es : Docker/Vault indisponibles. Les deux bugs documentaires et la recette compl?te restent ? traiter. Voir le [bilan apr?s r?cup?ration](../BILAN_RECUPERATION_SECURITE_2026-09-16.md). Les ?tats ant?rieurs sont historiques.
