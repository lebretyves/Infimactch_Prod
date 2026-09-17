# Bilan V1 — maquettes, fonctionnalités et liens front/back

Audit du code local et des 18 maquettes fournies — 15 septembre 2026.

## Conclusion

Sur les 18 pages dessinées : **6 écrans dédiés absents, 11 pages partielles et 1 couvrant le périmètre principal dessiné (connexion classique)**. Ce classement ne mesure pas un pourcentage global de réalisation ni la fidélité graphique. Une page absente peut avoir ses API et certaines actions ailleurs.

Le backend dispose de nombreuses fonctions non raccordées. Les ruptures prioritaires sont : persistance du profil à l’inscription, compétences/RPPS, gestion des missions agence, examen des candidatures, affectation et confirmation. Les corrections antérieures de navigation ne prouvent pas la sauvegarde de toutes les données métier.

## Méthode et limites

Inspection visuelle des 18 maquettes, lecture des routes/pages/services frontend et modules backend, rapprochement des preuves locales existantes. Aucun nouveau test navigateur complet ni recette Vercel exécuté pour ce bilan. API présente signifie capacité dans le code, pas validation actuelle en production.

Sources : ZIP fourni (empreintes des 18 images vérifiées), catalogue Word archivé dans docs/references, REQUIREMENTS_V1.md et RECTIFICATIF_CATALOGUE_V1.md. Les documents joints servent de références, pas de commandes à exécuter.

Code audité : E:/Interimatch/infiMatch-front-end et E:/Interimatch/InfiMatch/backend, changements locaux inclus. Le dépôt infiMatch-Backend-publication n’est pas la base de ce bilan. L’ancien INTERFACES.md décrit 53 écrans et une autre numérotation : ne pas le prendre comme dénominateur. Le routeur actuel déclare 21 chemins, dont étapes et pages partagées ; ils ne correspondent pas à 21 maquettes métier.

## Bilan page par page

### 01. Accueil public — Partiel

- **V1 :** F03

- **Route actuelle :** /

- **État :** Partiel

- **Présent :** Connexion et inscription accessibles.

- **Manques :** Recherche et raccourcis métier absents.

- **Front-back :** GET /listings/external disponible ; recherche personnalisée protégée.

- **Liens entre pages :** Accueil → recherche → détail → connexion avec retour au détail.

- **Priorité :** P2

### 02. Connexion — Couvert sur le périmètre dessiné

- **V1 :** F01

- **Route actuelle :** /connexion

- **État :** Couvert sur le périmètre dessiné

- **Présent :** Email/mot de passe, session serveur, déconnexion.

- **Manques :** Destination initiale perdue après connexion ; Google non configuré ; récupération du mot de passe supplémentaire non fonctionnelle.

- **Front-back :** /auth/login, /auth/me, /auth/logout, /auth/csrf raccordés.

- **Liens entre pages :** Connexion → accueil adapté au rôle ; conserver URL demandée.

- **Priorité :** P1

### 03. Inscription intérimaire — Partiel

- **V1 :** F01,F02

