# InfiMatch — état du TODO, relances et 42 scénarios

Vérification du 19 septembre 2026 à partir du document utilisateur `E:\InfiMatch_Todo_Tests_Relances.md`, du code, du bilan consolidé et des preuves datées. Le TODO initial indiquait expressément ne pas avoir accès au dépôt : ses cases ne décrivent donc pas l’état réel actuel. Les propositions qu’il contient ne sont pas automatiquement des exigences du kick-off.

## Versions et signification des états

- **Ancien état déployé vérifié par le parent, avant les lots ci-dessous** : production Git `41706fe97ce6ca51358bb96c44d5a173a4b56d87`, Epitech `76dae9fd92ed11585ee852010b691f7e7e54c86f`, Vercel `dpl_9FQLCk5vBv35BZUJoPsyUfj74diY` READY sur SHA41706fe, santé API répond ok. Ce lot inclut les PDF refondus. Ce contrôle n’est pas une recette exhaustive de chaque écran.
- **Local testé, non publié** : correction profil/agenda après affectation, chronologie API diplômes, BIC facultatif, suivi des emails, récupération autonome, CV enrichi/DOCX, conversions entreprise et centre aide/support. Les vidéos de navigation de l’aide sont également produites localement. Les migrations, déploiements et réglages fournisseur doivent être achevés avant de les annoncer actifs pour tous.
- **Partiel** : fonction présente ou sous-cas testé, mais le scénario complet comporte des exigences supplémentaires ou des preuves manquantes.
- **À développer si retenu** : extension absente, souvent plus large que le minimum du kick-off.

Les nombres de tests ci-dessous sont des campagnes distinctes, pas un cumul de tests uniques. Aucun « 42/42 validés » ni taux global inventé.

## État des 13 points

| Point | Fait ou présent | Reste |
|---|---|---|
| IM-01 n8n | Incident 687 : quota Neon prouvé. Incident 718 : sonde santé HTTP 500, cause non attribuée. Exécutions 719/721/722 réussies avant les nouveaux horaires; reprises et limites renforcées | Observer les nouveaux créneaux et préparer continuité après essai; ne pas attribuer tous les anciens échecs à une seule cause |
| IM-02 démo RPPS | RPPS facultatif retenu par l’utilisateur, état non vérifié | Le bouton et le mode démo isolé ont été explicitement abandonnés par l’utilisateur ; ce n’est plus un développement attendu. Aucun RPPS vide ne devient vérifié. |
| IM-03 diplômes | IDE automatique avec IADE/IBODE et années indépendantes déployés | Contrôle chronologie API ajouté et testé localement; publication et recette navigateur de persistance restantes |
| IM-04 affectations | Transactions, blocage des chevauchements, candidatures concurrentes fermées avec motif, agenda confirmé | Correctif d’édition du profil/agenda après confirmation assouplie testé localement; publier puis vérifier en interface |
| IM-05 France Travail | OAuth2, API offres v2, normalisation, pagination/reprise/dédoublonnage/fraîcheur;7h et15hParis | Réactualiser preuve fournisseur→base→interface et succès effectif des nouveaux créneaux |
| IM-06 JobsPipe | Fournisseur exact confirmé, APIv1, contrôles de quota/reprise, provenance, plan7hParis | Crédit fournisseur reste limité; une autre clé du même compte ne prouve pas un quota neuf; prochaine reprise réelle à observer |
| IM-07 relances | Missions non pourvues:24h après publication,24hminimum entre rappels,3maximum, lot25,100destinataires/heure, anciennesmissions exclues | Pas de catalogue complet24/48h candidatures, J−1 prise de poste, dossiers48h/7j, ni éditeur admin de toutes les règles |
| IM-08 CV | Local testé : PDF/images/DOCX, OCR local, suggestions identité/diplômes/compétences/services et expériences, extraits, revue et application explicites | Reconnaissance déterministe non exhaustive ; identité protégée via demande de correction ; OCR difficile et sauvegarde complète sur appareil réel à compléter ; publier |
| IM-09 RIB | OCR, IBAN, relecture, chiffrement et accès limités; RIB facultatif à l’inscription | BIC désormais facultatif dans code local testé, non déployé; recette caméra mobile réelle restante |
| IM-10 contrat | Confirmation et annulation PDF avec nom complet connu, snapshot et téléchargement privé; nouveau design déployé | Ce ne sont pas des contrats signés; modèle par statut, validation, signature et avenant restent à cadrer/développer |
| IM-11 conversion | Local testé : cohortes publication/candidature/affectation, pourvoi/sélection/annulation/délai, numérateurs et dénominateurs, droits organisation | Pas de suivi consultation→candidature, pas de marqueur complet de tous les anciens jeux fictifs ; historiques incomplets signalés ; publier |
| IM-12 aide/support | Local testé : /aide public, recherche par rôle, accès connexion/client/admin, tickets privés paginés, référence, notifications et réponses contrôlées | Aucun email de support automatique ni pièce jointe ; surveillance humaine effective à organiser ; publier et contrôler accès direct Vercel |
| IM-13 guides/vidéos | 14 guides écrits, 4 captures et 4 vidéos WebM par rôle avec sous-titres et transcription, intégrés à l’aide | Vidéos de navigation du centre d’aide uniquement : elles ne constituent pas des démonstrations complètes de chaque parcours métier ni des preuves de production |

