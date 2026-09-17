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

## 17 septembre 2026 — Reprise des imports externes et continuité de l'historique

L'utilisateur demande de vérifier pourquoi les deux API fournissent si peu d'offres, puis rappelle que ce travail a déjà été effectué et doit être retrouvé/documenté dans l'historique. Imports, dédoublonnage et commit e9bf037 retrouvés. Diagnostic réel terminé : 108 JobsPipe parcourues, 54 candidates acceptées ; France Travail environ 4 800 résultats sur certaines recherches MIS ; nouveau cycle non enregistré en production au contrôle. Voir IMPLEMENTATION.md et ../quality/DIAGNOSTIC_VOLUME_API_2026-09-17.md. Ne pas confondre correction du code, déploiement et rattrapage réel.


## 2026-09-17 — Collecte nationale publiée et vérifiée

Les corrections nationales sont en production (Main 2ebb08c ; Epitech Backend 73a9cd0). À 22:03 : 4 843 offres externes actives (4 773 France Travail, 70 JobsPipe), dont 4 692 localisées. Cycles complets : 4 823 identifiants uniques France Travail examinés sur 127 pages ; 353 JobsPipe examinés. Aucun doublon d'identifiant ni doublon exact entre sources détecté. Les 18 annonces hors métier infirmier ont été retirées du catalogue après accord explicite, avec conservation des lignes source. 151 offres restent sans coordonnées exploitables. 188 tests unitaires et 4 tests PostgreSQL réussis ; pagination publique vérifiée jusqu'à la dernière page.

Préférence de livraison explicitement autorisée par l'utilisateur : publier les corrections sur lebretyves/Infimactch_Prod, branche Main, et également EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1, branche Backend, comme précédemment et pour les prochaines livraisons. Cette préférence ne justifie pas d'écraser les modifications étrangères au travail.

Bilan détaillé : quality/COLLECTE_NATIONALE_PRODUCTION_2026-09-17.md (chemin relatif à la racine documentaire).


## 2026-09-17 — Capture et analyse automatiques du RIB

Demande : reconnaître les coordonnées dans la caméra, prendre automatiquement la photo et remplir les cases correspondantes. La caméra effectue désormais des lectures OCR locales successives ; deux lectures consécutives du même IBAN avec clé valide déclenchent une seule photo. Le texte de cette image remplit IBAN, BIC, titulaire et banque lorsqu'ils sont reconnus. Les codes banque, guichet, compte et clé RIB restent dérivés de l'IBAN français valide. Une nouvelle image ou un PDF importé déclenche également l'analyse sans clic supplémentaire. Le bouton manuel reste disponible en secours.

Les traitements sont annulés à la fermeture ou au changement de caméra/document. Après 60 secondes sans détection, la prise de photo manuelle reste proposée. Aucun champ manquant n'est inventé, aucune sauvegarde n'est automatique : vérification et confirmation restent nécessaires. L'analyse et les images de prévisualisation restent locales.

Validation : build frontend et TypeScript réussis ; test navigateur avec moteur Tesseract réel sur image, PDF texte et flux caméra synthétique. Vérification du remplissage des quatre champs, absence de capture pour une clé IBAN invalide, arrêt des pistes caméra, absence d'enregistrement implicite, relecture après échec et affichage mobile/bureau. Caméra physique non testée dans cet environnement. Livraison sur Main et Backend conformément à l'autorisation persistante de l'utilisateur.


## 2026-09-17 — Informations personnelles verrouillées après inscription

Demande utilisateur : prénom, nom, e-mail, ville, téléphone, date de naissance et adresse postale modifiables uniquement après demande administrateur. Les champs du profil sont désormais en lecture seule, code postal inclus ; le serveur refuse les changements et suppressions de ces valeurs, ainsi que le changement de display_name, par PUT /profile. La création atomique du profil à l'inscription conserve les valeurs initiales. Les qualifications, expériences et disponibilités restent modifiables.

