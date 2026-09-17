# RIB : camera, lecture locale et coordonnees verifiees

## Demande
Ouvrir une camera reconnue sur PC ou la camera du telephone, importer un PDF/JPEG/PNG, extraire les coordonnees bancaires, passer en manuel apres deux analyses infructueuses et retirer la restriction aux RIB fictifs.

## Contrat et stockage
- PUT /me/bank-details : IBAN, BIC, titulaire, banque facultative, reviewed=true.
- PUT /me/bank-document : memes champs et fichier PDF/JPEG/PNG, 3 MiB maximum, signature de fichier verifiee.
- IBAN valide (pays, longueur et cle de controle), BIC 8/11 caracteres et titulaire obligatoires.
- Fichier et champs sauvegardes atomiquement dans une enveloppe JSON version 2, chiffree AES-256-GCM par le stockage documentaire existant.
- Anciennes versions conservees selon la politique existante ; seule la derniere est active. Une erreur ne remplace pas le RIB precedent.
- GET /me/bank-details fournit les champs complets uniquement au compte proprietaire, avec Cache-Control: no-store ; aucun champ bancaire en clair dans les metadonnees, les audits ou les recus d'idempotence.
- Les anciens fichiers et anciennes saisies restent lisibles. Les RIB restent exclus des routes documentaires generales.
- Aucun changement de schema de base requis. Aucun raccordement bancaire ni virement effectue.

## Validation serveur
17 septembre 2026 : compilation reussie, 211 tests isoles reussis, 0 echec ; PostgreSQL, MongoDB et workflows n8n de test, puis regressions de securite SQL. Exemples bancaires et documents synthetiques uniquement.

## Validation interface
- Installation propre npm ci et build production reussis ; moteur Tesseract et PDF.js charges a la demande depuis le site, ressources generees au build.
- OCR reel : image synthetique, PDF texte et PDF scanne sans couche texte ; IBAN, BIC, titulaire et nom de banque detectes.
- Deux analyses infructueuses ouvrent la saisie manuelle ; les annulations ne comptent pas comme echecs. Aucun melange silencieux avec les champs du precedent fichier.
- Camera simulee : ouverture apres clic, audio desactive, refus/reessai, changement de camera, fermeture pendant autorisation, arret des pistes apres capture ou fermeture.
- Relecture explicite avant sauvegarde ; aucun envoi de document pendant analyse, aucune requete externe du moteur, aucun IBAN dans localStorage/sessionStorage.
- Affichages 375, 768 et 1440 px verifies sans debordement ; ancre du rappel et fichier invalide/trop volumineux verifies.
- 13 tests API/session et 3 tests PWA reussis. Audit npm des nouvelles dependances : aucune vulnerabilite signalee.
- Evaluation independante : PASS.

## Limites
L'OCR peut manquer des caracteres ou champs : verification manuelle obligatoire. BIC et titulaire manquants doivent etre completes, jamais inventes. Limites 3 MiB, 3 pages PDF, reconnaissance des deux premieres pages scannees, 45 secondes par analyse. Camera materielle de l'utilisateur non testee ; un telephone branche au PC doit etre reconnu comme webcam par le systeme. Les nouvelles saisies de RIB ne sont plus limitees aux donnees fictives ; les justificatifs generaux conservent leur regle existante.

## Publication
Commit applicatif publie : 961a40b7e68426bef90465c161c3ee51fe80b56e. Frontend et backend Vercel READY.
Recette du site public reussie : OCR image et PDF texte avec les vrais assets heberges, bascule manuelle apres deux echecs, relecture, absence de transmission externe pendant analyse et affichage mobile/desktop. Les API du test navigateur sont interceptees ; une recette serveur distincte a cree un compte synthetique en production, enregistre les champs et le fichier chiffres, verifie restitution et telechargement, puis supprime ce compte et ses documents.
Protections CSRF et routes internes, session, profil, recherche independante, recommandations, accueil et configuration Discord egalement verifies. Aucun compte utilisateur existant modifie. Voir RECETTE_RIB_PRODUCTION_2026-09-17.json.
