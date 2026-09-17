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


## 2026-09-17 — Collecte nationale publiée et vérifiée

Les corrections nationales sont en production (Main 2ebb08c ; Epitech Backend 73a9cd0). À 22:03 : 4 843 offres externes actives (4 773 France Travail, 70 JobsPipe), dont 4 692 localisées. Cycles complets : 4 823 identifiants uniques France Travail examinés sur 127 pages ; 353 JobsPipe examinés. Aucun doublon d'identifiant ni doublon exact entre sources détecté. Les 18 annonces hors métier infirmier ont été retirées du catalogue après accord explicite, avec conservation des lignes source. 151 offres restent sans coordonnées exploitables. 188 tests unitaires et 4 tests PostgreSQL réussis ; pagination publique vérifiée jusqu'à la dernière page.

Préférence de livraison explicitement autorisée par l'utilisateur : publier les corrections sur lebretyves/Infimactch_Prod, branche Main, et également EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1, branche Backend, comme précédemment et pour les prochaines livraisons. Cette préférence ne justifie pas d'écraser les modifications étrangères au travail.

Bilan détaillé : quality/COLLECTE_NATIONALE_PRODUCTION_2026-09-17.md (chemin relatif à la racine documentaire).


## 2026-09-17 — Capture et analyse automatiques du RIB

Demande : reconnaître les coordonnées dans la caméra, prendre automatiquement la photo et remplir les cases correspondantes. La caméra effectue désormais des lectures OCR locales successives ; deux lectures consécutives du même IBAN avec clé valide déclenchent une seule photo. Le texte de cette image remplit IBAN, BIC, titulaire et banque lorsqu'ils sont reconnus. Les codes banque, guichet, compte et clé RIB restent dérivés de l'IBAN français valide. Une nouvelle image ou un PDF importé déclenche également l'analyse sans clic supplémentaire. Le bouton manuel reste disponible en secours.

Les traitements sont annulés à la fermeture ou au changement de caméra/document. Après 60 secondes sans détection, la prise de photo manuelle reste proposée. Aucun champ manquant n'est inventé, aucune sauvegarde n'est automatique : vérification et confirmation restent nécessaires. L'analyse et les images de prévisualisation restent locales.

Validation : build frontend et TypeScript réussis ; test navigateur avec moteur Tesseract réel sur image, PDF texte et flux caméra synthétique. Vérification du remplissage des quatre champs, absence de capture pour une clé IBAN invalide, arrêt des pistes caméra, absence d'enregistrement implicite, relecture après échec et affichage mobile/bureau. Caméra physique non testée dans cet environnement. Livraison sur Main et Backend conformément à l'autorisation persistante de l'utilisateur.