Une demande structurée peut être créée depuis le profil : un champ, sa nouvelle valeur, une seule demande en attente. Aucun changement n'est appliqué à l'envoi. L'administration dispose d'une page Corrections personnelles pour consulter, valider ou refuser. La validation exige accounts:write, une authentification administrateur récente et la confirmation d'une vérification d'identité. Les décisions sont journalisées et visibles par le demandeur. Les requêtes concurrentes, doubles décisions et valeurs devenues obsolètes sont contrôlées en transaction. Le changement d'e-mail contrôle l'unicité, ferme les sessions et invalide les demandes de récupération existantes ; les associations Google existantes restent liées au même compte. La correction du nom/prénom réinitialise la vérification RPPS. L'anonymisation supprime les demandes contenant des données personnelles.

Migration additive PersonalCorrections1789382300000 appliquée, sans modification des profils existants. Validation : 191 tests unitaires, 5 tests PostgreSQL sur base jetable et recette navigateur utilisateur/administrateur réussis ; TypeScript, build utilisateur et build administrateur réussis. La recette vérifie le refus des modifications, l'enregistrement professionnel, l'absence de modification lors d'une demande et la confirmation administrateur.


## 2026-09-17 — Import de CV pour les expériences passées

Ajout d'un import PDF/JPEG/PNG dans Qualifications et expérience. Extraction PDF/OCR français-anglais et API interne de structuration des périodes, établissements et services, sans fournisseur payant ni transfert à une API tierce. Vérification explicite avant ajout au formulaire, sauvegarde du profil séparée, doublons exacts écartés. Les dates approximatives sont signalées ; périodes en cours et invalides restent à compléter manuellement. Aucun changement des informations personnelles verrouillées ou des diplômes. Le parseur à règles ne garantit pas une lecture exhaustive des CV complexes ; DOCX à exporter en PDF. Limites : 5 Mo, cinq pages, une minute. 198 tests serveur et recette navigateur PDF/image/OCR réussis, ainsi que la régression RIB. Comparatif des API et détails : quality/IMPORT_CV_EXPERIENCES_2026-09-17.md.


## 2026-09-17 — Installation sur l’accueil et retrait du catalogue

Le bouton Installer l’application est proposé dans le premier bloc de l’accueil public, avec accès au parcours d’installation existant. Le lien d’installation est retiré de la navigation connectée. Les liens Catalogue des pages sont retirés de l’accueil et de l’espace connecté ; /catalogue redirige vers /. Compilation frontend et trois contrôles PWA réussis, vérification navigateur mobile/bureau et navigation connectée effectuée.


## 2026-09-17 — Autocomplétion de la ville de mobilité

Demande : reconnaître la ville ou le code postal dès la saisie dans Ma zone de mobilité. Suggestions après 350 ms, trois lettres ou code postal complet, choix au clavier ou au clic. Le service IGN existant est interrogé avec type=municipality et fournit les coordonnées du centre de commune. Aucun nouvel abonnement ni dépendance.

La commune et son code postal sont stockés dans details.mobilityCity, séparément de la ville personnelle verrouillée. Latitude/longitude sont enregistrées pour le calcul réel du rayon et reprises dans la recherche des missions. Modifier la saisie efface l’ancienne position ; une ville non sélectionnée ne peut pas être enregistrée. GPS et saisie manuelle des coordonnées restent disponibles et effacent l’ancien libellé. Réponses obsolètes annulées, erreurs et absence de résultat expliquées.

Validation : compilation frontend/backend ; 199 tests unitaires backend ; six tests SQL sur base PostGIS isolée, dont conservation de Paris comme ville personnelle avec centre de mobilité Nantes ; tests navigateur de saisie, sélection clavier, coordonnées sauvegardées, annulation des réponses lentes et affichage 375/1440 px ; régression recherche des missions. Appels réels IGN vérifiés pour 44000 et Nan. Publication autorisée sur Main et Backend selon accord antérieur.


## 2026-09-17 — Candidatures possibles malgré les divergences de correspondance

Demande utilisateur (avec autre agent) : remplacer le refus de candidature pour compétences, expérience et disponibilités divergentes par une alerte adaptée et permettre l’envoi. Agent dédié au backend ; intégration et interface par l’agent principal.