Dernière interface n8n observée : 721 exécutions sur 1 000, essai restant de 10 jours. La tentative de lecture API a reçu HTTP 401; aucun historique plus récent n’est donc vérifié. Ces chiffres décrivent la capture, pas un solde temps réel garanti.

## Notifications : ce qui part réellement

| Déclencheur | Canal et destinataire | État |
|---|---|---|
| Mission compatible | Notification interne au soignant actif/visible/opt-in et strictement admissible selon profil et mobilité | Présent; ne prend pas automatiquement la dernière ville de recherche |
| Mission non pourvue | Notification interne aux membres actifs établissement/agence concernés | Présent; pas conditionné à l’existence d’un candidat compatible, pas un email national |
| Affectation confirmée | PDF et email SMTP2GO individuels au soignant et aux membres actifs concernés | Présent; ACCEPTÉ/SENT ne garantit ni boîte de réception ni lecture |
| Annulation | PDF d’annulation et emails SMTP2GO aux parties concernées | Présent; annulation candidat libère et peut rouvrir mission |
| Livraison/rejet/rebond | Callback SMTP2GO et journal privé/client/admin | Implémenté/testé localement; activation fournisseur et déploiement à vérifier |
| Mot de passe oublié | Email lien unique valable 30 min, demande limitée, réponse générique | Implémenté/testé localement; repli assistance si SMTP absent, pas encore annoncé actif partout |
| Autres événements du catalogue | Notifications internes et Discord selon configuration/préférences | Pas de conversion automatique de tous les événements en emails |

Le document proposait Resend : choix abandonné par l’utilisateur, fournisseur retenu SMTP2GO. Il proposait un passage toutes les 5 min : ce n’est pas la fréquence constatée. La reprise générale est toutes les 30 min; les imports ont désormais leurs horaires séparés. Une exécution peut faire plusieurs appels paginés; fréquence d’import ne signifie pas fréquence de mise à jour fournisseur.

Le webhook de livraison doit utiliser **un endpoint JSON** `/api/v1/internal/automation/smtp2go/webhook`, authentifié par **Authorization: Bearer <SMTP2GO_WEBHOOK_SECRET>**. Ce n’est ni `X-InfiMatch-Token`, ni la clé API d’envoi. Transmettre le champ de corrélation `X-InfiMatch-Email-ID`; ne pas enregistrer les secrets ni activer le suivi des ouvertures/clics. L’état DELIVERED indique l’acceptation par le serveur destinataire, pas lecture ou placement garanti en boîte principale.

## Les délais proposés dans le TODO

