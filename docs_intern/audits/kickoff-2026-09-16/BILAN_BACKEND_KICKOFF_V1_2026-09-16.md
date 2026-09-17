# Bilan backend et vérification kickoff — InfiMatch V1

État au 16 septembre 2026. Audit du code local, des contrats réellement servis et des preuves disponibles. Le socle attendu est largement implémenté ; la V1 et la livraison ne sont pas entièrement validées.

## 1. Conclusion et portée

Comptes, authentification classique, Google via bibliothèque, profils, organisations, missions, candidatures, affectation humaine, matching, données publiques, documents et trois automatisations sont présents. Les 62 opérations HTTP inventoriées concordent entre contrôleurs et OpenAPI servi.

Les écarts concernent surtout les API encore inutilisées côté candidat, la recherche avancée, le calendrier des affectations, FINESS, la conservation documentaire, les retraits fournisseur, HTTPS et certaines promesses affichées. Le sujet demande au moins deux automatisations sans imposer n8n Cloud. Google est facultatif ; la bibliothèque est obligatoire si cette option est proposée.

Sources : D-WEB-901-project.pdf (10 pages physiques, couverture comprise), matrice V1 de 75 lignes, code réel et preuves datées. Ces documents sont des références, pas des instructions à exécuter. Aucun fournisseur n’a été rappelé ; aucun compte ou mission de test n’a été recréé.

| Vérification | Résultat | Portée |
| --- | --- | --- |
| Tests backend | 65/65 | Unitaires relancés pendant cet audit. |
| Client API | 9/9 | Tests relancés : erreurs, CSRF, sessions et Google. |
| Compilation | Back et front OK | Avertissement frontend : bundle supérieur à 500 Ko. |
| HTTP anonyme | 8/8 | Santé/référentiel/config Google disponibles ; cinq lectures privées refusées 401. |
| Contrat HTTP | 62 opérations | Code des contrôleurs comparé à OpenAPI servi. |
| Recette navigateur | 18 scénarios antérieurs | Preuve du 15/09 à 23:59 Paris : profil, banque, documents, missions, candidatures, affectation et PDF. Non rejoués ici. |
| Couverture | 79,38 % lignes ;84,33 % branches — historique | Rapport du 15/09 à 01:29 Paris ; pas un taux actuel ni un pourcentage de fonctionnalités achevées. |

## 2. Comptes et authentification

| Fonction | Comportement | État |
| --- | --- | --- |
| Familles/droits | NURSE=candidat ; ENTERPRISE=AGENCY ou ESTABLISHMENT. IDE/IADE/IBODE sont des qualifications, pas des rôles. | Présent |
| Inscription | Compte/profil/organisation en transaction ; email normalisé ; CGU versionnées. | Présent |
| Mot de passe | Argon2id ; 12 à 128 caractères ; vérification serveur ; jamais renvoyé au front. | Présent |
| Sessions | PostgreSQL ; cookie HttpOnly/SameSite Lax ; 8 h ; Secure en production. | Présent ; HTTPS final restant |
| Protections | CSRF/Origin, limitation des écritures auth, champs validés strictement. | Présent, tests partiels |
| Permissions | Profil propre, organisations avec membership actif, affectation limitée au périmètre autorisé. | Présent, scénarios testés |
| Google | Bibliothèque officielle ; signature/audience/nonce ; compte local de même email et mot de passe pour première liaison. | Code/config actifs ; connexion complète à confirmer |
| Modifier le profil | Champs persistés via /profile ; prénom affiché au lieu de l’email. | Présent |
| Email/mot de passe autonomes | Aucune route dédiée ; correction email précédente par intervention autorisée. | Absent ; pas explicitement exigé par kickoff |
| Mot de passe oublié | Pas de reset ni envoi email ; écran indisponible explicite. | Absent ; complément produit |
| Clôture/suspension/export | Pas de parcours ni route publique dédiée, contrairement à certaines mentions. | Écart avec engagements affichés |
| Rattacher les organisations | CLI link-organizations, aucun écran de gestion des liens. | Opérateur uniquement |
| Préférences notifications | PUT /me/notification-preferences non consommé par le front. | Backend seul |

Le nettoyage a supprimé les fixtures, pas les fonctions. Des tables métier vides ne signifient pas une fonctionnalité absente. La correction de l’email du propriétaire ne crée pas une association Google : validation du jeton et mot de passe local restent requis pour la première liaison.

## 3. Catalogue fonctionnel et raccordements

### F01 — Deux entrées Infirmier et Entreprise ; entreprise de type établissement ou agence ; authentification classique.