GET /missions/:id/application-check fournit les avertissements actualisés et leurs détails. L’écran affiche les compétences non renseignées, les mois renseignés/demandés dans le service, la période de disponibilité, ainsi que les éventuels écarts d’horaires ou de mobilité. Le bouton devient « Envoyer quand même ma candidature ». POST enregistre la candidature, conserve les avertissements dans l’audit et la réponse idempotente, puis affiche une confirmation explicite. Une indisponibilité du précontrôle ne bloque pas le POST, qui revérifie les critères côté serveur.

Le changement porte uniquement sur l’envoi : les contrôles qualification/RPPS, compte actif, conflit d’affectation, état et début de mission, version du consentement restent effectifs, ainsi que l’éligibilité stricte lors de l’affectation. Aucun changement des scores ou recommandations et aucune migration.

Validation : builds frontend/backend ; 203 tests unitaires backend ; deux tests SQL sur PostgreSQL/PostGIS isolé (avertissements, audit, envoi, absence de doublon, rejeu idempotent, blocages conservés et affectation stricte) ; test Playwright avec API fictives interceptées sur 375/1440 px, libellés détaillés, consentement, envoi malgré trois écarts, confirmation, indisponibilité du précontrôle et version obsolète. Publication sur Main et Backend conformément à l’autorisation permanente.

## 2026-09-17 — Recherche, accueil et calendrier compact

Recherche regroupée : poste, lieu, rayon ; critères métier, disponibilités et autres critères repliables. Tri global par publication, correspondance, distance ou début, filtres de publication et compatibilité des disponibilités avant pagination. Parcours complet par lots de 500 dans une transaction cohérente ; les dates externes inconnues ne sont pas inventées et la date d'import ne remplace pas celle de publication. Aucun pourcentage de correspondance fabriqué pour les offres externes.

Accueil : offres prioritaires, suivi puis paramètres secondaires ; disponibilités en dates françaises, fuseau Paris, sans heures et dédupliquées avant limitation. Les horaires des missions confirmées restent présents.

Calendrier : mois compact sur sept colonnes et nombre réel de semaines. Trois traits matin/après-midi/nuit ; vert disponible, rouge indisponible, bleu mission confirmée. Inspiration : photos Appel Médical fournies localement, non publiées. Éditeur au choix du jour avec navigation clavier ; mobilité et gestion des nuits conservées.

Validation : builds frontend/backend ; 208 tests unitaires backend ; 6 tests SQL PostGIS isolés incluant 5 006 offres pour vérifier le tri au-delà du premier lot ; tests navigateur 375/768/1440 px, recherche, accueil, disponibilité, changement d'heure et mobilité. Évaluations visuelles indépendantes. Aucune migration ni création de données de production.

Audit des anciennes missions : 49 missions fictives retrouvées dans deux sauvegardes, FINESS fictif 000000001. Leur nettoyage est documenté le 16 septembre. Aucune preuve d'un lot utilisant de vrais FINESS. PDF d'inventaire produit dans docs/quality ; cet inventaire historique ne constitue pas une lecture actuelle de la production.

Publication sur Main (Infimactch_Prod) et Backend (Epitech), conformément à l'autorisation utilisateur persistante.

## 2026-09-18 — CV et expériences en fiches

Demande utilisateur : champs qualifications renseignés en gris clair après inscription ; expériences en lecture avec Modifier/Supprimer ; corriger un import CV ne reconnaissant aucune période. L'interface conserve l'édition des qualifications. Une expérience se modifie dans un brouillon avec Enregistrer/Annuler ; le bouton global persiste le profil et reste bloqué pendant un brouillon ouvert.

Le parseur reconnaît les dates coupées sur plusieurs lignes, MM-YYYY, espaces OCR, tirets typographiques et titres professionnels étendus. Lecture PDF reconstruite selon les positions x/y ; séparation des colonnes lorsque des titres de sections distincts le permettent, conservation de dates et postes alignés. Si zéro résultat, aperçu du texte lu replié, non stocké, effacé au prochain import/annulation. Les expériences en cours restent signalées séparément sans inventer de fin ; les mises en page complexes nécessitent une vérification. Le CV réel de l'utilisateur n'a pas été reçu ni certifié : le fichier initial n'est pas conservé.