- Candidature sans décision24h/48h : non livré comme règle dédiée.
- Confirmation attendue du soignant24h : non livré comme seconde étape automatique; une candidature volontaire et consentement à jour sont distingués de l’affectation recruteur.
- Mission confirmée J−1 : non livré.
- Dossier incomplet48h puis7jours : non livré comme emails planifiés.
- Reprise technique1/5/15min : pas la formule exactement utilisée. Les reprises présentes sont bornées et temporisées; les envois ambigus restent UNCERTAIN, sans réémission aveugle.
- Paramétrage admin par règle, prochaine relance/suspension/aperçu/testadresse : supervision partielle, pas un éditeur complet de règles et échéances.

## Preuves récentes disponibles

- Lot 1 : 18 tests unitaires ciblés et 23 intégrations PostgreSQL isolées réussis (7profil,2candidaturewarnings,6suppressionancienslots,8garde-fous). `audits/lot1-2026-09-19/`.
- PDF/email : 274 tests unitaires au moment du lot PDF et 6 intégrations; rendu PDF une page contrôlé par le parent. `audits/pdf-2026-09-19/`. Cela ne prouve pas une livraison d’email réelle.
- BIC facultatif : 4 tests API/contrôleur et 2 tests frontend réussis; typagefrontend passe. Pas de nouveau test caméra physique.
- Livraison emails : 4 tests unitaires et 5 intégrations PostgreSQL réussis selon l’agent responsable; local uniquement. `audits/2026-09-19-email-delivery/`.
- Récupération : 4 tests unitaires, 8 intégrations et recette navigateur avec transport email simulé réussis. Preuves dans `audits/2026-09-19-recovery/`. Ce test navigateur ne prouve pas un email réel livré en production.
- Sauvegarde/restauration : restauration réelle 2 comptes/3 092 missions/0 document ; PDF synthétique déchiffré et altération refusée séparément. Tâche Windows quotidienne 02h installée, premier lancement code 0 ; rotation 30 jours testée. Dépend du poste allumé/session/Docker/Vault, aucune copie hors site. Voir `SAUVEGARDES_OPERATIONNELLES_2026-09-19.md`. Aucun ancien PDF réel n’est réputé restauré avec une base contenant zéro document.
- CV enrichi : 17 tests parseur backend, 6 tests DOCX/revue et recette mobile locale, API simulée (`audits/2026-09-19-cv-review/`).
- Aide/support : 2 unitaires backend + 5 intégrations PostgreSQL, 2 tests de recherche/rôles, test route compilée et recette navigateur 320/768/1440 ; 4 vidéos lisibles avec sous-titres. `audits/2026-09-19-support/`.
- Conversions : 2 unitaires + 6 intégrations SQL, 6 contrôles navigateur simulés, limites historiques documentées dans `CONVERSIONS_ENTREPRISE_2026-09-19.md`.

Les anciens 271 tests backend/19 frontend et79,38% de couverture sont des preuves antérieures; ils ne sont pas le total ou la couverture de la nouvelle livraison.

## Matrice des 42 scénarios

Les chemins backend/frontend indiquent les tests ou le code du dépôt. Un test présent mais non rejoué est signalé. «Vérifié ciblé» n’implique pas une recette navigateur ni production.

