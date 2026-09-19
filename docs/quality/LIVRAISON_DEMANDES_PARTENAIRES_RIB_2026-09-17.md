# Demandes clients, offres partenaires et dossier RIB

> Rapport historique : cet état précède la bascule vers Supabase du 19 septembre. Pour la configuration actuelle, consulter [l'inventaire](../DEPLOIEMENT_INVENTAIRE.md).
## Comportement livre
- Recuperation manuelle : demande generique, verification d'identite par l'administration, lien personnel valable 30 minutes et utilisable une fois. Aucun email automatique ; Resend sera raccorde plus tard. Les sessions sont revoquees au changement de mot de passe. Les comptes administrateurs sont exclus de ce parcours client.
- Cloture : confirmation du mot de passe, suivi, annulation avant traitement ; approbation et execution distinctes dans l'administration. Candidatures en cours, affectations actives et dernier gestionnaire d'organisation bloquent la cloture. Une interruption de nettoyage reste PROCESSING et peut etre reprise. Les donnees de profil sont anonymisees, l'historique metier est conserve.
- Offres : choix Toutes / Partenaires / Externes dans l'accueil et la recherche. Tri partenaires avant externes applique avant pagination ; offres partenaires consultables avec profil incomplet, sans affirmation d'eligibilite. Recommandations compatibles triees par pertinence puis publication ; catalogue trie par date au sein de chaque origine.
- Inscription : suppression de l'etape RIB, disponibilites puis consentements. L'ancienne URL redirige vers les consentements.
- RIB : rappel non bloquant des qu'une affectation ACTIVE ou COMPLETED existe et qu'aucun RIB courant n'est present. Fichier prive chiffre PDF/JPEG/PNG, maximum 3 MiB. Le fichier remplace l'ancien RIB ; la saisie structuree reste une alternative. Donnees fictives uniquement dans le POC.
- Photo : controle appareil photo selon navigateur, plus import de fichier pour RIB et justificatifs. Pas d'OCR ; appareil reel a verifier sur telephone.

## Validation
Recettes isolees avec comptes et documents fictifs ; tests UI mobile/bureau, limites de fichiers, confidentialite, liens temporaires, controles de roles et pagination. Voir proofs/v1-hardening/result.json et coverage.txt pour le dernier resultat backend.
Evaluation UI independante : recuperation/cloture, offres et documents valides. Lien de rappel RIB verifie par clic SPA, defilement et focus apres chargement. 208 tests backend PASS, zero echec ; tests frontend API/session/PWA et parcours cibles PASS.

## Deploiement
Migration additive ClientRequests1789382000000 appliquee sur Neon le 17 septembre 2026 apres sauvegarde chiffree de 12:55 UTC. Les privileges par defaut du role runtime couvrent la nouvelle table. Aucune nouvelle variable ni cle Resend necessaire. Frontend et API Vercel lies a Main ; administration publiee separement. Sauvegarde parallele Epitech Backend avec conservation de docs_intern.