Recherche de solutions : Affinda propose un essai limité, Eden AI facture les analyses réelles ; Docling est libre mais nécessite hébergement et structuration métier. La solution existante PDF.js/Tesseract et parseur InfiMatch reste sans transmission à un service tiers et sans nouveau coût d'API.

Validation : builds frontend/backend ; 211 tests backend dont 10 CV ; 2 tests géométriques ; navigateur avec vrai PDF multicolonnes, périodes multilignes, image OCR, vrai parseur, propositions éditables, ajout explicite, sauvegarde, doublons, diagnostic sans stockage. Profil évalué indépendamment PASS 375/768/1440 : gris lisible, Annuler, suppression, persistance. Aucun changement en production des données utilisateur pendant ces tests. Publication Main et Backend autorisée dans la session.

Question notification : l'action PERSONAL_CORRECTION_REQUESTED est auditée et visible dans l'administration, mais n'est pas reliée au routeur de notifications actuellement. Aucun envoi de notification affirmé ni déclenché lors du contrôle.

## 2026-09-18 — Dossier de contrôle de 1 000 demandes de démonstration

Voir docs/quality/MISSIONS_DEMONSTRATION_2026-09-18.md : 646FINESSréels,101départements,400demandesdu18au27septembre,PDF/Excel/JSONlivréslocalementetrevusparunsecondagent. Aucunimportenproduction. Les correctionsCV/profil sont publiées Main ead96b1 et Backend d5e2aff ; déploiements frontend/backend READY et recetteCV/profil rejouée sur interfacepublique avecAPIfictives, sansécrituredeproduction.

## 2026-09-18 — RIB : analyse automatique complète et audit import matching

La capture automatique après IBAN stable lance désormais une lecture complète du fichier si le texte caméra est partiel. OCR français/anglais avec seconde segmentation automatique si champs requis manquants ; libellés titulaire/BIC/banque multilignes reconnus. Import de fichier immédiatement analysé, bouton fichier natif redondant masqué, relance disponible après échec. Aucune correction de chiffres inventée ; confirmation explicite avant enregistrement conservée.

Validation : build frontend, suite réelle PDF.js/Tesseract/caméra et test dédié aperçu IBAN seul puis vraie analyse de la photo, sans clic Analyser ni écriture bancaire.

Audit indépendant du lot de démonstration : 1000 demandes / 3092 vacations ; 666 demandes / 2067 vacations avec GPS et champs métier valides sous réserve des UUID établissements et droits ; 334 demandes / 1025 vacations sans GPS. 2067 cas positifs, 16251 négatifs et 4 créations DRAFT en PostGIS jetable. Aucun import production. Défaut fuseau DOM identifié (115 vacations) : Europe/Paris persisté par défaut ; non corrigé dans cette livraison RIB. Rapport local livrables/missions-500/AUDIT_IMPORT_MATCHING.md.

## 2026-09-18 — Lecture automatique des notifications

Demande utilisateur : aucune validation manuelle après consultation. Bouton Marquer comme lue retiré ; les liens Consulter et les nouveaux liens envoyés via Discord portent l’identifiant de notification. Sur page authentifiée visible, lecture enregistrée automatiquement via POST protégé existant, lié au destinataire et idempotent. Paramètres et ancre préservés, marqueur retiré après succès. Échecs réseau non bloquants avec reprises limitées, aucun faux statut lu. La simple ouverture du message dans Discord n’est pas observable via les événements publics du bot (documentation officielle Discord Gateway Events). Les anciens messages Discord ne sont pas réécrits.

Validation : builds frontend/backend ; navigateur avec API simulée, consultation/direct link, absence de bouton, paramètres/ancre, identifiant invalide et échec réseau. Aucun message Discord ni donnée réelle envoyés pendant les tests.