| ID | Scénario du document | État | Preuve disponible | Reste/limite |
|---|---|---|---|---|
| TEST-01 | Inscription IDE seule | Partiel | frontend/scripts/test-registration-diplomas.mjs; dernier test frontend19/19 | Règles testées; inscription IDE complète dans navigateur à rejouer. |
| TEST-02 | Sélection IADE puis enregistrement et rechargement | Partiel | test-registration-diplomas.mjs; backend/test/unit/profile-details.spec.ts | IDE automatique et années distinctes; persistance après reconnexion à filmer. |
| TEST-03 | Sélection IBODE puis IADE + IBODE | Partiel | test-registration-diplomas.mjs | IADE/IBODE/IDE couverts en unitaire; scénario navigateur triple diplôme à rejouer. |
| TEST-04 | Date future, date manquante, retrait d’une spécialité | Vérifié ciblé, correction locale | profile-details.spec.ts; profile-after-assignment.spec.ts; 18unitaires et 23 intégrations lot1 | Années futures, distinctes et chronologie contrôlées; pas une recette complète de tous écrans. |
| TEST-05 | Inscription démo sans RPPS réel | Hors périmètre après décision utilisateur | RPPS facultatif conservé ; mode démo abandonné | Ne pas confondre inscription non vérifiée et compte de démonstration isolé. |
| TEST-06 | Tentative d’activer le mode démo par requête sur un compte ordinaire | Hors périmètre après décision utilisateur | Aucun mode démo ajouté | Les vérifications professionnelles restent indépendantes du RPPS facultatif. |
| TEST-07 | RPPS absent, non concordant et API indisponible | Partiel | backend/test/unit/rpps.spec.ts; application-warnings.spec.ts2/2 | États et blocages testés; panne réelle ANS et parcours provisoire à capturer. |
| TEST-08 | Affectation puis consultation des recommandations | Partiel | mission-guardrails.spec.ts8/8; matching.spec.ts unitaire | Candidatures chevauchantes fermées; recommandations et visibilité autre candidat à rejouer en interface. |
| TEST-09 | Deux attributions simultanées pour le même soignant sur des horaires incompatibles | Vérifié ciblé | mission-guardrails.spec.ts8/8, cas two concurrent assignments | Une affectation réussit, candidature concurrente devient indisponible; PostgreSQL isolé. |
| TEST-10 | Deux candidats acceptés simultanément pour un poste unique | À rejouer | backend/test/integration/journey.spec.ts:full internal journey and concurrency | Test présent mais cette campagne complète non relancée. |
| TEST-11 | Chevauchement partiel et mission traversant minuit | Partiel | matching.spec.ts; mission-guardrails.spec.ts; assignment-profile.spec.ts | Chevauchement testé; compléter parcours nuit dans interface. |
| TEST-12 | Créneaux adjacents, changement d’heure, missions en fuseaux différents | Partiel | availability.spec.ts; assignment-assessment.spec.ts; mission-timezone.spec.ts | Adjacence/DST et instants couverts; repos et trajet ne sont pas un moteur réglementaire livré. |
| TEST-13 | Demande comprenant plusieurs vacations séparées | Non couvert comme demande groupée | Une mission correspond à un poste continu | Utiliser plusieurs missions pour vacations distinctes; pas de demande multi-vacations indépendante prouvée. |
| TEST-14 | Annulation après affectation et ouverture d’un ancien lien de proposition | Vérifié ciblé | mission-guardrails.spec.ts; mission-mail.spec.ts; profile-after-assignment.spec.ts | Annulation libère créneau, ancienne candidature non réactivée sans consentement; vérifier ancien lien en navigateur. |
| TEST-15 | Import France Travail et comparaison JSON/base/interface | Partiel | external-collection.spec.ts; docs/quality/IMPORTS_SOBRIETE_2026-09-19.md | Reprise/normalisation testées; nouvelle preuve fournisseur réel→base→interface à collecter. |
| TEST-16 | Même comparaison pour JobsPipe | Partiel | backend/src/public-data/jobspipe.ts et tests JobsPipe | API dédiée et quota gérés; nouveau succès réel conditionné au crédit fournisseur. |
| TEST-17 | Pagination, réimport et même identifiant dans deux sources | Partiel | external-collection.spec.ts; offer-deduplication.spec.ts; anciens logs import | Tests présents et unitaires antérieurs; refaire campagne finale de pagination intersources. |
| TEST-18 | Réponses vides, JSON invalide ou partiel, annonces expirées | Partiel | offer-freshness.spec.ts; offers.spec.ts; parser unit tests | Cas de données manquantes couverts; rapprocher chaque erreur réseau des captures admin. |
| TEST-19 | Authentification expirée, limitation de débit, panne et délai dépassé | Partiel | cloud-jobs.spec.ts; jobspipe-credits.spec.ts; logs n8n19septembre | Quota/reprise bornés; réussite des nouveaux créneaux réels reste à observer. |
| TEST-20 | Mesure des appels planifiés et navigation répétée sur les offres | Partiel opérationnel | preuves eco-imports19septembre; n8n cron7h/15hFT,7hJP | Anciennes tâches Windows neutralisées; mesure quotidienne réelle et navigation répétée à collecter. |
| TEST-21 | CV PDF texte et DOCX avec diplômes et expériences | Vérifié ciblé local | Parseur 17 tests ; DOCX/revue 6 tests ; recette navigateur locale DOCX | Extraction native DOCX bornée et CRC, propositions séparées ; API de la recette navigateur simulée, sauvegarde serveur continue non démontrée. |
| TEST-22 | CV scanné, flou ou contenant un intitulé ambigu | Partiel local | Parseur enrichi : ambiguïtés/négations/année future ou contradictoire ; OCR local existant | Aucune qualification certifiée ni date fabriquée ; scans physiques difficiles à rejouer. |
| TEST-23 | Réimport d’un CV sur un profil déjà complété | Vérifié ciblé local | test-cv-review.mjs 6/6 ; audits/2026-09-19-cv-review/result.json | Identité protégée, années IDE/IADE indépendantes, choix explicites ; recette à 390px avec API simulée, pas preuve de persistance en production. |
| TEST-24 | RIB lisible puis IBAN mal lu ou invalide | Partiel; BIC corrigé local | bank-optional-bic.spec.ts4/4; test-bank-fields.mjs2/2 | IBAN contrôlé, BIC facultatif; OCR/caméra réel sur appareil à vérifier. |
| TEST-25 | Nouveau scan sur un RIB déjà confirmé | À rejouer en navigateur | frontend/scripts/test-bank-ocr.mjs | Pas de sauvegarde OCR sans validation; script existant non réexécuté dans le lot BIC. |
| TEST-26 | Fichier trop gros, format refusé et accès à un document d’un autre compte | Partiel | mission-mail.spec.ts6/6 droits PDF; journey.spec.ts fichiersprivés | Accès croisés PDF vérifiés; ensemble formats/tailles/RIB à rejouer dans suite journey. |
| TEST-27 | Génération de contrat pour agence puis établissement direct | Non livré: contrat | PDF confirmation et annulation seulement | Les modèles de contrat agence/direct et signature nécessitent cadrage propre. |
| TEST-28 | Contrat avec donnée indispensable absente | Non livré: contrat | Générateur PDF confirmation n’est pas un contrat prêt à signer | Définir les champs contractuels requis avant implémentation. |
| TEST-29 | Modification après validation ou signature, téléchargement par un tiers | Partiel pour confirmation; contrat absent | mission-mail.spec.ts6/6 snapshot et accès croisés | Original annulation conservé; signature et avenants contractuels absents. |
| TEST-30 | Chaque événement email du catalogue | Partiel | mission-mail.spec.ts6/6 | Emails confirmation/annulation vérifiés avec transport simulé; les autres événements sont internes/Discord, pas tous emails. |
| TEST-31 | Réponse reçue juste avant une relance | Non livré pour candidatures sans réponse | Relance disponible: mission ouverte non pourvue | Pas de relance par prochaine décision attendue ou échéance de réponse. |
| TEST-32 | Annulation, mission attribuée ailleurs ou compte supprimé avant rappel | Partiel | mission-guardrails.spec.ts8/8; mission-mail.spec.ts6/6 | Stop missions pourvues/commencées/annulées et destinataire invalide; catalogue complet des rappels non livré. |
| TEST-33 | Changement d’heure de la mission après programmation | Partiel | missions.service.ts versions/consentement; reminders.ts compteur à vie | Relance non pourvue utilise publication/délai; pas de rappel J−1 recalculé puisqu’absent. |
| TEST-34 | Deux workers ou deux exécutions n8n traitent la même relance | Vérifié ciblé | mission-guardrails.spec.ts8/8 workers concurrents | Verrou DB, budgets et déduplication; doublon réel n8n à surveiller sans réémission globale. |
| TEST-35 | Délai dépassé après acceptation possible par le prestataire d’email | Vérifié ciblé; suivi local | mission-mail.spec.ts6/6; nouvelle intégration delivery5/5 annoncée par agent | Timeout→UNCERTAIN sans renvoi; callback authentifié peut résoudre l’incertitude. Transport simulé. |
| TEST-36 | Limite de tentatives atteinte, adresse rejetée et retour de livraison | Partiel local testé, non publié | email-delivery.module.ts; email-delivery integration5/5 | Journal accepté/livré/rejeté et callback doublon/horsordre; config fournisseur et email réel à valider après déploiement. |
| TEST-37 | Aide et support sur mobile, clavier seul et écran de connexion | Partiel local vérifié | Centre /aide, liens connexion/client/admin ; recette 320/768/1440 sans débordement ; test route compilée noindex/no-store | Contrôles clavier/RGAA exhaustifs et audit humain non réalisés ; accès direct en production à vérifier après livraison. |
| TEST-38 | Guide vidéo et capture sur une page modifiée | Livré ciblé local | 4 vidéos/captures par rôle, VTT français et transcription ; décodage/lecture des 4 vidéos testé | Vidéos de navigation de l’aide, pas démonstrations complètes de tous les actes métier ; revoir lors de changement des pages. |
| TEST-39 | Demande au support avec pièce jointe éventuelle | Vérifié ciblé local, sans pièces jointes | support.spec.ts : 2 unitaires et 5 intégrations PostgreSQL ; recette navigateur création/référence/texte script inerte | Propriété, rôles, réauthentification, idempotence/concurrence, quotas et effacement à la clôture ; réponse email absente, suivi interne livré. |
| TEST-40 | Conversion sur une cohorte connue | Vérifié ciblé local | 2 unitaires, 6 intégrations PostgreSQL ; conversions/browser.json 6 contrôles | Pourvoi 2/4=50 %, sélection 3/4=75 %, annulation mission 1/4=25 % ; indicateurs actuels de cohortes datées, pas photographie historique. |
| TEST-41 | Conversion avec zéro consultation, comptes démo, clic externe et utilisateur d’une autre entreprise | Partiel local vérifié | conversions : zéro→Non calculable, accès croisés refusés, externes exclus, UUID fictifs connus exclus | Aucune consultation collectée ; jeux fictifs sans marqueur non reconnaissables automatiquement ; manque de dates/audit explicitement signalé. |
| TEST-42 | Parcours complet inscription → candidature → avis → affectation → contrat → rappel → annulation | Partiel ; impossible de clore tel que rédigé | Suites locales mission/profil/PDF/mail et nouvelles conversions/support | Contrat/signature et catalogue étendu de relances absents ; recette continue finale distincte des tests ciblés nécessaire. |