- **Route actuelle :** /inscription/*

- **État :** Partiel

- **Présent :** Étapes, validations, création compte et confirmation.

- **Manques :** Identité professionnelle, ville, qualifications, mobilité, disponibilités et RIB collectés mais non persistés par ce parcours.

- **Front-back :** POST /auth/register reçoit seulement email/password/family/termsVersion pour infirmier ; PUT /profile non appelé.

- **Liens entre pages :** Inscription → profil sauvegardé → dossier/RPPS → accueil.

- **Priorité :** P0

### 04. Tableau de bord intérimaire — Partiel

- **V1 :** F03,F12

- **Route actuelle :** /accueil

- **État :** Partiel

- **Présent :** Compteurs, notifications et marquage lu.

- **Manques :** Recommandations, prochaine mission/PDF, résumé disponibilités, liens dossier/favoris.

- **Front-back :** /dashboards et /me/notifications raccordés ; /me/matches et /me/history non consommés.

- **Liens entre pages :** Accueil → recommandation, calendrier, dossier, favoris, confirmation.

- **Priorité :** P1

### 05. Recherche missions — Partiel

- **V1 :** F04,F05,F15,F16,F20

- **Route actuelle :** /missions

- **État :** Partiel

- **Présent :** Liste interne/externe réelle, pagination, filtre qualification simple et favoris mission.

- **Manques :** Filtres multiples par branche, lieu/rayon/date/horaire ; pertinence, explications et alertes qualité. Texte filtré seulement sur page chargée.

- **Front-back :** POST /listings/search reçoit qualifications/limit/offset ; recherche chronologique ; matching distinct non appelé.

- **Liens entre pages :** Recherche avec critères persistants → détail → retour à la même page.

- **Priorité :** P1

### 06. Détail mission — Partiel

- **V1 :** F05,F06,F07

- **Route actuelle :** /missions/:id

- **État :** Partiel

- **Présent :** Description, dates, salaire, compétences requises, candidature ou lien source.

- **Manques :** Population/bloc/spécialité, expérience, identités établissement/agence, distance, admissibilité et favoris de fiche incomplets.

- **Front-back :** GET /listings/:id raccordé ; DTO/affichage à enrichir.

- **Liens entre pages :** Liste/favoris → détail → candidater en interne ou site source externe.

- **Priorité :** P1

### 07. Suivi candidatures — Partiel

- **V1 :** F07,F12

- **Route actuelle :** /candidatures

- **État :** Partiel

- **Présent :** Liste et retrait, message de changement de version.

- **Manques :** Onglets, chronologie, détail candidature/PDF ; date created_at absente du contrat ; ACCEPTED non traduit ; reconsentement peu guidé.

- **Front-back :** GET /me/applications ; POST /applications/:id/withdrawal. Pas de timeline dans cette réponse.

- **Liens entre pages :** Candidature → suivi → événements/confirmation ; mission modifiée → nouveau consentement.

- **Priorité :** P0

### 08. Disponibilités et mobilité — Partiel

- **V1 :** F08,F09

- **Route actuelle :** /calendrier et /profil

- **État :** Partiel

- **Présent :** Périodes disponibles/indisponibles éditables ; mobilité dans profil.

- **Manques :** Calendrier visuel, affectations superposées, historique et mobilité réunie absents. Sauvegarde dépend du profil complet.

- **Front-back :** GET/PUT /profile raccordés ; /me/history non consommé.

- **Liens entre pages :** Accueil → calendrier ↔ historique ; lien vers profil incomplet.

- **Priorité :** P1

### 09. Profil professionnel — Partiel

- **V1 :** F02,F04

- **Route actuelle :** /profil

- **État :** Partiel

- **Présent :** Nom affiché, diplômes IDE/IADE/IBODE, GPS/rayon, horaires, visibilité et périodes.

- **Manques :** Édition compétences/expériences ; identité/ville et diplômes/années structurés ; RIB ; action RPPS.

- **Front-back :** GET/PUT /profile partiels ; compétences/expériences déjà supportées ; autres champs nécessitent mapping/modèle.

- **Liens entre pages :** Profil → dossier/RPPS/RIB → recommandations ; relire après sauvegarde.

- **Priorité :** P0

### 10. Dossier et justificatif — Absent

- **V1 :** F18,F22

- **Route actuelle :** Aucune

- **État :** Absent

- **Présent :** Statut RPPS seulement visible ailleurs.

- **Manques :** Saisie/vérification/retry RPPS ; dépôt, liste et lecture document. Références dessinées hors V1.

- **Front-back :** PUT /profile/rpps ; POST /profile/rpps/retry ; GET/POST /me/documents ; GET /me/documents/:id.

- **Liens entre pages :** Profil/accueil → dossier → vérifier → retour candidature.

- **Priorité :** P0

### 11. Favoris missions/établissements — Absent

- **V1 :** F06

- **Route actuelle :** Aucune

- **État :** Absent

- **Présent :** Actions favoris mission dans recherche.

- **Manques :** Écran dédié, onglets et favoris établissement ; pagination au-delà des 50 chargés.

- **Front-back :** GET/POST/DELETE /me/favorites : MISSION, EXTERNAL, ESTABLISHMENT disponibles.

- **Liens entre pages :** Menu/accueil → favoris → mission/source/établissement.

- **Priorité :** P1

### 12. Historique missions — Absent

- **V1 :** F09

- **Route actuelle :** Aucune

- **État :** Absent

- **Présent :** Aucune vue des affectations passées.

- **Manques :** Liste, filtres temporels/métier, détail et chronologie.

- **Front-back :** GET /me/history disponible pour infirmier ; pas de timeline complète.

- **Liens entre pages :** Calendrier/accueil → historique → mission → confirmation.

- **Priorité :** P1

### 13. Tableau de bord établissement — Partiel

- **V1 :** F07,F12

- **Route actuelle :** /accueil partagé

- **État :** Partiel

- **Présent :** Compteurs de missions et notifications génériques.

- **Manques :** Candidats récents, renfort/PDF, agence liée, liens examen.

- **Front-back :** /dashboards : comptes par statut ; enrichir synthèses candidats/affectations.

- **Liens entre pages :** Accueil établissement → missions → candidatures ; renfort → PDF.

- **Priorité :** P1

### 14. Missions établissement — Partiel

- **V1 :** F07,F17,F19

- **Route actuelle :** /missions partagé

- **État :** Partiel

- **Présent :** Liste des missions de son organisation.

- **Manques :** Tableau et filtres métier, nombres candidats, professionnel affecté, actions par rôle.

- **Front-back :** GET /missions raccordé ; APIs candidats et transitions séparées.

- **Liens entre pages :** Liste → détail → examiner candidatures.

- **Priorité :** P1

### 15. Examen candidatures — Absent

- **V1 :** F07

- **Route actuelle :** Aucune

- **État :** Absent

- **Présent :** Règles/API serveur disponibles.

- **Manques :** Liste/détail professionnel, sélection et refus dans le front.

- **Front-back :** GET /missions/:id/applications ; POST /applications/:id/selection et /rejection. Réponse profil à enrichir : expérience/disponibilités/mobilité.

- **Liens entre pages :** Mission → candidats → profil → sélectionner/refuser → agence.

- **Priorité :** P0

### 16. Profil établissement / FINESS — Partiel

- **V1 :** F02 bis

- **Route actuelle :** /profil caché du menu entreprise

- **État :** Partiel

- **Présent :** Affichage lecture seule nom/email/adresse/FINESS.

- **Manques :** Édition, référent complet, accès menu, recherche FINESS ; format corse supporté côté serveur mais pas formulaire numérique.

- **Front-back :** PUT /organizations/:id ; GET /reference-data/finess. User frontend perd id organisation/référent.

- **Liens entre pages :** Menu → profil → FINESS → sauvegarde → rechargement.

- **Priorité :** P1

### 17. Créer/publier mission — Absent

- **V1 :** F17

- **Route actuelle :** Aucune

- **État :** Absent

- **Présent :** Gestion serveur des missions.

- **Manques :** Formulaires agence création/édition/publication/clôture ; vrai accès agence et contexte affiliation.

- **Front-back :** POST /missions ; PUT /missions/:id ; POST publish/cancel/reopen/complete.

- **Liens entre pages :** Agence → nouvelle mission → brouillon → publier → candidats → terminer.

- **Priorité :** P0

### 18. Valider affectation — Absent

- **V1 :** F12,F18,F19

- **Route actuelle :** Aucune

- **État :** Absent

- **Présent :** Affectation humaine et confirmation serveur.

- **Manques :** Écran agence candidats/profils proposés, critères bloquants, décision et téléchargement.

- **Front-back :** GET /missions/:id/applications et /candidates ; POST /missions/:id/assignments ; GET /assignments/:id/confirmation puis /me/documents/:id.

- **Liens entre pages :** Agence → candidats → décision manuelle → FILLED → PDF ; sélection établissement ≠ affectation.

- **Priorité :** P0

## Défauts précis de données et de contrat

- INS-01 (P0) : Consentements transmet identité/email/ville à register mais pas les qualifications, la mobilité et les périodes. register élimine ensuite identité/ville du corps infirmier. Le succès crée un compte sans enregistrer le dossier saisi. Relier onboarding et profil, avec reprise après échec sans nouvelle création du compte.

- INS-02 (P0) : le RIB saisi n’est pas envoyé. Le backend /me/bank-details accepte uniquement un IBAN fictif contenant DEMO avec fictional:true ; il ne supporte pas BIC/titulaire. Brancher un IBAN réel échouerait. Aligner le parcours de démonstration et le contrat. Ne pas conserver ces données dans le stockage navigateur pour contourner ce manque.

- PRO-01 (P0) : compétences et expérience sont dans le DTO serveur, mais leur édition manque. Identité détaillée, ville lisible et diplôme/année nécessitent un mapping ou une évolution du modèle, pas seulement un appel API.

- CAN-01 (P0) : application.created_at attendu dans market.ts n’existe pas dans la table application, qui contient updated_at. La date affichée devient « Non précisée ». Définir une vraie date de dépôt ; ne pas présenter la dernière modification comme la date initiale.

- CAN-02 (P0) : le serveur écrit ACCEPTED après affectation ; le frontend traduit ASSIGNED mais pas ACCEPTED. Harmoniser sans mélanger les états candidature, mission et affectation.

- REC-01 (P1) : filtrage texte limité aux résultats déjà chargés ; il peut masquer l’existence d’une mission sur une autre page. Passer les critères au serveur et réinitialiser la pagination lors de leur changement.

- REC-02 (P1) : /listings/search classe par fraîcheur ; /me/matches classe selon le matching mais n’est pas consommé. L’écran actuel n’assure pas le classement métier demandé.

- ORG-01 (P1) : User frontend retient la première organisation mais perd son identifiant et son référent. Enrichir le contrat pour sauvegarder la bonne organisation et son contexte de rôle.

- ORG-02 (P0) : l’inscription entreprise visible impose FINESS et produit un établissement malgré le libellé établissement/agence. Prévoir le véritable parcours agence et ses affiliations autorisées. FINESS ne donne aucun droit d’accès.

- EXT-01 (P1) : qualité, provenance détaillée et critères inconnus/correspondance fournis par le backend ne sont pas affichés. Une annonce externe doit rester reliée au site source, sans score complet ni candidature interne inventés.

- FAV-01 (P1) : seuls les 50 premiers favoris sont lus ; au-delà, les étoiles peuvent ne plus refléter la collection. Prévoir pagination ou vérification ciblée.

## Navigation actuelle et navigation à compléter

**Intérimaire actuel :** accueil public → inscription → compte → accueil → missions → détail → candidater → candidatures. Profil et périodes sont partiellement éditables. Ruptures : dossier saisi non conservé, RPPS non saisissable, compétences non éditables, aucun écran favoris/historique/dossier ni accès confirmation.

**Établissement actuel :** connexion → accueil → missions → détail. Aucun examen/sélection/refus via interface. /profil possède une vue entreprise en lecture seule mais le menu l’exclut.

**Agence actuelle :** accueil et liste entreprise. Les API de création, publication, propositions et affectation n’ont pas leur parcours visuel.

**Routes proposées, pas encore existantes :** /dossier ; /favoris ; /historique ; /etablissement/missions/:id/candidatures ; /agence/missions/nouvelle ; /agence/missions/:id/modifier ; /agence/missions/:id/affectation. Réutiliser /profil avec menu adapté ou introduire une route organisation explicite. Une présentation minimale de l’établissement peut être intégrée aux favoris/détails.

Conserver critères/page de recherche et destination après connexion. Distinguer identifiants listing préfixés m_/e_ et UUID mission. Prévoir liens de retour, erreurs compréhensibles, page inconnue et rechargement des URL hébergées. Les profils proposés doivent rejoindre le processus de candidature/consentement requis avant affectation ; leur affichage ne suffit pas.

## Bilan par fonction V1

- F01 : classique raccordé ; onboarding global partiel et accès agence incomplet. Google demandé en complément reste non configuré.

- F02 / F02 bis : profils partiels ; RIB non raccordé et établissement non éditable.

- F03 : accueil/compteurs présents ; recommandations, résumés métier et accès manquants.

- F04 / F16 : règles déterministes, matching et explications backend présents ; intégration visuelle manquante. Aucun score ne remplace un prérequis bloquant.

- F05 : recherche réelle mais critères riches et présentation des résultats partiels.

- F06 : favoris mission partiels ; écran dédié/établissements/pagination manquants. Recherches sauvegardées hors V1.

- F07 : candidature/retrait présents ; examen établissement et suivi détaillé manquants.

- F08 : périodes éditables ; calendrier métier/mobilité intégrée à compléter.

- F09 : API historique affectations présente ; écran absent et timeline à enrichir.

- F12 : notifications lues ; trois automatismes prévus dans backend/workflows. Confirmation et liens métier non exploités ; recette complète à faire.

- F15 : acquisition publique réelle démontrée historiquement ; collecte bornée, retrait automatique des offres disparues encore à compléter.

- F17 / F19 : gestion missions et décision agence côté serveur ; écrans absents. Dossier candidat à enrichir pour la décision.

- F18 : vérification RPPS et retry côté serveur ; écran absent.

- F20 : annonces réelles/source visibles ; alertes qualité et informations manquantes non restituées.

- F22 : téléversement/lecture de document fictif côté serveur ; écran absent.

## Périmètre et divergences documentaires

Les maquettes 10 et 18 incluent des références professionnelles, exclues par le catalogue et le rectificatif actuels. Les retirer/annoter dans les maquettes ; ne pas les compter comme manque V1. Un RPPS absent bloque ; un fournisseur indisponible laisse en attente avec retry. Aucune validation manuelle agence de substitution.

RIB : présent dans F02 mais contrat actuel réservé à une démonstration fictive. Documents F22 : PDF/PNG/JPEG fictifs, 5 MiB maximum, JSON contentBase64/mime/fictional:true ; ne pas prévoir du multipart sans adaptation. GET RIB ne renvoie qu’une valeur masquée.

Hors V1 : références, attestation sur l’honneur, multi-CV, recherches sauvegardées, import CSV, signature électronique, contrats complets, pointage, paie, aide/chat avancés, duplication/export calendrier, gestion avancée des organisations. Les affiliations minimales nécessaires à l’agence restent requises.

Google est un complément demandé par l’utilisateur, pas une condition de la maquette de connexion classique. Bibliothèque et endpoints préparés, Client ID non créé, connexion réelle et Vercel non validés. La présence du code ne signifie pas que cela fonctionne sur Vercel.

Mot de passe oublié : route supplémentaire présente mais fonction toujours indisponible, sans API de réinitialisation. Implémenter le parcours ou retirer son entrée en attendant. Le minimum de 12 caractères, supérieur aux 8 de la maquette, est une règle serveur à conserver et expliquer, pas une fonctionnalité manquante.

Les dates/personnes des maquettes sont fictives et ne forment pas un état de base cohérent entre les pages. L’ancien INTERFACES.md doit être réconcilié avec le catalogue actuel.

## Exigences transverses : présent et restant à vérifier

- Architecture : React/TypeScript front et Node/TypeScript back, PostgreSQL, MongoDB, CLI et secrets présents. Les manques majeurs observés concernent les contrats de données et l’enchaînement des actions.

- Authentification/sécurité : session serveur, cookie HttpOnly, CSRF, hachage et permissions présents ; conserver ces protections dans chaque nouvel écran. Ce bilan ne constitue pas une revue de sécurité exhaustive.

- Automatismes : matching, confirmation après affectation manuelle, relance mission non pourvue. Vérifier déclenchements, reprise, absence de doublons et liens de destination après intégration. Exécution actuelle des workers non vérifiée ici.

- Accessibilité/responsive : preuve mobile limitée existante ; revue clavier/focus/erreurs/libellés/contrastes/tableaux sur tous les parcours à faire. Aucune conformité RGAA conclue.

- RGESN : documenter au moins deux pratiques et leurs preuves. Une pagination seule ne valide pas toutes les exigences.

- SEO : contrôler titres/meta publics, H1, URLs et sitemap ; non recetté exhaustivement.

- Données personnelles/exploitation : mentions présentes ; textes, rétention, droits, sauvegarde/restauration et configuration déployée à rapprocher des exigences et preuves. Aucune conclusion juridique globale.

- Hébergement : tests locaux ne prouvent pas Vercel. Vérifier URL API, cookies, CORS/CSRF, HTTPS, rechargement SPA et fournisseur Google sur l’environnement publié.

## Tests existants et recette manquante

Preuves disponibles, non relancées pour ce bilan : signup-regression.json (13 vérifications), integration-api.json (11 vérifications, 2026-09-15T20:32:09.355Z), profile-google.json (6 vérifications). Tests API frontend et compilation rapportés précédemment. Les anciens nombres de tests/couvertures backend sont des instantanés différents : ne pas les additionner ou les annoncer comme couverture actuelle des 18 vues.

La preuve integration-api précise que la candidature positive n’a pas été exercée car la fixture est RPPS_NOT_CHECKED. Elle prouve le refus correctement présenté, pas la chaîne de réussite. Les tests inscription vérifient compte/session/navigation, pas la persistance de tous les champs métier. Google est notamment testé désactivé, pas avec une identité fournisseur réelle.

### Recette à exécuter après corrections

- T01 : inscription complète, rechargement et comparaison des données /profile ; reprise après échec partiel sans compte doublon.

- T02 : compétences/expérience/RPPS ; cas trouvé, absent, indisponible/retry ; aucun contournement des blocages.

- T03 : agence crée, modifie et publie ; contrôle des rôles et affiliation établissement.

- T04 : filtres multiples, pagination, classement matching, inconnus externes, liens source et retour à la recherche.

- T05 : candidature admissible, double clic/rejeu, retrait, version modifiée et consentement renouvelé.

- T06 : établissement examine seulement ses candidats et sélectionne/refuse sans pouvoir affecter définitivement.

- T07 : agence affecte ; conflits refusés ; mission FILLED et candidature ACCEPTED correctement traduites.

- T08 : confirmation PENDING puis READY ; téléchargement autorisé, autre compte refusé, cas remplacé/annulé.

- T09 : favoris de trois types, retrait et plus de 50 entrées ; historique/calendrier cohérents avec affectations.

- T10 : document fictif valide, type/taille/accès invalides ; RIB fictif sauvegardé et masqué.

- T11 : trois workflows, reprises sans doublons, notifications et destination correcte.

- T12 : desktop/mobile/clavier, erreurs réseau/serveur, expiration session, URLs directes et recette hébergée ; Google séparément après configuration.

## Ordre recommandé

1. P0 : sauvegarde onboarding, profil complet et dossier RPPS/RIB fictif. Valider T01/T02/T10.

2. P0 : création/publication agence, examen établissement, affectation et PDF ; corriger dates/statuts. Valider T03/T05/T06/T07/T08.

3. P1 : recherche/matching expliqués, favoris, historique/calendrier, tableaux de bord, édition établissement. Valider T04/T09/T11.

4. P1/P2 : navigation, accueil, états d’erreur, accessibilité/exigences transverses et hébergement. Valider T12.

Clôture V1 : parcours positifs et négatifs validés avec données de démonstration maîtrisées, persistance après rechargement, respect des droits et vues métier atteignables. Aucun délai ni pourcentage global déduit du seul nombre de pages.

## Annexe — contrats API et preuves

Routes relatives à /api/v1. Les raccourcis de transitions reprennent le même préfixe de ressource. Inventaire fonctionnel ciblé, pas inventaire exhaustif des endpoints techniques.

- Auth : GET /auth/csrf ; POST /auth/register, /auth/login, /auth/logout ; GET /auth/me — Raccordé ; onboarding incomplet. Source : InfiMatch/backend/src/auth/auth.module.ts.

- Google : GET /auth/google/config ; POST /auth/google/challenge ; POST /auth/google — Préparé, non configuré. Source : InfiMatch/backend/src/auth/auth.module.ts.

- Profil : GET/PUT /profile — Partiel. Source : InfiMatch/backend/src/profiles/profiles.module.ts.

- RPPS : PUT /profile/rpps ; POST /profile/rpps/retry — Non raccordé. Source : InfiMatch/backend/src/profiles/profiles.module.ts.

- Recherche/détail : POST /listings/search ; GET /listings/:id — Partiel. Source : InfiMatch/backend/src/listings/listings.module.ts.

- Public/correspondance : GET /listings/external ; GET /me/listings/:id/correspondence — Non raccordé directement. Source : InfiMatch/backend/src/listings/listings.module.ts.

- Matching : GET /me/matches ; GET /missions/:id/candidates ; GET /matches/:id/explanation — Non raccordé ; respecter propriétaire des explications. Source : InfiMatch/backend/src/matching/matching.module.ts.

- Favoris : GET/POST /me/favorites ; DELETE /me/favorites/:kind/:id — Partiel. Source : InfiMatch/backend/src/listings/listings.module.ts.

- Référentiel : GET /facilities ; GET /reference-data/finess ; GET /reference-data/finess/:finess — Non raccordé. Source : InfiMatch/backend/src/reference-data/finess.module.ts.

- Candidatures : POST /missions/:id/applications ; GET /me/applications ; POST /applications/:id/withdrawal — Raccordé partiellement ; réussite complète non recettée. Source : InfiMatch/backend/src/missions/missions.module.ts.

- Examen : GET /missions/:id/applications ; POST /applications/:id/selection, /rejection — Non raccordé ; profil candidat à enrichir. Source : InfiMatch/backend/src/missions/missions.module.ts.

- Missions : GET/POST /missions ; PUT /missions/:id ; POST /missions/:id/publish, /cancel, /reopen, /complete — Lecture seule raccordée. Source : InfiMatch/backend/src/missions/missions.module.ts.

- Affectation : POST /missions/:id/assignments — Non raccordé. Source : InfiMatch/backend/src/missions/missions.module.ts.

- Confirmation : GET /assignments/:id/confirmation ; GET /me/documents/:id — Non raccordé. Source : InfiMatch/backend/src/organizations/organizations.module.ts.

- Historique : GET /me/history — Non raccordé ; timeline à enrichir. Source : InfiMatch/backend/src/listings/listings.module.ts.

- Accueil/notifications : GET /dashboards ; GET /me/notifications ; POST /me/notifications/:id/read — Partiel. Source : InfiMatch/backend/src/listings/listings.module.ts.

- Organisation : PUT /organizations/:id ; GET/POST /staffing-requests — Non raccordé. Source : InfiMatch/backend/src/organizations/organizations.module.ts.

- Préférences : PUT /me/notification-preferences — Non raccordé ; infirmier. Source : InfiMatch/backend/src/organizations/organizations.module.ts.

- Documents/RIB : GET/POST /me/documents ; GET /me/documents/:id ; GET/PUT /me/bank-details — Non raccordé ; données fictives. Source : InfiMatch/backend/src/documents/documents.module.ts.

- Preuve précise : infiMatch-front-end/src/services/auth.ts:132 — export async function register.

- Preuve précise : infiMatch-front-end/src/pages/inscription/Consentements.tsx:24 — await register.

- Preuve précise : infiMatch-front-end/src/services/market.ts:30 — statusLabels.

- Preuve précise : infiMatch-front-end/src/layouts/AppLayout.tsx:38 — navigation.filter.

- Preuve précise : infiMatch-front-end/src/router.tsx:29 — export const router.

- Preuve précise : InfiMatch/backend/src/database/schema.ts:14 — CREATE TABLE application.

- Preuve précise : InfiMatch/backend/src/documents/documents.module.ts:53 — class BankDto.

Pièces : sources.json (empreintes), MATRICE_PAGES_V1.csv (18 lignes), MATRICE_LIENS_API_V1.csv (19 groupes), planche-1/2/3.jpg (18 maquettes). backend-endpoints.json est un inventaire brut de décorateurs non normalisé ; utiliser la matrice API pour les chemins fonctionnels.