État : Implémenté localement. Comptes candidat/entreprise, agences/établissements, inscription, connexion, déconnexion et Google.

Code (relatif à backend/src) : auth/auth.module.ts ; auth/google.ts ; common/access.ts. Écrans : /inscription ; /connexion.

Limite / reste : Google utilisateur à confirmer ; gestion autonome du compte/reset absents.

### F02 — Profil infirmier, diplômes, compétences, expérience par service, disponibilités, mobilité et RIB fictif chiffré.

État : Implémenté, limites documentaires. Profil détaillé, disponibilités, mobilité et banque fictive persistés.

Code (relatif à backend/src) : profiles/profiles.module.ts ; profiles/profile-details.ts ; documents/documents.module.ts. Écrans : /profil ; /calendrier ; /dossier.

Limite / reste : Banque limitée à IBAN fictif : pas de BIC/titulaire persistés ni paiement.

### F02 bis — Profil établissement, FINESS obligatoire, nom, adresse, référent et acceptation des CGU.

État : Implémenté, assistance partielle. Organisations, référent, FINESS texte obligatoire établissement ; SIRET agence.

Code (relatif à backend/src) : auth/auth.module.ts ; organizations/organizations.module.ts ; reference-data/finess.module.ts. Écrans : /inscription ; /organisation.

Limite / reste : Recherche FINESS officielle disponible sans sélecteur relié au formulaire ; pas de preuve d’appartenance.

### F03 — Données du tableau de bord infirmier : propositions, favoris, disponibilités et accès au profil.

État : Partiel. Tableau candidat connecté : compteurs, profil, notifications et liens.

Code (relatif à backend/src) : listings/listings.module.ts ; matching/matching.module.ts. Écrans : /accueil.

Limite / reste : Recommandations /me/matches non intégrées au tableau.

### F04 + F16 — Matching déterministe hiérarchique et explicable.

État : Backend implémenté, front partiel. Matching déterministe : conditions bloquantes puis score ; historique Mongo ; propositions agence.

Code (relatif à backend/src) : domain/matching.ts ; matching/matching.module.ts. Écrans : /gestion/missions/:id.

Limite / reste : Explications et recommandations candidat non raccordées.

### F05 — Recherche manuelle multi-types de missions, filtres métier, dates, horaires et distance.

État : Backend avancé, front partiel. Filtres multi-qualifications et branches métier ; pagination.

Code (relatif à backend/src) : listings/search.ts ; listings/listings.module.ts. Écrans : /missions ; services/market.ts.

Limite / reste : Front envoie qualifications/limit/offset seulement ; texte filtré sur la page courante ; pas de filtres dates/rayon/services complets.

### F06 — Ajouter, consulter et supprimer des offres favorites et des établissements favoris.

État : Implémenté, scénarios testés. Favoris privés internes/externes/établissements : ajout/liste/retrait.

Code (relatif à backend/src) : listings/listings.module.ts. Écrans : /favoris ; cartes ; /etablissements/:id.

Limite / reste : Recette finale des états expirés à conserver.

### F07 — Postuler, suivre et retirer une candidature ; sélectionner ou refuser côté entreprise selon les droits.

État : Implémenté, scénarios testés. Candidature interne, consentement versionné, retrait/sélection/refus ; externe par redirection.

Code (relatif à backend/src) : missions/missions.module.ts ; missions/missions.service.ts. Écrans : /candidatures ; /candidatures/:id ; /missions/:id/candidater.

Limite / reste : Pas de suivi de l’issue des candidatures sur sites externes.

### F08 — Intervalles de disponibilité et d’indisponibilité ; mobilité.

État : Implémenté, scénarios testés. Disponibilités/indisponibilités et mobilité ; nuits, périodes entières et conflits.

Code (relatif à backend/src) : profiles/profiles.module.ts ; domain/matching.ts. Écrans : /profil ; /calendrier.

Limite / reste : Interface en dates/journées conformément à la demande utilisateur ; pas d’horaires fins.

### F09 — Historique et calendrier des missions affectées, à venir, en cours, annulées et passées.

État : Partiel. Historique des affectations et états temporels accessibles.

Code (relatif à backend/src) : listings/listings.module.ts. Écrans : /historique ; /calendrier.

Limite / reste : /calendrier édite les disponibilités, sans calendrier visuel des missions confirmées.

### F12 — Trois workflows n8n : notification de correspondance, génération d’une confirmation de mission depuis un modèle et relance d’une mission non pourvue.

