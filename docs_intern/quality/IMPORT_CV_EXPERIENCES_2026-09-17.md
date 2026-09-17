# Import de CV et préremplissage des expériences — 17 septembre 2026

## Solution livrée

Dans Qualifications et expérience, l'utilisateur importe un CV PDF, JPEG ou PNG (5 Mo, cinq pages PDF maximum). PDF.js lit les pages contenant du texte ; Tesseract.js, avec modèles français et anglais locaux, traite les pages scannées et images. Le texte est envoyé à l'API interne authentifiée POST /api/v1/profile/cv/parse. Aucun fichier ni texte de CV n'est enregistré par cet endpoint et aucun prestataire tiers n'est appelé.

L'API propose établissement, service du référentiel infirmier, début et fin, avec extrait source et avertissements. Le parseur est fondé sur des règles explicites (RULES_V1), pas sur un modèle génératif. L'utilisateur corrige et sélectionne les propositions, confirme leur exactitude puis les ajoute au formulaire. Il doit ensuite enregistrer le profil. L'import ne modifie ni identité verrouillée ni diplômes et ne certifie aucune qualification.

Les périodes au mois ou à l'année utilisent des bornes proposées clairement signalées comme approximatives, à confirmer. Les périodes en cours, futures, inversées ou invalides ne sont pas ajoutées aux expériences passées. Le service ambigu reste à choisir. Les expériences existantes sont conservées et les doublons exacts (établissement, service, début, fin) écartés lors de l'ajout. Les mises en page complexes, colonnes ou établissements non reconnus peuvent nécessiter une saisie manuelle ; aucune exhaustivité n'est garantie. DOCX non pris en charge : exporter en PDF.

Limites : 60 secondes pour le parcours, 60 000 caractères côté API, 50 propositions, 100 expériences dans le profil et 10 requêtes par minute à l'API. Les traitements peuvent être annulés ; session et CSRF restent obligatoires. Le serveur vérifie le profil infirmier et ne réalise aucune mutation lors du parsing.

## Recherche de solutions gratuites

- [Affinda Resume Parser](https://www.affinda.com/resume-parser/pricing/) : essai de 14 jours, 1 000 documents inclus au moment de la consultation ; ce n'est pas une gratuité permanente.
- [OCR.space API](https://ocr.space/ocrapi) : offre gratuite limitée notamment à 500 requêtes par jour et par IP et 1 Mo par fichier ; extrait du texte, sans fournir à elle seule le mapping métier des expériences.
- [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/pricing) : crédits gratuits limités, puis facturation à l'usage ; ne constitue pas une garantie de parsing gratuit sans limite.
- [Tesseract.js](https://github.com/naptha/tesseract.js/) et [PDF.js](https://mozilla.github.io/pdf.js/examples/) : outils libres exécutables dans le navigateur, déjà utilisés dans l'application. Option retenue avec notre API de structuration interne : aucun abonnement ni coût par CV auprès d'un fournisseur ajouté. L'hébergement existant reste nécessaire.

## Vérifications

198 tests unitaires serveur réussis, dont sept tests dédiés au parseur et au contrôleur CV. Compilation serveur et frontend réussie. Recette navigateur sur un PDF texte et une image de CV fictifs avec le moteur OCR réel, appel au vrai parseur dans l'interception de l'API : champs reconnus, vérification obligatoire, ajout sans sauvegarde implicite, sauvegarde explicite, réimport sans doublons, PDF invalide, rendu 375/1440, absence de requêtes tierces et de stockage navigateur du texte. Régression de la lecture automatique des RIB réussie après ajout de la langue française ; parcours des informations personnelles verrouillées vérifié. Aucun CV réel utilisé pendant la recette.