## Ordre concret pour fermer les points

1. Publier uniquement les lots locaux validés avec leurs migrations, vérifier les SHA des deuxGit et les déploiements READY.
2. Activer le callbackSMTP2GO sécurisé puis vérifier un email autorisé de confirmation et un d’annulation, sans renvoyer les anciennes notifications.
3. Rejouer le parcours continu : inscription, diplômes, recherche/matching, candidatures simultanées, confirmation, modification profil hors créneau, agenda, PDF, email, annulation.
4. Rejouer `journey.spec.ts` et les scripts navigateurCV/RIB; actualiser une seule preuve finale de couverture, sans additionner les campagnes.
5. Terminer contrôle des créneauxn8n, sauvegarde récurrente/restauration documentaire quand un document existe, mentions/accessibilité et preuves de soutenance.
6. Le DOCX, les indicateurs, les tickets et les guides sont maintenant implémentés localement ; le mode démo est abandonné. Contrat/signature, relances étendues et validations humaines restent distincts. Le PDF de confirmation répond à l’exemple d’automatisation du kick-off, sans devenir un contrat signé.

Cette mise à jour intègre les lots de développement autorisés après le bilan initial. Les preuves locales, tests simulés, observations fournisseur et états de production restent séparés. La campagne globale finale et les nouveaux SHA de déploiement doivent être consignés par la livraison ; aucun 42/42 n’est revendiqué. Les essais humains, la politique juridique et la supervision réelle ne sont pas remplacés par ces tests automatisés.