État : Implémenté localement. Trois workflows, worker/outbox, notifications et PDF fictif après décision humaine.

Code (relatif à backend/src) : automation/automation.module.ts ; worker.ts. Écrans : /accueil ; /historique ; confirmations.

Limite / reste : Validation finale de l’environnement ; pas d’email/SMS/Slack/Discord démontré.

### F15 — Acquisition d’offres par API, nettoyage, stockage et affichage dans la plateforme.

État : Cycle fournisseur partiel. France Travail : acquisition, normalisation, stockage, upsert et provenance.

Code (relatif à backend/src) : public-data/offers.ts ; cli.ts. Écrans : /missions ; /missions/:id.

Limite / reste : Les offres vues sont réactivées, celles absentes d’un nouveau lot ne sont pas retirées systématiquement.

### F17 — Création, modification, publication et clôture des missions par l’agence.

État : Implémenté, scénarios testés. Créer/modifier/publier/annuler/rouvrir/clôturer selon droits et états.

Code (relatif à backend/src) : missions/missions.module.ts ; missions/missions.service.ts. Écrans : /gestion/missions/* ; /besoins.

Limite / reste : Agence crée les missions, établissement exprime les besoins. Rattachement entre eux par CLI.

### F18 — Consultation du RPPS via l’API Annuaire Santé à la saisie ou modification du numéro dans le profil.

État : Implémenté, contrôle distinct. RPPS exact : trouvé/non trouvé/en attente ; demande/relance dossier ; preuves fournisseur antérieures.

Code (relatif à backend/src) : profiles/rpps.ts ; profiles/profiles.module.ts. Écrans : /dossier.

Limite / reste : Inscription seule ne vérifie pas le RPPS. Numéro retrouvé ne prouve pas identité ou tous les diplômes.

### F19 — Tableau de bord agence, candidatures, propositions, sélection, refus et affectation.

État : Implémenté, scénarios testés. Tableaux entreprise, candidatures, candidats classés, sélection humaine et affectation atomique.

Code (relatif à backend/src) : missions/missions.module.ts ; matching/matching.module.ts. Écrans : /accueil ; /missions ; /gestion/missions/:id.

Limite / reste : Propositions front limitées aux 20 premières ; ajouter navigation au-delà.

### F20 — Utilisation visible des données publiques nettoyées.

État : Partiel. Offres normalisées visibles avec source/lien ; correspondance partielle dans API.

Code (relatif à backend/src) : listings/listings.module.ts. Écrans : /missions ; /missions/:id.

Limite / reste : /me/listings/:id/correspondence non consommé ; afficher critères/incertitudes détaillés.

### F22 — Dépôt et consultation autorisée d’un justificatif fictif chiffré.

État : Conservation partielle. Dépôt PDF/PNG/JPEG fictif ≤ 5 MiB, contrôles, chiffrement et téléchargement autorisé.

Code (relatif à backend/src) : documents/documents.module.ts ; documents/crypto.ts. Écrans : /dossier ; confirmations.

Limite / reste : Pas d’idempotence complète des dépôts/remplacements ni purge globale des doublons/orphelins.

## 4. Écarts prioritaires

| Priorité / sujet | Origine | Constat et action |
| --- | --- | --- |
| P1 — HTTPS et transit | Kickoff p.3 | API/front HTTP local ; TLS bases non démontré.<br>À faire : Valider HTTPS de livraison et les flux concernés. |
| P1 — Mentions et comportement | Kickoff p.5 | Purges/clôture/suspension/hébergement/conformité annoncés sans preuve complète ; offres réelles mais texte tout fictif.<br>À faire : Aligner les mentions sur le POC et implémenter les engagements retenus. |
| P1 — Recette et couverture finale | Kickoff p.6–7 | Coverage antérieur au code actuel ; pas de recette finale de livraison.<br>À faire : Tests isolés, coverage de la révision finale, installation propre et démonstration. |
| P1 — Première connexion Google | Option proposée | Email corrigé ; parcours complet propriétaire non observé.<br>À faire : Validation utilisateur sans collecter son mot de passe dans la conversation. |
| P2 — Matching candidat | V1 F03/F04/F16 | Suggestions et explications non consommées.<br>À faire : Raccorder /me/matches et /matches/:id/explanation. |
| P2 — Recherche avancée | V1 F05 | Qualifications seules ; texte filtré sur la page courante.<br>À faire : Exposer dates/rayon/services et recherche sur tout le résultat. |
| P2 — Correspondance externe | V1 F20 | API présente, critères et incertitudes non affichés.<br>À faire : Présenter connu/inconnu sans score complet inventé. |
| P2 — FINESS et rattachements | V1 F02bis/F17 | Saisie manuelle FINESS ; affiliation par CLI.<br>À faire : Raccorder recherche et documenter ou créer un parcours autorisé de rattachement. |
| P2 — Calendrier/propositions | V1 F09/F19 | Pas de calendrier missions  ; 20 propositions front seulement.<br>À faire : Calendrier des affectations et pagination des propositions. |
| P2 — Documents/conservation | V1 F22/SEC | Rejeu de dépôt/banque pouvant ajouter un document ; purge incomplète.<br>À faire : Idempotence, remplacement cohérent et conservation appliquée. |
| P2 — Synchronisation fournisseur | V1 F15 | Upsert présent ; disparition d’offres non traitée systématiquement.<br>À faire : Cycle de retrait fournisseur et preuve de rejeu. |
| P2 — Préférences notifications | V1 | Option backend non raccordée.<br>À faire : Relier la préférence sans annoncer un canal externe inexistant. |
| P2 — Responsive/SEO/éco-conception | Kickoff p.5–6 | Deux listes mobile débordent ; sitemap et affirmations anciennes.<br>À faire : Corriger, valider URLs livrées et documenter deux pratiques vérifiables. |
| P2 — Exploitation/restauration | V1 sécurité | Restauration complète non prouvée ; privilèges bases à valider.<br>À faire : Exercice isolé SQL/Mongo/fichiers/clés/n8n et droits minimaux. |
| P2 — Livrables équipe | Kickoff p.7–8 | Temps humains/écarts et répétition non démontrés.<br>À faire : Compléter dossier, temps réels et participation collective. |
| P3 — Gestion autonome compte | Complément produit | Reset, changement email/mot de passe, MFA absents.<br>À faire : Arbitrer sans les présenter comme obligations explicites du sujet. |

P1 : avant déclaration de livraison complète. P2 : compléments V1 ou preuves restantes. P3 : fonctions supplémentaires à arbitrer. Les obligations du kickoff restent distinctes des engagements V1 et améliorations de confort.

## 5. Les 40 exigences du kickoff

Pages physiques PDF : comptes/missions/profils/matching p.3 ; données et nocode p.4 ; accessibilité/éco-conception/conformité/SEO p.5 ; stack/tests/CLI/auth p.6 ; livrables p.7 ; soutenance p.8. L’ancienne matrice utilisait la pagination imprimée, décalée de 1.

| ID / exigence | État | Preuve et reste |
| --- | --- | --- |
| R01 — Secteur choisi et justifié | Documenté | Santé : README et cadrage.<br>Reste : Argumentaire collectif à valider hors audit du code. |
| R02 — Taille du marché, acteurs et douleurs | Document présent, à valider | Étude SEO/concurrence et documents marché présents.<br>Reste : Vérifier sources datées, taille du marché et besoins ; pas d’audit marché ici. |
| R03 — Source publique et format consommable | Implémenté ; preuve réelle antérieure | France Travail JSON, FINESS et Annuaire Santé ; docs/proofs.<br>Reste : Fournisseurs non rappelés pendant cet audit. |
| R04 — Proposition de valeur en une phrase | Documenté, à valider | Positionnement et présentation InfiMatch présents.<br>Reste : Valider une phrase commune au produit et au pitch. |
| R05 — CDC à J+2, p. 2 et 6 | Partiel documentaire | Planning et chiffrage V1 présents.<br>Reste : Remise effective du CDC à J+2 non démontrée par le code. |
| R06 — Roadmap et périmètre | Documenté | PLANNING_4_PERSONNES_11_JOURS.md, DECISIONS_V1.md et V2.<br>Reste : Aligner le périmètre annoncé sur les écarts actuels. |
| R07 — Estimation par fonction ou module | Documenté, à recalibrer | CHIFFRAGE_V1.md/.csv : estimations par lot.<br>Reste : Distinguer estimations, disponibilité réelle et temps effectivement passé. |
| R08 — Go/no-go et ajustement | Non démontré | Go/no-go prévu dans le cadrage.<br>Reste : Conserver une décision collective datée ; ne pas inventer sa tenue. |
| R09 — Deux comptes/parcours | Implémenté, scénarios testés | NURSE/ENTERPRISE ; entreprises AGENCY/ESTABLISHMENT ; inscriptions et droits distincts.<br>Reste : Affiliation agence–établissement par CLI, sans écran de gestion. |
| R10 — Authentification sécurisée | Implémenté localement ; livraison partielle | Argon2id, sessions SQL, cookies HttpOnly/SameSite, CSRF/Origin, limite auth, DTO stricts.<br>Reste : HTTPS et configuration de production à valider. |
| R11 — Chiffrement repos/transit | Partiel — exigence non achevée | Documents/RIB fictifs AES-256-GCM ; Vault en HTTPS.<br>Reste : Frontend/API en HTTP local ; TLS interservices non démontré. HTTPS Vault ne couvre pas les autres flux. |
| R12 — Mission poste/dates/lieu/compétences/salaire | Implémenté, scénarios testés | Mission : poste, dates, lieu, qualification, compétences, salaire ; formulaire connecté.<br>Reste : Recette exhaustive et rattachement organisationnel préalable. |
| R13 — Profil compétences/disponibilité/zone/expérience | Implémenté, scénarios testés | Profil détaillé, expériences, compétences, qualifications, zone et disponibilités persistés.<br>Reste : Déclarations de diplôme/expérience et vérification RPPS sont distinctes. |
| R14 — Matching des missions ouvertes | Backend implémenté ; front partiel | Admissibilité puis score déterministe ; candidats proposés dans gestion de mission.<br>Reste : /me/matches et /matches/:id/explanation non consommés côté candidat. |
| R15 — Dashboard ouverte/pourvue/terminée | Implémenté, scénarios testés | Dashboards et listes avec OPEN/FILLED/COMPLETED ; transitions reliées.<br>Reste : Rejouer le parcours sur l’environnement livré. |
| R16 — Consommer une source publique | Implémenté ; preuve réelle antérieure | Acquisition France Travail/FINESS ; preuves locales datées.<br>Reste : Accès et disponibilité fournisseur à revalider pour la démonstration finale. |
| R17 — Nettoyer et reformater | Implémenté, scénarios testés | Normalisation, provenance, dédoublonnage et upsert source/source_id.<br>Reste : Retrait systématique des offres disparues du fournisseur manquant. |
| R18 — Usage visible des données | Usage visible partiel | Offres externes consultables, source, redirection et favoris.<br>Reste : Correspondance personnelle détaillée et incertitudes non affichées. |
| R19 — Au moins deux automatisations | Implémenté localement ; preuve antérieure | Trois workflows n8n : match, relance, confirmation PDF.<br>Reste : Sujet : minimum deux workflows ; n8n Cloud non obligatoire. Revalider sur l’environnement livré. |
| R20 — Bases RGAA et savoir les citer | Partiel | Labels, structure, focus, contrôles navigateur ; catalogue au clavier.<br>Reste : Audit global actuel des contrastes, lecteurs d’écran et états restant. RGAA total non exigé pour ce POC. |
| R21 — Deux pratiques RGESN documentées | Partiel documentaire | Sprite d’icônes et chargement différé dans certaines vues.<br>Reste : Anciennes affirmations SVG<2Ko et aucun appel réseau périmées ; documenter deux pratiques actuelles. |
| R22 — RGPD : base, conservation, mentions | Partiel — affichage incohérent | CGU datées, mentions, documents privés et rétention Mongo.<br>Reste : Mentions promettant purge, clôture et droits depuis l’espace sans parcours complet ; aligner engagements et code. Pas de validation juridique ici. |
| R23 — Grandes règles de l’intérim | Non démontré intégralement | Dates, qualification, RPPS, expérience requise et confirmation fictive.<br>Reste : Ces contrôles ne prouvent pas toutes les règles de l’intérim du secteur ; affirmation des mentions non justifiée par le code. |
| R24 — Achat responsable/réemploi si pertinent | À documenter si pertinent | Aucun dispositif dédié établi par cet audit.<br>Reste : Justifier un axe responsable adapté ou expliquer son absence. |
| R25 — SEO public : meta, titres, URLs, sitemap | Partiel | Titres, descriptions, URLs, robots et sitemap présents.<br>Reste : Domaine de livraison non vérifié ; /missions protégé dans le sitemap ; pas de fiche publique indexable confirmée. |
| R26 — Frontend JS en TypeScript | Implémenté, compilé | React/TypeScript ; build réussi pendant cet audit.<br>Reste : Aucun manque de framework constaté. |
| R27 — Mobile/tablette/desktop | Partiel, scénarios vérifiés | Contrôles/captures 375/768/1440px ; galerie responsive.<br>Reste : Deux listes missions établissement/agence débordent sur mobile : 400 px pour 375 px. |
| R28 — Backend Node en TypeScript | Implémenté, compilé | NestJS/Node/TypeScript ; build backend réussi.<br>Reste : Aucun manque de framework constaté. |
| R29 — Base relationnelle | Implémenté | PostgreSQL/PostGIS : comptes, organisations, missions, candidatures, affectations, sessions.<br>Reste : Privilèges minimaux et déploiement final à valider. |
| R30 — Base non relationnelle complémentaire | Implémenté, usage métier | MongoDB : explications versionnées du matching, index de rétention.<br>Reste : Des données vides après nettoyage ne signifient pas une absence de code. |
| R31 — Tests unitaires et fonctionnels critiques | Implémenté ; recette finale restante | 65 tests backend et 9 client relancés  ; 18 scénarios navigateur antérieurs.<br>Reste : Pas de relance des intégrations avec écritures après nettoyage ; prévoir environnement isolé. |
| R32 — Coverage générée et livrée | Partiel — rapport à actualiser | Coverage historique :79,38 % lignes,84,33 % branches,15/09 à 01:29 Paris.<br>Reste : Ne pas attribuer ces taux au code actuel ; regénérer la couverture de livraison. |
| R33 — Bibliothèque CLI utilisée | Implémenté | Commander : migrations, imports, rattachements, seed, reprise outbox et documents.<br>Reste : Commandes d’écriture non rejouées ici. |
| R34 — Auth classique comprise/implémentée | Implémenté/testé ; compréhension à démontrer | Email/mot de passe/hash/sessions codés dans auth.module.ts.<br>Reste : L’équipe doit pouvoir expliquer le code ; pas de validation automatique de compréhension. |
| R35 — OAuth tiers via bibliothèque si proposé | Implémenté ; validation utilisateur restante | Google Identity Services et google-auth-library ; signature/audience/nonce et liaison protégée.<br>Reste : Google facultatif dans le sujet ; connexion complète propriétaire non confirmée ; compte local préalable requis. |
| R36 — Dépôt front/back organisé et README | Partiel documentaire | Dépôts organisés, README et scripts ; nettoyage effectué.<br>Reste : États documentaires historiques périmés ; installation propre et livraison finale à vérifier. |
| R37 — Exports nocode, données/script et étude | Livrables présents ; complétude à valider | Trois exports n8n, scripts de données et documents d’étude.<br>Reste : Assembler les versions finales et preuves cohérentes. |
| R38 — Temps réels/écarts et support de pitch | Partiel / manquant | Estimations présentes ; TEMPS_REELS.csv : une mesure de temps agent seulement.<br>Reste : Temps humains/écarts et support de pitch final non établis. |
| R39 — Storytelling, live et participation de tous | Hors preuve technique | Parcours de démo et catalogue disponibles.<br>Reste : Répétition, storytelling et participation de chaque membre à démontrer. |
| R40 — Adaptation aux questions du jury | Hors preuve technique | Documentation/tests pour appuyer les réponses.<br>Reste : Capacité à répondre au jury à vérifier en répétition et soutenance. |

## 6. Contrôles sécurité V1

| ID | État | Preuve / limite |
| --- | --- | --- |
| SEC01 | Preuve antérieure | Renouvellement de session à la connexion ; auth.module.ts et journey.spec.ts. |
| SEC02 | Preuve antérieure | Destruction de session/déconnexion/expiration ; recette HTTP historique. |
| SEC03 | Implémenté, test actuel | auth-rate-limit.ts : 50 écritures/15min ; test du refus suivant ; lectures exclues. |
| SEC04 | Implémenté, preuve antérieure | Origin/CSRF app.ts ; tests HTTP historiques non rejoués en écriture ici. |
| SEC05 | Implémenté, preuve antérieure | Téléchargement limité au titulaire/participants autorisés ; recette navigateur. |
| SEC06 | Implémenté, preuve antérieure | membership/agency_link/scope ; isolation missions/besoins testée. |
| SEC07 | Implémenté, preuve antérieure | DTO stricts et droits serveur ; tests injection de champs de privilège. |
| SEC08 | Partiel | React échappe les contenus ; pas de campagne XSS exhaustive actuelle. |
| SEC09 | Partiel | Requêtes paramétrées, DTO, UUID ; tous les filtres malformés non testés. |
| SEC10 | Implémenté, validation partielle | Taille/signature MIME ; test HTML refusé comme PDF ; purge globale incomplète. |
| SEC11 | Test actuel réussi | Chiffrement authentifié : altération et échange de documents refusés. |
| SEC12 | Preuve antérieure | Versionnement clés et scénario rotation ; exercice global non refait. |
| SEC13 | Preuves antérieures | Transaction affectation, exclusion SQL, idempotence et concurrence testées. |
| SEC14 | Implémenté, limites | Jeton commun aux trois routes automation ; pas de séparation de scopes par workflow. |
| SEC15 | Preuves locales, audit final restant | Exports et variables/Vault runtime ; aucune valeur secrète lue ici. |
| SEC16 | Non démontré intégralement | Restaurations code/SQL historiques ; restauration SQL+Mongo+fichiers+clés+n8n non prouvée. |
| SEC17 | Non démontré intégralement | Logs/audit/reprises présents ; exercice incident bout en bout non établi. |
| SEC18 | Implémenté, preuve antérieure | Cache-Control no-store privé et déconnexion ; limites des pages déjà affichées à documenter. |

## 7. Distinctions importantes

| Confusion | Réalité |
| --- | --- |
| Deux comptes = deux interfaces seulement | Deux familles, dont entreprise divisée en agence et établissement avec droits différents. |
| Qualification = rôle | IDE/IADE/IBODE ne donnent pas de privilèges d’administration. |
| Inscription = RPPS vérifié | Le dossier déclenche un contrôle distinct ; profil déclaré et RPPS retrouvé sont deux choses différentes. |
| RPPS trouvé = identité/diplôme vérifiés | Le numéro retrouvé ne prouve pas le titulaire du compte ni toutes ses déclarations. |
| Matching = affectation automatique | Le score aide ; l’affectation reste une décision humaine autorisée. |
| Annonce externe = mission interne | Candidature par redirection ; pas de score complet d’admissibilité ni suivi externe de son issue. |
| PDF = contrat signé | Confirmation fictive ; signature et contrat complet non implémentés. |
| Vault HTTPS = tout chiffré en transit | Vault ne sécurise pas automatiquement les flux navigateur/API/bases. |
| Catalogue = démo connectée | 49 vues issues des composants réels avec API interceptée et données fictives ; pas d’opérations dans la base. |
| Tests réussis = 100 % terminé | Tests de scénarios précis, sans preuve globale des parcours, conformité ou livraison. |

## 8. Inventaire des 62 opérations HTTP

Préfixe /api/v1. Swagger /api/docs et /api/docs-json sont des outils documentaires, exclus de ce total. Une route présente ne prouve pas tous ses contrôles. Le CSV indique les paramètres des contrôleurs.

| Méthode / route | Source |
| --- | --- |
| GET /api/v1/health | backend/src/app.ts:39 |
| GET /api/v1/auth/csrf | backend/src/auth/auth.module.ts:274 |
| POST /api/v1/auth/google | backend/src/auth/auth.module.ts:257 |
| POST /api/v1/auth/google/challenge | backend/src/auth/auth.module.ts:244 |
| GET /api/v1/auth/google/config | backend/src/auth/auth.module.ts:241 |
| POST /api/v1/auth/login | backend/src/auth/auth.module.ts:284 |
| POST /api/v1/auth/logout | backend/src/auth/auth.module.ts:299 |
| GET /api/v1/auth/me | backend/src/auth/auth.module.ts:287 |
| POST /api/v1/auth/register | backend/src/auth/auth.module.ts:278 |
| POST /api/v1/internal/automation/confirmation/:id | backend/src/automation/automation.module.ts:356 |
| POST /api/v1/internal/automation/matches/:id | backend/src/automation/automation.module.ts:345 |
| POST /api/v1/internal/automation/reminders | backend/src/automation/automation.module.ts:352 |
| GET /api/v1/me/bank-details | backend/src/documents/documents.module.ts:268 |
| PUT /api/v1/me/bank-details | backend/src/documents/documents.module.ts:259 |
| GET /api/v1/me/documents | backend/src/documents/documents.module.ts:233 |
| POST /api/v1/me/documents | backend/src/documents/documents.module.ts:220 |
| GET /api/v1/me/documents/:id | backend/src/documents/documents.module.ts:239 |
| GET /api/v1/dashboards | backend/src/listings/listings.module.ts:296 |
| GET /api/v1/facilities | backend/src/listings/listings.module.ts:225 |
| GET /api/v1/facilities/:id | backend/src/listings/listings.module.ts:231 |
| GET /api/v1/listings/:id | backend/src/listings/listings.module.ts:190 |
| GET /api/v1/listings/external | backend/src/listings/listings.module.ts:167 |
| POST /api/v1/listings/search | backend/src/listings/listings.module.ts:46 |
| GET /api/v1/me/favorites | backend/src/listings/listings.module.ts:267 |
| POST /api/v1/me/favorites | backend/src/listings/listings.module.ts:247 |
| DELETE /api/v1/me/favorites/:kind/:id | backend/src/listings/listings.module.ts:275 |
| GET /api/v1/me/history | backend/src/listings/listings.module.ts:288 |
| GET /api/v1/me/listings/:id/correspondence | backend/src/listings/listings.module.ts:136 |
| GET /api/v1/me/notifications | backend/src/listings/listings.module.ts:324 |
| POST /api/v1/me/notifications/:id/read | backend/src/listings/listings.module.ts:333 |
| GET /api/v1/matches/:id/explanation | backend/src/matching/matching.module.ts:262 |
| GET /api/v1/me/matches | backend/src/matching/matching.module.ts:252 |
| GET /api/v1/missions/:id/candidates | backend/src/matching/matching.module.ts:255 |
| GET /api/v1/applications/:id | backend/src/missions/missions.module.ts:157 |
| POST /api/v1/applications/:id/rejection | backend/src/missions/missions.module.ts:107 |
| POST /api/v1/applications/:id/selection | backend/src/missions/missions.module.ts:100 |
| POST /api/v1/applications/:id/withdrawal | backend/src/missions/missions.module.ts:93 |
| GET /api/v1/me/applications | backend/src/missions/missions.module.ts:122 |
| GET /api/v1/missions | backend/src/missions/missions.module.ts:131 |
| POST /api/v1/missions | backend/src/missions/missions.module.ts:42 |
| GET /api/v1/missions/:id | backend/src/missions/missions.module.ts:138 |
| PUT /api/v1/missions/:id | backend/src/missions/missions.module.ts:49 |
| GET /api/v1/missions/:id/applications | backend/src/missions/missions.module.ts:179 |
| POST /api/v1/missions/:id/applications | backend/src/missions/missions.module.ts:85 |
| POST /api/v1/missions/:id/assignments | backend/src/missions/missions.module.ts:114 |
| POST /api/v1/missions/:id/cancel | backend/src/missions/missions.module.ts:64 |
| POST /api/v1/missions/:id/complete | backend/src/missions/missions.module.ts:78 |
| POST /api/v1/missions/:id/publish | backend/src/missions/missions.module.ts:57 |
| POST /api/v1/missions/:id/reopen | backend/src/missions/missions.module.ts:71 |
| GET /api/v1/assignments/:id/confirmation | backend/src/organizations/organizations.module.ts:150 |
| PUT /api/v1/me/notification-preferences | backend/src/organizations/organizations.module.ts:137 |
| GET /api/v1/me/organizations | backend/src/organizations/organizations.module.ts:76 |
| PUT /api/v1/organizations/:id | backend/src/organizations/organizations.module.ts:87 |
| GET /api/v1/staffing-requests | backend/src/organizations/organizations.module.ts:131 |
| POST /api/v1/staffing-requests | backend/src/organizations/organizations.module.ts:108 |
| GET /api/v1/profile | backend/src/profiles/profiles.module.ts:277 |
| PUT /api/v1/profile | backend/src/profiles/profiles.module.ts:280 |
| PUT /api/v1/profile/rpps | backend/src/profiles/profiles.module.ts:283 |
| POST /api/v1/profile/rpps/retry | backend/src/profiles/profiles.module.ts:286 |
| GET /api/v1/reference-data/finess | backend/src/reference-data/finess.module.ts:26 |
| GET /api/v1/reference-data/finess/:finess | backend/src/reference-data/finess.module.ts:44 |
| GET /api/v1/reference-data | backend/src/reference-data/reference-data.module.ts:66 |

## 9. Preuves et validations suivantes

Preuves actuelles : docs/proofs/audit-kickoff-2026-09-16/ : tests/builds, http-and-routes.json, scope-and-hashes.json. Les empreintes identifient l’arbre local lu, sans prétendre à un commit propre.

Preuves antérieures : docs/proofs/verification.json, coverage-totals.json, n8n-executions.json, france-travail-rectification.json, ans-fhir-live.json, ans-fhir-positive.json ; frontend docs/proofs/raccordement/checks.json et catalogue-captures.json. Chaque preuve garde sa date et sa portée.

Suite : traiter P1 ; raccorder les API inutilisées ; recette isolée sans repeupler la base utilisateur ; coverage final, exports et restauration ; parcours de soutenance réalisable par toute l’équipe.
