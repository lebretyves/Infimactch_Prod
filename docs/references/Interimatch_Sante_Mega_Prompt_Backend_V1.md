# Interimatch Santé Méga prompt backend V1

Version consolidée du 14 septembre 2026 — Décisions produit confirmées dans les échanges ; réalisation et accès API à vérifier — Projet Epitech D-WEB-901

Ce document constitue le prompt complet à transmettre à l’agent de développement backend. Il remplace les instructions de périmètre de l’ancien méga-prompt. Il décrit le travail à réaliser ; il ne constitue pas une preuve que le logiciel existe, fonctionne ou respecte déjà toutes les exigences.

## 1 Mission et références à respecter

Tu interviens comme développeur backend sur Interimatch Santé, une plateforme de mise en relation entre professionnels infirmiers salariés, établissements et agences de travail temporaire. Construis une V1 démontrable dans le cadre du projet de 11 jours, avec une architecture permettant d’ajouter les versions suivantes progressivement.

Proposition de valeur de travail : « Aider les établissements et les agences à pourvoir leurs missions infirmières en proposant aux professionnels des missions compatibles avec leurs qualifications, leurs compétences, leurs disponibilités et leur mobilité. » Elle doit être confrontée à l’étude de marché du groupe, sans inventer de chiffres ni de gains démontrés.

Applique les sources dans cet ordre :

1. Le sujet fourni D-WEB-901-project.pdf pour les obligations pédagogiques, techniques et les livrables.
2. Les décisions explicites de l’utilisateur dans les échanges, notamment nouvelle numérotation, trois workflows F12, RPPS bloquant/en attente et report des références ; les validations métier documentées de l’équipe complètent ces décisions.
3. Le catalogue courant Interimatch_Sante_Catalogue_Complet_Fonctionnalites.docx, références F01 à F26 et F02 bis. Le PDF du catalogue conserve une ancienne numérotation et sert d’archive ; il ne rétablit pas les anciens périmètres.
4. Ce prompt et Interimatch_Sante_Architecture_Backend_V1.md synchronisés, avec docs/DECISIONS_V1.md pour la traçabilité des arbitrages.
5. L’ancien méga-prompt et la note complémentaire de sécurité pour les précisions encore compatibles, sans restaurer leurs anciennes priorités.

Si une contradiction nouvelle empêche de respecter le sujet, expose le passage concerné et une solution concrète avant de modifier le périmètre. Ne retire jamais une obligation du sujet pour faciliter le développement. Ne transforme pas un exemple du sujet en obligation supplémentaire.

Le sujet impose notamment deux familles de comptes, deux bases réellement utilisées, au moins deux automatisations nocode, une source publique exploitée dans le produit, des tests unitaires et fonctionnels, une couverture générée et livrée, une bibliothèque CLI, ainsi que le frontend et les livrables collectifs. Un backend seul ne remplit pas l’ensemble du sujet.

Le périmètre est celui de l’intérim infirmier en France. N’ajoute pas de données de patients, de DPI, de fonctions cliniques, de facturation IDEL, de fonctionnement suisse ni de fonctionnalités CHARLES. Utilise des personnes, RIB et justificatifs fictifs pour la démonstration.

## 2 Reprise du travail et méthode d’exécution

Commence par lire docs/REPRISE_BACKEND_V1.md et les instructions applicables au dépôt. Si cette note n’existe pas, inspecte l’existant puis crée-la ; son absence ne bloque pas le démarrage. Inspecte dépendances, migrations, modules et tests. Identifie le commit et les modifications locales si Git existe ; sinon note « dépôt Git absent » et conserve les documents. Préserve le travail des autres membres.

Réutilise l’analyse documentaire déjà faite lorsque les fichiers sources sont identiques. Compare leur nom, version et empreinte SHA-256 à la note. Relis uniquement les parties modifiées et leurs dépendances. Une note ancienne ne remplace jamais l’inspection du code actuel.

Classe chaque élément dans l’un de ces états : prévu, présent mais non vérifié, testé avec preuve, bloqué ou hors V1. Ne déclare pas une fonctionnalité terminée parce qu’un fichier ou une route porte son nom. Produis ensuite un plan court, ordonné par dépendances, avec estimation par module et responsabilités backend, frontend ou collectives.

Conserve le monolithe modulaire NestJS avec adaptateur Express, Node.js 24 LTS et TypeScript ; PostgreSQL avec PostGIS et btree_gist ; TypeORM et migrations explicites ; MongoDB via Mongoose ; n8n ; frontend Next.js/TypeScript. Sessions serveur PostgreSQL, Argon2id, REST/OpenAPI, CLI Commander et Docker Compose constituent le socle retenu. Ne remplace pas une bibliothèque existante cohérente sans raison démontrée. Valide la compatibilité des versions maintenues, fige le lockfile et les images ; synchronize: false. Aucun microservice, Redis ou moteur supplémentaire sans besoin mesuré.

Avance par parcours complets : inscription, profil, mission, recherche, matching, candidature, affectation, notifications, données publiques et documents. Après chaque étape, vérifie le comportement et les droits concernés, puis mets la note de reprise à jour. Ne recrée pas tout le projet s’il existe déjà.

## 3 Périmètre fonctionnel V1

Les références suivantes correspondent au catalogue actuel. F04 et F16 désignent deux faces du même moteur ; leur réalisation ne doit pas être comptée deux fois.

| Référence | Travail V1 demandé | Critère de réception |
| --- | --- | --- |
| F01 | Deux entrées Infirmier et Entreprise ; entreprise de type établissement ou agence ; authentification classique. | Inscription et permissions distinctes, connexion et déconnexion sécurisées. |
| F02 | Profil infirmier, diplômes, compétences, expérience par service, disponibilités, mobilité et RIB fictif chiffré. | Données modifiables par leur titulaire ; champs obligatoires explicites ; RIB protégé et masqué. |
| F02 bis | Profil établissement, FINESS obligatoire, nom, adresse, référent et acceptation des CGU. | FINESS enregistré comme identifiant texte ; agence distinguée d’un établissement. |
| F03 | Données du tableau de bord infirmier : propositions, favoris, disponibilités et accès au profil. | API utilisable par les écrans de l’équipe, avec états vides et erreurs. |
| F04 + F16 | Matching déterministe hiérarchique et explicable. | Qualifications et prérequis bloquants, score documenté, aucun placement automatique. |
| F05 | Recherche manuelle multi-types de missions, filtres métier, dates, horaires et distance. | Un IADE ou IBODE recherchant une mission IDE retrouve tous les filtres IDE. |
| F06 | Ajouter, consulter et supprimer des offres favorites et des établissements favoris. | Favoris privés, sans doublons, avec traitement d’une offre expirée. |
| F07 | Postuler, suivre et retirer une candidature ; sélectionner ou refuser côté entreprise selon les droits. | Candidature interne persistée ; transitions tracées ; candidature externe distinguée. |
| F08 | Intervalles de disponibilité et d’indisponibilité ; mobilité. | Contrôle des dates et prise en compte des intervalles complets. |
| F09 | Historique et calendrier des missions affectées, à venir, en cours, annulées et passées. | État métier et position dans le temps distingués, historique conservé. |
| F12 | Trois workflows n8n : notification de correspondance, génération d’une confirmation de mission depuis un modèle et relance d’une mission non pourvue. | Trois exécutions réelles démontrées, confirmation téléchargeable par les participants habilités et exports sans secrets. |
| F15 | Acquisition d’offres par API, nettoyage, stockage et affichage dans la plateforme. | Source réelle, provenance visible, import rejouable et fonctionnement des offres externes explicite. |
| F17 | Création, modification, publication et clôture des missions par l’agence. | Champs du sujet présents ; permissions et transitions contrôlées. |
| F18 | Consultation du RPPS via l’API Annuaire Santé à la saisie ou modification du numéro dans le profil. | Numéro retrouvé : condition RPPS satisfaite ; non retrouvé : blocage ; service indisponible : vérification en attente. Statut serveur, résultat lié au numéro courant et tests des trois cas. |
| F19 | Tableau de bord agence, candidatures, propositions, sélection, refus et affectation. | Passage à « pourvue » après validation humaine réussie dans une transaction. |
| F20 | Utilisation visible des données publiques nettoyées. | Parcours réel utilisant les données, avec exemple avant/après nettoyage. |
| F22 | Dépôt et consultation autorisée d’un justificatif fictif chiffré. | Contrôles de fichier, stockage privé, déchiffrement autorisé et testé. |

Clarifications validées : les recherches enregistrées ne sont pas développées en V1 malgré l’intitulé général de F06. Pour F12, l’équipe a explicitement retenu les trois automatisations : correspondance, confirmation de mission et relance. La confirmation est générée après validation de l’affectation ; elle ne constitue pas un contrat signé et ne développe pas la gestion complète des contrats F24 prévue en V3. F15 signifie importer puis publier dans Interimatch, et non publier chez un opérateur tiers. Le minimum de rattachement et d’isolation entre organisations est indispensable dès la V1 ; il ne correspond pas à toute la gestion avancée F21.

## 4 Versions suivantes et architecture conservée

| Version | Fonctions conservées au catalogue, sans implémentation active en V1 |
| --- | --- |
| V2 | F02 : attestation et pièces d’expérience, plusieurs CV. F08 : alerte utilisateur de conflit et duplication des disponibilités. F10 : préparation de mission et itinéraire. F14 : import manuel CSV. F16 : suggestions de profils proches mais différents. F22 : catégories et versions documentaires complètes. F23 : signature électronique par prestataire. F25 : relevés d’heures. |
| V3 | F08 : export vers calendrier personnel. F11 : retards, absences et congés. F13 : FAQ, centre d’aide et contenus éditoriaux. F21 : administration avancée des organisations et du multisite. F24 : contrats de mission et de mise à disposition. F26 : réception et consultation des bulletins de paie. |
| V4 | F13 : chatbot d’aide. F26 : fonctions RH complètes. |

Décision de périmètre : l’attestation sur l’honneur reste en F02 V2. Les références professionnelles sont reportées hors V1, envisagées en V2 ; leur contenu et leur méthode seront définis ultérieurement. F18 conserve le RPPS en V1 par consultation de l’API Annuaire Santé : non retrouvé bloquant, indisponibilité en attente. Aucune étape de validation manuelle par l’agence n’est ajoutée à ce contrôle. Les recherches enregistrées restent hors V1 sans leur attribuer une version non décidée.

Prépare l’évolution par des identifiants stables, des modules séparés, des contrats d’API explicites, des événements métier et des migrations compatibles. Les contrats et relevés d’heures futurs pourront référencer les missions, affectations, personnes et organisations existantes. Ne crée pas leurs écrans, endpoints publics ou traitements factices en V1.

« Sans changer d’architecture » signifie conserver les fondations et ajouter des modules ou migrations, pas promettre qu’aucun code ni schéma ne changera. La version produit V2 ne nécessite pas automatiquement une API /api/v2. Préserve /api/v1 tant que les contrats restent compatibles ; documente toute rupture et sa migration.

## 5 Comptes organisations et permissions

Il existe deux familles de comptes : NURSE et ENTERPRISE. ESTABLISHMENT et AGENCY sont des types d’organisation côté entreprise, pas une troisième et une quatrième famille de comptes. Les diplômes IDE, IADE et IBODE sont des qualifications professionnelles, jamais des rôles techniques d’autorisation.

| Acteur | Actions autorisées en V1 | Limites |
| --- | --- | --- |
| Infirmier | Gérer son profil, ses pièces, ses disponibilités, ses favoris et ses candidatures ; consulter ses missions et notifications. | Aucun accès aux autres profils, pièces ou candidatures. |
| Établissement | Décrire un besoin, consulter les missions et candidatures qui le concernent ; proposer une sélection ou un refus selon le parcours défini. | Ne publie pas au nom d’une agence et ne valide pas l’affectation finale. |
| Agence | Créer/publier les missions de son périmètre, vérifier les dossiers autorisés, sélectionner/refuser et valider une affectation. | Aucun accès global aux autres agences ni aux RIB par simple appartenance entreprise. |
| Service n8n | Appeler les actions nécessaires aux trois workflows, dont demander la génération de confirmation au backend. | Aucun accès aux mots de passe, RIB, justificatifs ni mutation libre des missions ; génération et stockage documentaire restent dans le backend. |

Le rattachement établissement–agence est explicite et contrôlé. Un FINESS ou un SIRET renseigné par un utilisateur ne lui donne pas accès à une organisation déjà existante. L’inscription crée un espace isolé ; la liaison de démonstration et les habilitations sensibles sont préparées par une procédure de bootstrap documentée, sans inscription publique comme administrateur.

Prévois une organisation, des membres et une liaison autorisée avec l’établissement nécessaire au scénario. L’administration multisite avancée attend F21. Pour une agence, recueille une identité d’entreprise adaptée ; FINESS n’est obligatoire que pour le profil établissement. Le contrôle automatique de SIRET n’est pas ajouté au périmètre.

Les propositions de candidats côté agence exposent seulement les informations professionnelles nécessaires, selon les préférences de visibilité du professionnel. Les coordonnées détaillées et pièces restent liées à une candidature, une affectation ou une autorisation explicite pertinente. Consulter des candidats proposés ne donne jamais un annuaire illimité de données personnelles.

Chaque liste, détail, export, pièce et action contrôle les droits côté serveur. Ne fais confiance ni à un organizationId envoyé par le client, ni à un bouton masqué. Préfère une réponse ne révélant pas l’existence d’une ressource privée hors périmètre.

## 6 Qualifications compétences et référentiels

Un profil peut détenir plusieurs qualifications. Stocke les diplômes séparément, avec leur état déclaré ou vérifié. Le socle IDE et les spécialisations doivent être représentés sans permettre au client de s’attribuer un statut de vérification.

| Qualifications professionnelles du profil | Missions recherchables et éligibles en qualification |
| --- | --- |
| IDE | IDE |
| IDE et IADE | IDE et IADE |
| IDE et IBODE | IDE et IBODE |
| IDE, IADE et IBODE | IDE, IADE et IBODE |

La qualification ouvre une catégorie de missions, mais ne prouve pas les compétences ou l’expérience demandées. Aucune équivalence IADE–IBODE ne doit être déduite. Si un profil importé mentionne une spécialisation sans information fiable sur le socle, fais compléter ou vérifier le dossier plutôt que fabriquer une preuve de diplôme.

Pour les missions IADE et IBODE, garde l’interface simple : population adulte, pédiatrique ou mixte ; bloc polyvalent ou spécialisé. Si le bloc est spécialisé, une spécialité est renseignée. Un bloc polyvalent n’impose pas une spécialité unique. La population MIXTE exige des compétences adultes et pédiatriques pour le matching, tandis que le filtre de recherche « mixte » désigne une propriété exacte de la mission.

Spécialités de bloc retenues : orthopédie-traumatologie, digestif, urologie, gynécologie-obstétrique, ORL, ophtalmologie, neurochirurgie, cardiaque, thoracique, vasculaire, plastique et maxillo-faciale. Utilise des codes stables et des libellés français, pas des comparaisons sur du texte libre.

Pour les missions IDE, conserve le référentiel ci-dessous. Ces services sont des catégories de recherche ; ils ne constituent pas une autorisation automatique d’exercice sans les compétences exigées.

| Famille IDE | Services et domaines proposés |
| --- | --- |
| Médecine | Cardiologie, pneumologie, neurologie, gastro-entérologie, néphrologie, endocrinologie, infectiologie, dermatologie, rhumatologie. |
| Chirurgie | Chirurgie et spécialités chirurgicales précisées par l’établissement. |
| Soins aigus | Urgences, réanimation, soins intensifs, SSPI. |
| Enfant et maternité | Pédiatrie, néonatologie, gynécologie, maternité. |
| Cancer et traitements | Oncologie, hématologie, dialyse. |
| Santé mentale | Psychiatrie, pédopsychiatrie, addictologie. |
| Personnes âgées | Gériatrie, soins de longue durée, EHPAD. |
| Réadaptation | Soins médicaux et de réadaptation — SMR. |
| Palliatif et douleur | Soins palliatifs, douleur. |
| Ambulatoire | Consultations, hôpital de jour, chirurgie ambulatoire. |
| Technique | Endoscopie, explorations, secteurs interventionnels. |
| Handicap | MAS, FAM. |
| Domicile salarié | Hospitalisation à domicile et soins à domicile salariés. |
| Prévention | Santé au travail, prévention, centres de santé. |
| Transversal | Équipe de suppléance ; autre service nommé par l’établissement. |

Associe à chaque mission les compétences obligatoires et les compétences souhaitées. Enregistre l’expérience par service avec ses périodes, sans compter deux fois des périodes qui se chevauchent. Si un prérequis d’expérience est obligatoire, son absence bloque l’éligibilité ; le bonus d’expérience du score ne le remplace pas.

## 7 Architecture et données

Utilise un monolithe NestJS modulaire. PostgreSQL est l’autorité pour les utilisateurs, missions, candidatures, affectations, permissions et événements à émettre. PostGIS étend PostgreSQL pour les distances. MongoDB sert réellement à écrire puis relire les résultats explicables du matching ; ce n’est pas un simple conteneur démarré pour satisfaire le sujet.

Modules recommandés, à adapter aux noms déjà présents : Auth, Organizations, Profiles, Facilities, Missions, Search, Favorites, Applications, Matching, Assignments, Documents, MissionConfirmations, Notifications, PublicData et Automation. Évite de déplacer toute la logique métier dans les contrôleurs ou dans un module Common.

| Ensemble | Entités principales et contraintes |
| --- | --- |
| Identité | User, Session, Organization, Membership, OrganizationLink ; email normalisé unique ; rôle contrôlé. |
| Profil | NurseProfile, ProfileQualification, Skill, ProfileSkill, Experience, Verification ; Qualifications multiples et preuves séparées. |
| Temps et mobilité | Availability, Unavailability, MobilityPreference ; intervalles cohérents ; point de départ privé. |
| Établissement | Facility, FacilityService ; FINESS texte et provenance ; lien d’organisation contrôlé. |
| Missions | StaffingRequest, Mission, MissionSkill ; version métier, statut, un poste et un intervalle continu par mission V1. |
| Candidatures | Application, Assignment ; candidature liée à la version de mission ; affectation active unique par mission. |
| Favoris | FavoriteListing, FavoriteFacility ; unicité par propriétaire et cible ; cible interne/externe explicite. |
| Documents | Document, BankDetails ; propriétaire, clé/version et droits ; contenu sensible chiffré. |
| Données publiques | DataSource, ImportRun, ExternalOffer ; identifiant fournisseur unique, source et date de synchronisation. |
| Confirmations | MissionConfirmation ; affectation, version de mission, version de modèle, référence Document et statut ; unicité par affectation/version de mission/version de modèle. |
| Automatisation | OutboxEvent, AutomationReceipt, Notification, NotificationPreference ; déduplication et retries bornés. |
| Traçabilité | AuditEvent SQL ; MatchingRun MongoDB avec score, explications, version et expiration. |

Chaque mission comporte au minimum intitulé, qualification, service, éventuelle spécialité, compétences, établissement, lieu réel, dates et horaires, rémunération et statut. Enregistre les montants en centimes ou décimal exact, avec devise, unité et caractère brut explicités. Les identifiants FINESS, RPPS et codes postaux restent des chaînes, avec contrôles de forme adaptés.

Utilise des clés étrangères, index utiles, contraintes d’unicité et migrations versionnées. Les données de démonstration sont reproductibles et marquées fictives. Le seed ne s’exécute pas par défaut sur une base de production.

Pour MongoDB, stocke des identifiants techniques et les explications nécessaires, pas de copie complète de profil, RIB ou justificatif. Proposition de rétention de démonstration : 30 jours, configurable et documentée. L’index TTL est complété par un filtre expiresAt lors des lectures, car la suppression TTL n’est pas immédiate. Une purge de données personnelles couvre aussi ces traces.

La lecture d’une explication vérifie le propriétaire, la version du profil et de la mission ainsi que la fraîcheur du calcul. Un résultat périmé est recalculé ou signalé comme tel. La décision d’affecter ne dépend jamais d’un ancien document MongoDB : elle revérifie les données SQL courantes. Si MongoDB est indisponible, annonce l’indisponibilité de l’historique des explications et trace un échec contrôlé ; ne renvoie pas une fausse preuve d’enregistrement. Le fonctionnement dégradé éventuel du calcul doit être explicite et testé.

## 8 Temps mobilité et recherche F05

Stocke les instants en UTC avec un fuseau métier explicite, Europe/Paris pour le scénario. Manipule des intervalles semi-ouverts [début, fin[ : deux missions consécutives peuvent se toucher sans se chevaucher. Une mission de nuit peut finir le lendemain. Refuse fin antérieure ou égale au début, heures inexistantes ou ambiguës non résolues lors du changement d’heure.

L’éligibilité temporelle exige que l’union des disponibilités, diminuée des indisponibilités, couvre toute la mission. Les missions déjà affectées sont prises en compte. « Disponible le même jour » n’est pas suffisant pour un poste de nuit.

Pour une recherche entre deux dates, utilise un chevauchement explicite avec la fenêtre sélectionnée ; le frontend doit le comprendre et l’indiquer. Le matching exige, lui, la couverture complète du poste. Stocke le type de vacation DAY, NIGHT ou MIXED indépendamment de la date de publication ; ne déduis pas des horaires précis d’une offre externe qui ne les fournit pas.

Calcule la distance entre le point de mobilité du professionnel et le lieu réel de travail. Avec PostGIS geography, travaille en mètres, avec index spatial et ordre longitude/latitude explicite. Un centre de commune peut servir d’approximation si cette précision est signalée. Une distance inconnue reste inconnue : elle ne devient jamais zéro ni un match certain dans un rayon strict.

La recherche F05 reste distincte des recommandations F04/F16. Elle permet d’explorer les offres dans les qualifications détenues sans prétendre que toutes les conditions d’une candidature sont remplies. Les qualifications et prérequis sont revérifiés à la candidature. La consultation publique d’une annonce n’exige pas de diplôme, mais sa publication ne révèle aucune donnée privée.

Filtres communs : types de missions, établissement, localisation/rayon, fenêtre de dates et vacation jour/nuit. Filtres spécifiques : services pour IDE ; population, type de bloc et spécialité conditionnelle pour IADE/IBODE. Un professionnel spécialisé qui coche IDE accède à tous les filtres IDE.

Les valeurs d’une même dimension sont combinées par OU ; les dimensions applicables à une même branche sont combinées par ET. Les branches de qualification sélectionnées sont combinées par OU, puis les filtres communs s’appliquent à l’ensemble. Exemple : « IDE en urgences OU IADE en bloc adulte polyvalent », puis « à moins de 30 km et dans la période choisie ». Les filtres de bloc ne doivent pas supprimer la branche IDE.

Expose ce contrat clairement, par exemple avec des paramètres ideServices[], iadePopulation[], iadeBlockTypes[], iadeSpecialties[] et leurs équivalents IBODE. Un filtre d’une branche non sélectionnée est refusé avec une erreur explicite. Le filtre d’un bloc polyvalent n’impose aucune spécialité. Les tableaux et rayons sont bornés ; les limites choisies sont documentées comme paramètres produit.

Proposition initiale : 20 résultats par page, maximum 50 ; pagination stable avec identifiant en dernier critère de tri. Privilégie la pagination et les filtres SQL aux chargements complets en mémoire. Si le rayon est limité, affiche cette limite dans le contrat frontend. N’ajoute pas Elasticsearch pour la V1.

## 9 Matching F04 et F16 admissibilité puis classement

Implémente un seul service de matching réutilisé pour les propositions aux infirmiers et aux entreprises autorisées. Ce moteur est déterministe : mêmes entrées, mêmes règles et même version donnent le même résultat. Aucun modèle entraîné, LLM ou score opaque n’est requis.

Étape 1 — Vérifie les conditions bloquantes dans cet ordre logique : mission ouverte ; qualification compatible ; compétences et expérience obligatoires ; conditions du dossier nécessaires au stade considéré ; couverture des disponibilités et absence de conflit ; mobilité et distance connues compatibles. Une vacation expressément refusée par le professionnel n’est pas admissible. Enregistre des codes d’explication stables. Un bon score ne compense aucune de ces conditions.

Étape 2 — Classe uniquement les missions ou candidats admissibles. Conserve cette formule initiale explicable, déjà proposée, en indiquant qu’il s’agit d’un choix du projet et non d’une exigence du sujet :

`score = 100 × (0,45 × C + 0,25 × Z + 0,20 × D + 0,10 × E)`

- C : proportion de compétences souhaitées détenues ; 1 si aucune n’est demandée. Les compétences obligatoires ont déjà été contrôlées.
- Z : max(0 ; 1 − distance / rayon accepté). Un rayon doit être strictement positif. Hors rayon : non admissible, pas seulement mal classé.
- D : 1 si la vacation correspond à la préférence déclarée ou si aucune préférence n’est exprimée ; 0,5 si elle est acceptée mais moins souhaitée. La couverture complète de disponibilité a déjà été contrôlée.
- E : min(mois d’expérience pertinente / 24 ; 1). Les mois proviennent de périodes renseignées cohérentes ; ce bonus n’est ni une preuve légale ni un substitut à l’expérience obligatoire.

Exemple vérifiable : C=1, Z=0,75, D=1 et E=1 donnent 93,75/100. Affiche les composantes et la version des règles. En cas d’égalité, utilise un tri stable documenté, par exemple date de début puis identifiant. Les pondérations restent configurables et versionnées ; elles ne sont pas ajustées en secret pour favoriser un candidat.

Une information indispensable inconnue donne « évaluation incomplète » et un score null, jamais un faux score précis. Une information facultative absente suit une règle documentée ; par exemple, une expérience non renseignée ne produit aucun bonus. N’utilise pas l’âge, le sexe, l’origine, la situation familiale ou l’état de santé dans le classement.

Distingue la compatibilité déclarative et l’autorisation finale d’affecter. Pour les candidatures et affectations internes, la condition RPPS est satisfaite uniquement si le numéro courant est FOUND. NOT_FOUND bloque ; PENDING ou NOT_CHECKED laisse le dossier en attente sans autoriser ces actions. La consultation des annonces et la correction du profil restent possibles. Le matching ne présente pas ces dossiers comme éligibles : motif RPPS_NOT_FOUND pour le blocage, évaluation incomplète pour l’attente. Les autres prérequis du scénario restent contrôlés ; le report de l’attestation et des références ne crée pas de preuve d’expérience.

Les missions qui correspondent le mieux au profil apparaissent en premier. Le professionnel choisit celles auxquelles il souhaite postuler. L’agence valide ensuite l’affectation ; aucune affectation n’est automatique.

## 10 Missions candidatures et affectations

Limite la V1 à une mission pour un poste et un intervalle continu. Un besoin comportant plusieurs postes ou vacations est décomposé en missions distinctes. Cela rend les conflits, disponibilités et changements de statut vérifiables sans construire un planning complexe.

| Objet | États et transitions |
| --- | --- |
| Mission | DRAFT → OPEN après validation ; OPEN → FILLED seulement après affectation validée ; FILLED → COMPLETED après fin et clôture ; annulation autorisée et tracée vers CANCELLED. |
| Candidature | SUBMITTED → SELECTED ou REJECTED ; retrait WITHDRAWN possible avant affectation ; création d’une affectation : ACCEPTED. Nouvelle soumission contrôlée possible après retrait ou révision, avec historique. |
| Affectation | ACTIVE puis COMPLETED ou CANCELLED ; créée uniquement après validation humaine des conditions courantes. |
| Position dans le temps | upcoming, in_progress et past calculés à partir des dates ; ne remplacent pas les états métier ci-dessus. |

L’historique conserve les transitions, leur auteur et leur date. Annuler une affectation active passe simultanément Assignment à CANCELLED et Mission à CANCELLED, libère le créneau et écrit l’audit et l’outbox dans la même transaction. Une mission FILLED conserve toujours une affectation ACTIVE. Pour un besoin maintenu, l’agence effectue une republication explicite CANCELLED → DRAFT → OPEN, avec version de mission incrémentée, consentements précédents invalidés et historique conservé ; une mission COMPLETED ne peut pas être rouverte. La candidature ancienne conserve son historique d’acceptation et l’affectation annulée ; elle ne redevient pas automatiquement sélectionnable. Un nouveau consentement et une nouvelle soumission sont nécessaires. Retirer une candidature après affectation est refusé ; utiliser ce parcours d’annulation, sans développer le module d’imprévus F11.

Lors d’une candidature, enregistre la version de mission acceptée. Un changement substantiel — qualification, lieu, horaires, salaire ou prérequis — augmente la version et exige une reconfirmation avant l’affectation. Pour une mission déjà affectée, refuse une modification substantielle directe : passe par annulation/republication contrôlée. Une simple correction de présentation sans incidence est tracée sans fabriquer un nouveau consentement.

L’affectation est une transaction PostgreSQL : vérifier les droits, verrouiller la mission puis le professionnel, puis la candidature et le consentement selon un ordre constant, relire versions, états, RPPS courant, prérequis, disponibilités et conflits ; créer Assignment, passer Application à ACCEPTED et Mission à FILLED, écrire audit et AssignmentCreated dans l’outbox. Toutes les écritures partagent le même contexte transactionnel. Aucun appel réseau à un fournisseur pendant cette transaction. En cas d’échec, aucune écriture partielle.

Ajoute une unicité partielle des affectations actives par mission et une exclusion GiST des chevauchements par professionnel sur tstzrange, via migration SQL avec btree_gist. Toutes les écritures concurrentes concernées suivent le même protocole : mission, puis profils triés par identifiant, puis candidatures/consentements. Les opérations portant seulement sur un profil (qualifications, compétences, expérience, RPPS, disponibilités) prennent le verrou de ce profil sans acquérir ensuite celui d’une mission. Retrait, sélection et reconfirmation prennent les mêmes verrous que l’affectation ; les changements d’affiliation ou de lien organisationnel sont également sérialisés avec les contrôles d’autorisation sensibles. Une modification incompatible avec une affectation active est refusée ou passe par un cas d’usage explicite ; un changement de RPPS suit la politique F18 sans annulation implicite. Verrouiller le profil ne verrouille pas automatiquement ses tables associées : les services d’écriture doivent coopérer. Les collisions incompatibles donnent un 409 ; deadlocks et erreurs de sérialisation ont des reprises bornées.

Ces protections serveur sont nécessaires en V1. L’interface avancée d’alerte de conflits reste en V2. Les commandes sensibles utilisent une clé d’idempotence avec vérification du contenu : rejouer la même demande renvoie le même résultat ; réutiliser la clé avec d’autres données est refusé.

## 11 Contrat API et intégration frontend

Expose une API REST documentée par OpenAPI, sous /api/v1. Décris les schémas d’entrée et de sortie, enums, unités, dates, champs nullables, pagination, permissions et erreurs. Valide les DTO côté serveur et refuse les champs sensibles non autorisés : role, organizationId arbitraire, verified, score, ownerId et statut d’affectation ne sont pas modifiables librement.

| Groupe de routes indicatif | Contrat minimal |
| --- | --- |
| /auth | Inscriptions infirmier/entreprise, connexion, session courante, déconnexion ; sous-type entreprise explicite. |
| /me/profile, /me/availability, /me/mobility | Lecture et modification du profil, créneaux et mobilité de leur titulaire. |
| /me/bank-details, /me/documents | RIB masqué et justificatif privé ; endpoints sensibles distincts des profils usuels. |
| /reference-data, /facilities | Référentiels autorisés et établissements ; données publiques séparées des données privées. |
| /listings, /listings/:id | Recherche et détail communs avec discriminant INTERNAL_MISSION ou EXTERNAL_OFFER. |
| /me/favorites/listings, /me/favorites/facilities | Ajouter, lister et supprimer ses favoris. |
| /staffing-requests, /missions | Besoins et missions ; création, modification, publication et clôture selon droits. |
| /missions/:id/applications, /me/applications | Candidature interne, suivi, retrait et reconfirmation de version. |
| /applications/:id/selection, /applications/:id/rejection | Décision entreprise autorisée et tracée ; sélection distincte de l’affectation. |
| /missions/:id/assignments | Validation finale par l’agence ; transaction et idempotence. |
| /assignments/:id/confirmation | Statut et téléchargement privé pour les participants habilités ; aucun lien public permanent. |
| /me/matches, /missions/:id/candidates | Même moteur de matching, deux projections et permissions différentes. |
| /matches/:id/explanation | Lecture autorisée de l’explication conservée dans MongoDB. |
| /verifications, /dashboards, /me/history | Résultat RPPS et état FOUND, NOT_FOUND, PENDING ou NOT_CHECKED ; reprise du contrôle par action authentifiée et limitée, sans choix du résultat par le client ; compteurs et historique privés. Aucune vérification des références en V1. |
| /me/notifications | Notifications privées, lecture et marquage comme lues. |
| /internal/automation/* | Routes privées de service pour n8n ; scopes dédiés, non accessibles par un compte ordinaire. |

Les verbes HTTP et noms finaux peuvent suivre les conventions du dépôt ; documente leur correspondance. Les actions d’écriture ne sont jamais des GET. Les routes futures ne sont pas exposées comme si elles fonctionnaient.

Utilise des erreurs stables : 400 validation, 401 authentification, 403 permission, 404 ressource absente ou privée selon politique, 409 conflit, 429 limitation, 503 dépendance indisponible. Réponds avec code, message compréhensible, champs en erreur et requestId ; aucun secret, stack interne ou requête SQL dans la réponse.

Le frontend doit pouvoir afficher les champs manquants, absence de résultat, source externe, distance approximative, dossier non vérifié, consentement à reconfirmer et dépendance indisponible. Une démo sur mocks ne vaut pas une intégration avec l’API. Conserve un jeu de fixtures contractuelles clairement distinct des preuves d’intégration réelle.

## 12 Données publiques import API et bibliothèque CLI

La source principale proposée pour F15 est l’API Offres d’emploi de France Travail. Son existence et son rôle ont été vérifiés lors du cadrage ; l’accès effectif du projet n’est pas démontré. Vérifie dès le début, au plus tard à J+2, les conditions, identifiants, quotas, formats et droits de réutilisation. Ne présume pas qu’une URL publique dispense d’authentification. Sources S01 et S02 en fin de document.

Implémente un adaptateur de fournisseur isolé. Le reste du produit consomme un modèle ExternalOffer normalisé, pas le JSON brut du fournisseur. Pour une offre, conserve notamment provider, externalId, sourceUrl, originalPublisher, fetchedAt, publishedAt, lieu et précision, libellé brut et normalisé, qualification reconnue ou inconnue, salaire interprétable et date d’expiration si fournie.

Le pipeline doit : récupérer un lot borné, valider le format, nettoyer les libellés et espaces, normaliser les catégories reconnues, convertir dates et lieux, dédupliquer par source et identifiant, faire un upsert, tracer les rejets et produire un bilan. Une règle heuristique de qualification doit être explicitée et testée ; ne transforme pas automatiquement toute offre « infirmier » en IADE ou IBODE.

Les annonces d’intérim sont identifiées grâce aux données fiables de contrat. Les offres sans qualification ou horaires suffisamment précis peuvent rester consultables comme offres externes incomplètes ; elles ne deviennent pas des missions internes éligibles à un score complet. Une date de publication n’est jamais une date de début de poste. Le texte de l’annonce est une entrée non fiable, à traiter sans exécution HTML.

Ne transforme pas une panne d’import en disparition de toutes les offres. Marque la dernière synchronisation réussie et les données anciennes. N’expire les offres absentes qu’après une synchronisation complète pertinente ou une indication fiable du fournisseur. Prévois délais, retries bornés, gestion de 429 et secrets hors logs.

Utilise réellement une bibliothèque CLI, par exemple Commander si elle convient au dépôt, pour une commande documentée telle que « import-offers --source france-travail --dry-run ». Prévois limite de volume, bilan, code de sortie et mode sans écriture. L’import API automatisable est V1 ; le formulaire d’import manuel CSV F14 reste V2. Un export technique du jeu public pour la livraison ne constitue pas ce formulaire V2.

Dans /listings, distingue les identifiants internes et externes, par exemple m_UUID et e_UUID. Une candidature externe redirige vers l’URL légitime du fournisseur. N’affiche jamais « candidature envoyée » si Interimatch n’a rien transmis. Les favoris fonctionnent sur les deux sources ; une offre expirée reste identifiable dans les favoris avec son état.

FINESS peut enrichir les établissements et leurs identifiants à partir d’une source publique réellement nettoyée. Cette exploitation peut satisfaire l’exigence pédagogique de données publiques, mais elle ne remplace pas F15, qui porte sur les offres. Si France Travail est inaccessible, recherche une API autorisée équivalente ; présente l’écart et une proposition concrète avant tout retrait de F15. Un jeu synthétique ou une capture de documentation ne prouve pas un import réel.

Livre un manifeste de source, licence/conditions, date et périmètre d’acquisition, empreinte du jeu retenu, transformations, rejets et commandes reproductibles. Respecte les conditions de redistribution ; limite les données personnelles dans l’échantillon livré. Montre un résultat visible dans la recherche ou l’enrichissement d’établissement, pas seulement un log d’appel API.

## 13 Trois automatisations n8n réelles

Réalise les trois workflows retenus ci-dessous pour F12 en V1. Le sujet demande au moins deux automatisations ; la décision produit de l’équipe en retient trois. n8n orchestre ces actions ; les règles de droits, de matching et de génération documentaire restent dans le backend.

Workflow A — À l’ouverture d’une mission ou à une évolution pertinente de profil, un événement déclenche le calcul des correspondances. n8n demande les destinataires autorisés puis crée une notification dans l’application via une route dédiée. Juste avant notification, le backend revérifie l’état de la mission, la pertinence et les préférences. Une trace dans n8n seule n’est pas une notification utilisateur.

Workflow B — À intervalle configuré, n8n demande les missions encore ouvertes et non pourvues au-delà d’un délai défini, puis déclenche une relance au responsable agence autorisé. Le backend contrôle à nouveau l’état avant l’émission. La durée de démonstration est configurable et ne modifie pas les dates métier réelles.

Workflow C — Après validation de l’affectation, l’événement AssignmentCreated déclenche n8n. Le workflow demande au backend, via une route de service dédiée, de générer une confirmation PDF depuis un modèle versionné. Le backend contrôle l’affectation courante et les versions, puis stocke le document en privé avec les protections du module Documents. Le modèle contient les informations utiles de mission et des parties, sans RIB ni justificatif, et porte une mention de démonstration ; il ne constitue pas un contrat signé. n8n suit le résultat puis demande une notification avec un lien privé pour chaque participant autorisé. Aucun contenu documentaire sensible n’est transmis au moteur nocode.

MissionConfirmation suit PENDING, READY, FAILED, SUPERSEDED ou CANCELLED. Une contrainte d’unicité par affectation/version de mission/version de modèle et une réservation du traitement empêchent la génération concurrente en double. Un rejeu retrouve le document existant ou reprend l’échec. Une panne de génération ne défait pas l’affectation validée. Recontrôler état et version avant de rendre le document READY et avant notification : une affectation annulée pendant le traitement ne reçoit pas de confirmation active. Les documents antérieurs sont signalés comme annulés ou remplacés selon la politique de conservation.

Les notifications internes à l’application constituent le canal de base proposé. Un webhook Slack/Discord de démonstration peut être ajouté si le groupe retient ce canal, sans données personnelles et uniquement vers une destination autorisée. N’ajoute pas un service email/SMS complet au périmètre.

Les événements SQL sont écrits dans la même transaction que l’action métier. Un traitement les remet à n8n avec retry borné et état d’échec exploitable. Une réception perdue puis rejouée ne crée pas deux notifications : clé unique sur événement/destinataire/type ; pour les relances, clé sur mission/version/fenêtre de relance. Un accusé de réception HTTP n’est pas une preuve de notification créée.

Authentifie les appels de service avec un secret dédié et rotatif, transmis de manière sûre ; limite les scopes et les champs renvoyés. Les routes de service n’acceptent pas un utilisateur arbitraire comme destinataire sans contrôle. n8n ne se connecte pas comme superutilisateur des bases. Son éditeur reste privé.

Livre les trois exports JSON sans secrets, les paramètres de démonstration, les instructions d’import, les identifiants d’exécution, une preuve de notification visible, une confirmation réellement générée et téléchargeable par un participant habilité, un rejeu sans doublon et le traitement d’une mission pourvue avant relance. Pour la confirmation, conserver un reçu final ou une réconciliation : le succès HTTP initial ne prouve pas la génération. Aucun message réel à un tiers n’est autorisé par la seule rédaction de ce prompt.

## 14 Authentification données sensibles et sécurité

Implémente et explique le flux classique email/mot de passe avec une bibliothèque de hachage adaptée, par exemple Argon2id. Utilise une bibliothèque cryptographique reconnue ; n’écris pas de primitive cryptographique. L’authentification doit être comprise par l’équipe. OAuth reste hors V1 ; si ajouté ultérieurement, utilise une bibliothèque ou un service existant.

Choix recommandé : sessions opaques aléatoires, expirantes et révocables, dont l’identifiant est renouvelé à la connexion. Cookies Secure en environnement HTTPS, HttpOnly et SameSite adapté ; protection CSRF explicite pour les écritures ; déconnexion invalidant la session côté serveur. Documente les différences nécessaires en développement local sans les transporter en production.

Limite les tentatives de connexion et les endpoints coûteux. Ne divulgue pas si un compte existe. Vérifie CORS par origine, la configuration trust proxy, la taille des requêtes et les en-têtes de sécurité. Le contrôle de session et des droits s’applique à chaque requête privée.

Chiffre réellement le RIB fictif et le justificatif au repos, par exemple par AES-256-GCM avec nonce unique, tag vérifié et keyId. Les clés restent séparées des données et du dépôt. Une clé absente ou invalide provoque un échec explicite, jamais une sauvegarde en clair. Prévois la rotation : nouvelles écritures avec la nouvelle clé, anciennes lectures avec la clé appropriée jusqu’à migration contrôlée.

Le RIB est masqué dans l’interface et absent des réponses ordinaires de profil, logs, événements et traces MongoDB. En V1, son titulaire peut le déposer ou remplacer ; aucun usage de paiement n’est ajouté. Une éventuelle consultation métier doit être explicitement habilitée et justifiée, pas accessible par défaut à toute entreprise.

Pour le justificatif, limite la taille, par exemple à 5 Mo, et les formats de démonstration PDF, JPEG ou PNG. Vérifie extension, type déclaré et signature réelle du fichier ; utilise un nom de stockage opaque. Refuse les chemins fournis par le client, nettoie les temporaires et stocke hors de l’espace public. Le téléchargement contrôle les droits et vérifie l’intégrité avant de renvoyer le contenu. Ne revendique pas d’analyse antivirus si aucun moteur n’est intégré.

Utilise une origine HTTPS pour frontend et API dans la démonstration déployée. Active TLS avec validation des certificats pour API–PostgreSQL, API–MongoDB, backend–n8n et n8n–API lorsqu’ils transportent des données sensibles dans ce déploiement ; documente les terminaisons TLS et les différences locales. Un réseau privé ne constitue pas un chiffrement. Les bases et l’éditeur n8n restent privés ; le reverse proxy bloque /api/v1/internal depuis Internet, avec authentification de service en complément. Paramètre SQL, construis les filtres MongoDB depuis des DTO, limite les destinations et redirections des fournisseurs contre SSRF et assainis les contenus selon leur contexte contre XSS.

Conserve des logs structurés avec requestId et événements d’audit utiles, sans mots de passe, tokens, RIB, justificatifs ou copies indiscriminées des requêtes. Les accès documentaires sensibles, changements de vérification, affectations et annulations sont traçables.

Respecte les contraintes transverses du catalogue : sauvegarde chiffrée, exercice de restauration isolé, procédure de rotation, réaction à un incident et 18 contrôles de sécurité. La note ancienne classait certains exercices en renforcement ; le catalogue actuel les demande. Réalise une démonstration bornée et honnête, avec résultat réel ou écart déclaré, sans les supprimer silencieusement.

Les secrets ne sont ni committés, ni exportés avec n8n, ni exposés par les erreurs. Fournis un .env.example sans valeurs réelles et des instructions de génération. Vérifie les dépendances et la chaîne de livraison ; documente les alertes non corrigées avec leur impact concret.

## 15 Cadre métier RGPD accessibilité sobriété et SEO

F18 — Décision validée : consulter l’API Annuaire Santé côté backend dès que l’infirmier renseigne ou modifie son numéro RPPS. Conserver le numéro comme texte et contrôler sa forme avant l’appel ; une saisie malformée produit une erreur de champ, pas un faux résultat de l’annuaire. Une réponse valide pour la recherche exacte permet FOUND si le numéro est retrouvé, ou NOT_FOUND si la recherche aboutit sans correspondance. FOUND indique seulement un numéro retrouvé : aucune validation d’identité, de CV complet ou attribution automatique de diplômes n’en découle. Aucun contrôle manuel supplémentaire par l’agence n’est imposé.

Le statut RPPS fait partie du dossier : NOT_CHECKED avant contrôle, PENDING pendant l’appel ou si le service est indisponible, FOUND ou NOT_FOUND après réponse exploitable. Un timeout, une erreur réseau, un 429, un 5xx, un défaut d’authentification fournisseur ou une réponse inexploitable restent PENDING avec motif technique ; ne jamais les convertir en NOT_FOUND. Prévoir délais, tentatives bornées, prochaine tentative et relance contrôlée, avec alerte technique si une configuration empêche la reprise. Conserver source, date, identifiant de demande et numéro/version du profil contrôlés, sans exposer la clé API.

Portée du blocage V1 : NOT_FOUND empêche la candidature interne et toute nouvelle affectation ; permettre de corriger le numéro puis relancer le contrôle. PENDING et NOT_CHECKED maintiennent ces actions en attente, sans rejet définitif du compte. L’infirmier conserve l’accès au profil, aux annonces et à ses données existantes. Les messages indiquent « Numéro RPPS non retrouvé : vérifiez votre saisie » ou « Vérification RPPS en attente : service temporairement indisponible », selon le résultat ; ne pas présenter une panne comme un numéro invalide.

À chaque changement de numéro, invalider le résultat précédent et passer à PENDING. Un résultat tardif n’est appliqué que s’il correspond toujours au numéro et à la demande courants. Enregistrer les changements de statut avec le verrou de profil partagé avec les candidatures et affectations, puis recontrôler le statut serveur à ces actions ; aucun appel réseau dans leur transaction métier. Un passage en attente ou un résultat négatif ne supprime ni l’historique ni une affectation existante ; les éventuelles conséquences sur celle-ci nécessitent un traitement explicite, sans annulation automatique.

L’accès API du projet et sa preuve de fonctionnement restent à produire. Les scénarios fictifs FOUND, NOT_FOUND et PENDING sont testés sur fixtures clairement identifiées ; ils ne prouvent pas une vérification réelle de personnes fictives. Les références professionnelles restent hors V1, envisagées en V2 ; l’attestation sur l’honneur reste en F02 V2.

Formalise le scénario français d’intérim choisi avec le responsable métier : motif, terme, durée, qualification, agence, établissement, rémunération et mentions pertinentes du contrat de mission et de mise à disposition. Vérifie les règles applicables auprès des sources officielles en vigueur lors du développement. Ne code pas un plafond universel de durée ni une règle d’expérience fondée uniquement sur la date du diplôme.

Les pièces d’expérience et l’attestation sur l’honneur de F02 restent en V2. Ce report ne supprime pas les prérequis réglementaires du scénario retenu ni ne les transforme en vérifications réalisées. Leur prise en compte dans le POC reste à documenter. Une préparation de mission n’est pas un contrat signé. F24 reste V3 ; le sujet exige néanmoins de comprendre et refléter les grandes règles de l’intérim dès le POC.

Documente les finalités, bases légales, destinataires, durées de conservation et moyens d’exercice des droits. La case d’acceptation des CGU conserve version et date ; elle ne devient pas un consentement global à tous les traitements. Justifie la collecte de chaque donnée et garde les champs de démonstration sensibles fictifs. Prévois la purge ou l’anonymisation cohérente des bases, documents, logs et sauvegardes suivant la politique documentée.

Ne revendique ni certification ni conformité juridique intégrale à partir de ces mécanismes. Le POC doit montrer des mesures concrètes, leurs limites et les validations encore nécessaires pour un usage réel.

Coordonne avec le frontend l’application des bases RGAA 4.1 demandées : navigation clavier, focus visible, contrastes, alternatives d’images, structure sémantique, labels et messages d’erreur reliés aux champs. Teste les écrans critiques ; le sujet ne demande pas une certification RGAA complète.

Réalise et documente au moins deux pratiques RGESN. Proposition : réduire les requêtes avec pagination, regroupement et cache limité aux référentiels publics ; compresser et charger à la demande les images réellement utilisées côté frontend. Relie chaque pratique au référentiel et à une mesure ou observation reproductible. Si l’interface ne comporte pas d’images significatives, remplace la seconde par une pratique réellement mise en œuvre, pas par un résultat inventé.

Une réflexion d’achat responsable ou de réemploi adaptée au secteur est attendue si pertinente : matériel numérique réemployé ou sobriété des ressources, par exemple. Ne propose pas de réutilisation non autorisée de matériel médical à usage unique.

La page d’accueil publique minimale et les annonces relèvent des exigences V1 du sujet, même si le centre éditorial F13 attend V3. Prévois title et description propres, un H1, une hiérarchie cohérente, des URLs lisibles et un sitemap minimal. Les pages privées restent hors sitemap et hors indexation. Une démo contenant de fausses offres reste signalée comme telle et non indexable publiquement ; les mécanismes SEO sont néanmoins démontrables.

Le frontend TypeScript doit être responsive sur mobile, tablette et desktop. Inscris ces exigences dans la recette collective : ne les coche pas comme réalisées en produisant seulement des endpoints.

## 16 Tests et preuves attendues

Implémente une séquence de tests unitaires et une séquence de tests fonctionnels pour les parcours critiques du sujet : inscription, création de mission et matching. Ajoute les vérifications nécessaires aux risques métier réels : permissions, données sensibles, concurrence et intégrations. Les tests ne doivent pas simplement reproduire le code sans vérifier une règle.

| Domaine | Cas minimaux à couvrir |
| --- | --- |
| Qualifications | IDE vers IDE uniquement ; IADE vers IDE/IADE ; IBODE vers IDE/IBODE ; deux spécialités ; diplôme absent ; statut vérifié non auto-attribuable. |
| RPPS F18 | Réponse exacte FOUND ; réponse valide vide NOT_FOUND ; saisie malformée ; timeout, 429, 5xx, défaut de clé et réponse inexploitable en PENDING ; blocage des candidatures/affectations ; correction puis reprise ; réponse tardive pour ancien numéro ignorée ; mise à jour concurrente ; aucune annulation automatique d’affectation existante ; appel API réel distingué des fixtures. |
| Recherche | IDE par un IADE/IBODE ; branches IDE et bloc combinées ; adulte/pédiatrique/mixte ; polyvalent sans spécialité obligatoire ; spécialité requise si spécialisé. |
| Matching | Prérequis bloquant malgré excellent score ; score 93,75 de l’exemple ; données indispensables inconnues ; résultat stable ; explication réellement relue depuis MongoDB. |
| Temps et distance | Nuit sur deux jours ; changement d’heure ; créneaux adjacents ; indisponibilité partielle ; affectation existante ; coordonnées inconnues ; unités de distance. |
| Candidature | Candidature et retrait ; nouvelle soumission tracée ; changement de version ; refus d’affecter sans consentement courant. |
| Affectation | Deux validations concurrentes ; rollback ; unicité mission ; chevauchement professionnel ; modifications concurrentes de disponibilité, qualification, RPPS et affiliation ; retrait/reconfirmation concurrent ; annulation atomique et republication avec nouvel accord. |
| Favoris et historique | Offre interne/externe, établissement, doublon, suppression, offre expirée ; historique annulé et passé. |
| Données publiques | Normalisation, doublons, dates absentes, qualification ambiguë, panne, réimport idempotent ; preuve distincte d’un appel réel. |
| n8n | Trois workflows importés et exécutés ; rejeu sans doublon ; mission pourvue avant relance ; service non autorisé. |
| Confirmation F12 | PDF réel issu du modèle ; accès autorisé et accès croisé refusé ; génération concurrente dédupliquée ; échec puis reprise ; annulation pendant traitement ; ancien document signalé comme annulé ou remplacé. |
| Intégration | Parcours avec frontend et deux bases réelles ; permissions d’organisations ; erreurs visibles et contrôlées. |

Conserve les identifiants de la note de sécurité pour faciliter la reprise :

| Contrôle | Vérification et résultat attendu |
| --- | --- |
| SEC01 | Connexion après session anonyme : nouvel identifiant, ancien inutilisable. |
| SEC02 | Déconnexion ou expiration : ancienne session refusée côté serveur. |
| SEC03 | Échecs répétés : limitation effective sans divulgation de compte. |
| SEC04 | Écriture sans protection CSRF valide : refus sans mutation. |
| SEC05 | Pièce d’un autre périmètre : ni contenu ni métadonnées privées divulgués. |
| SEC06 | Liste ou export inter-organisation : aucune ressource non autorisée. |
| SEC07 | role ou verified injecté dans le client : aucun privilège acquis. |
| SEC08 | Contenu libre malveillant : aucun code exécuté dans le navigateur. |
| SEC09 | Filtres SQL/MongoDB malformés : erreur contrôlée, pas de requête arbitraire. |
| SEC10 | Fichier trop gros ou trompeur : rejet et nettoyage des temporaires. |
| SEC11 | Donnée chiffrée altérée ou mauvaise clé : refus sans contenu partiel. |
| SEC12 | Rotation de clé : nouvelles écritures et anciennes lectures cohérentes. |
| SEC13 | Affectations et notifications concurrentes : invariants et déduplication. |
| SEC14 | Token de service absent/invalide : refus ; token valide limité à son scope. |
| SEC15 | Dépôt et exports n8n : aucun secret réel ni document personnel. |
| SEC16 | Restauration isolée : accès autorisé au justificatif et parcours métier rejouable. |
| SEC17 | Incident fictif : trace, alerte et procédure effectivement exercées. |
| SEC18 | Après déconnexion : aucune nouvelle réponse privée ni cache partagé ; documenter les limites du cache navigateur déjà affiché. |

Génère et livre la couverture réelle avec commandes, commit, date et périmètre. Le sujet n’impose pas de pourcentage minimal ; n’en invente pas. Une couverture élevée ne remplace pas les scénarios critiques. Distingue tests sur fixtures, tests avec bases réelles et validation d’accès à une API externe.

La CI doit au minimum permettre installation reproductible, lint, vérification TypeScript, tests et build. Exécute les tests d’intégration avec des bases isolées et un jeu fictif. Rapporte tout contrôle non exécuté comme tel. Ne transforme pas une indisponibilité d’environnement en test réussi.

## 17 Planning livraison et oral

Le projet est realise par quatre personnes sur onze jours, avec une date de rendu fixe confirmee par l’utilisateur. Le planning de repartition est docs/PLANNING_4_PERSONNES_11_JOURS.md. Le CDC, la roadmap et le chiffrage par fonctionnalité/module sont attendus à J+2, avec un go/no-go. Estime d’après le dépôt réel, la disponibilité de l’équipe et les dépendances ; les anciennes hypothèses d’heures ne sont pas des temps validés ni des temps réellement passés.

| Période indicative | Résultat attendu et point de contrôle |
| --- | --- |
| J1–J2 | Audit du dépôt, cadrage, marché, source publique accessible, architecture, contrats d’API, estimation et go/no-go. |
| J3–J4 | Comptes, permissions, profils et référentiels ; mission publiée ; premières migrations et intégration frontend. |
| J5–J6 | Recherche, matching, favoris, candidatures, disponibilités et historique ; tests métier prioritaires. |
| J7–J8 | Affectation transactionnelle, import public visible, MongoDB effectivement utilisé, trois workflows dont génération de confirmation et données sensibles. |
| J9–J10 | Recette frontend/backend, sécurité, restauration, coverage, documentation et correction des défauts bloquants. |
| J11 | Vérification finale, bilan réel/estimé, supports et répétition de la démonstration par tous les membres. |

Ce planning est un ordre de travail proposé, pas une garantie de faisabilité. Les tâches peuvent être réparties entre membres selon leurs responsabilités. Si le chiffrage dépasse la capacité réelle, expose les écarts au go/no-go ; ne supprime pas les obligations du sujet ni une fonction validée sans arbitrage explicite.

Livre les sept éléments du sujet : CDC J+2 avec roadmap et estimations ; dépôt frontend/backend et README ; exports ou captures des workflows ; jeu public et script/notebook utilisé ; étude de marché ; temps réellement passés par fonctionnalité et écarts ; support de pitch. Ajoute les preuves techniques utiles sans noyer ces livrables.

Le README doit permettre à un autre membre de partir d’un clone propre : prérequis, variables, génération des clés de démonstration, démarrage des bases, migrations, seed fictif, lancement API/frontend/n8n, import de données, tests et coverage. Fournis un .env.example, OpenAPI, scripts documentés et aucun fichier de travail oublié.

Documente les décisions importantes dans de courts ADR : deux bases, matching, modèle de mission, sécurité documentaire, canal des notifications et adaptateur public. Un changement d’architecture nécessite un problème concret et une décision documentée, pas une anticipation vague de la V2.

Pour la soutenance, prépare problème, solution, démonstration réelle et limites. Tous les membres prennent la parole et savent expliquer une partie technique ou métier. Prévois des variantes en cas d’interruption du jury et un jeu de démonstration local si le fournisseur externe est indisponible ; ce secours est identifié comme tel et accompagné de la preuve antérieure d’acquisition réelle.

## 18 Matrice de couverture du sujet

R01 à R40 sont des identifiants internes de contrôle, pas une numérotation officielle Epitech. Les pages ci-dessous sont les pages imprimées du sujet, hors couverture. Cette matrice relie les obligations à ce prompt ; elle ne prouve pas leur réalisation dans le code.

| ID | Exigence du sujet et page | Couverture et preuve à produire |
| --- | --- | --- |
| R01 | Secteur choisi et justifié, p. 1–2 | §§1,17 ; étude de marché et argumentaire. |
| R02 | Taille du marché, acteurs et douleurs, p. 2 | §17 ; sources datées, besoins entreprise et intérimaire. |
| R03 | Source publique et format consommable, p. 2 | §12 ; accès testé, format et conditions documentés. |
| R04 | Proposition de valeur en une phrase, p. 2 | §1 ; phrase confrontée au marché et reprise au pitch. |
| R05 | CDC à J+2, p. 2 et 6 | §17 ; CDC daté. |
| R06 | Roadmap et périmètre, p. 2 | §§3,4,17 ; V1 et versions futures distinguées. |
| R07 | Estimation par fonction ou module, p. 2 | §§2,17 ; chiffrage sans doublons. |
| R08 | Go/no-go et ajustement, p. 2 | §§12,17 ; décision et écarts explicites. |
| R09 | Deux comptes/parcours, p. 2 | §§3,5,11 ; inscriptions et droits réellement testés. |
| R10 | Authentification sécurisée, p. 2 | §§14,16 ; hachage, sessions et contrôles. |
| R11 | Chiffrement repos/transit, p. 2 | §§14,16 ; RIB/pièce fictifs, clés, HTTPS et TLS entre services vérifiés. |
| R12 | Mission poste/dates/lieu/compétences/salaire, p. 2 | §§7,10 ; création et publication avec frontend. |
| R13 | Profil compétences/disponibilité/zone/expérience, p. 2 | §§6–8 ; profil complet et contrôles. |
| R14 | Matching des missions ouvertes, p. 2 | §9 ; admissibilité, score et tests. |
| R15 | Dashboard ouverte/pourvue/terminée, p. 2 | §§3,10,11 ; compteurs et trois états visibles. |
| R16 | Consommer une source publique, p. 3 | §12 ; acquisition réelle et manifeste. |
| R17 | Nettoyer et reformater, p. 3 | §12 ; script, transformations et rejets. |
| R18 | Usage visible des données, p. 3 | §§3,12 ; parcours produit utilisant le jeu nettoyé. |
| R19 | Au moins deux automatisations, p. 3 | §13 ; trois exports et exécutions réelles pour couvrir également F12, dont une confirmation générée. |
| R20 | Bases RGAA et savoir les citer, p. 4 | §15 ; recette frontend et critères expliqués. |
| R21 | Deux pratiques RGESN documentées, p. 4 | §15 ; pratiques réellement observées. |
| R22 | RGPD : base, conservation, mentions, p. 4 | §15 ; notice et mécanismes associés. |
| R23 | Grandes règles de l’intérim, p. 4 | §15 ; scénario métier, sources et contrôles. |
| R24 | Achat responsable/réemploi si pertinent, p. 4 | §15 ; réflexion adaptée au secteur. |
| R25 | SEO public : meta, titres, URLs, sitemap, p. 4 | §15 ; pages et sitemap vérifiés. |
| R26 | Frontend JS en TypeScript, p. 5 | §§2,11,15 ; dépôt et build frontend. |
| R27 | Mobile/tablette/desktop, p. 5 | §15 ; recette sur les trois formats. |
| R28 | Backend Node en TypeScript, p. 5 | §§2,7 ; NestJS compilé et lancé. |
| R29 | Base relationnelle, p. 5 | §7 ; PostgreSQL, migrations et écritures/lectures. |
| R30 | Base non relationnelle complémentaire, p. 5 | §§7,9 ; MongoDB, écriture et lecture d’explications. |
| R31 | Tests unitaires et fonctionnels critiques, p. 5 | §16 ; deux séquences et résultats réels. |
| R32 | Coverage générée et livrée, p. 5 | §16 ; rapport avec commit et périmètre. |
| R33 | Bibliothèque CLI utilisée, p. 5 | §12 ; bibliothèque et commande d’import exécutée. |
| R34 | Auth classique comprise/implémentée, p. 5 | §14 ; code et explication par l’équipe. |
| R35 | OAuth tiers via bibliothèque si proposé, p. 5 | §§4,14 ; hors V1, règle conservée pour extension. |
| R36 | Dépôt front/back organisé et README, p. 6 | §17 ; démarrage depuis clone propre. |
| R37 | Exports nocode, données/script et étude, p. 6 | §§12,13,17 ; fichiers livrés. |
| R38 | Temps réels/écarts et support de pitch, p. 6 | §17 ; relevé réel, comparaison et support. |
| R39 | Storytelling, live et participation de tous, p. 7 | §17 ; répétition collective. |
| R40 | Adaptation aux questions du jury, p. 7 | §17 ; variantes et explication des limites. |

## 19 Trois passes de contrôle après réalisation

Passe 1 — Fidélité documentaire. Comparer au sujet avec R01 à R40, au catalogue courant et aux décisions de docs/DECISIONS_V1.md. Vérifier F12 avec trois automatisations, F18 avec RPPS API bloquant/en attente, F02 attestation V2 et références hors V1. Utiliser la nouvelle numérotation, les favoris établissements, F15 et F22. Les renvois contrats utilisent F24 ; les PDF et anciens prompts restent des archives.

Passe 2 — Cohérence métier et technique. Pour chaque parcours, relie modèle, migration, DTO, endpoint, permissions, comportement frontend et preuve de test. Vérifie particulièrement qualifications multiples, filtre IDE pour IADE/IBODE, branches de recherche, polyvalent/spécialisé, nuits, données inconnues, consentement de version, transactions, droits inter-organisations, lecture MongoDB, idempotence et import externe.

Passe 3 — Livraison reproductible. Depuis un environnement propre, suis le README, démarre les deux bases, applique les migrations, importe les données publiques et les workflows, exécute les tests, génère la coverage et rejoue les parcours avec le frontend. Vérifie documents, liens, absence de secrets et livrables collectifs. Corrige les défauts, puis rejoue les contrôles touchés ; ne répète pas artificiellement tous les tests sans risque restant identifié.

Pour chaque contrôle, conserve exigence, résultat attendu, résultat observé, commande ou étapes, date, commit, preuve, responsable et limite. Statuts possibles : conforme avec preuve, écart, non exécuté, non applicable justifié. « Prévu dans le prompt » n’est jamais « testé dans l’application ».

Le travail est terminé uniquement lorsque les comportements V1, droits, erreurs, tests adaptés, documentation et preuves sont disponibles. Une dépendance inaccessible conserve le statut bloqué ; un test non exécuté reste non exécuté. Décrire un blocage ne vaut pas terminer la fonctionnalité. Ne promets pas de conformité de production à 100 %, de sécurité absolue ou de note au jury.

## 20 Mémoire de travail à maintenir

Maintiens dans le dépôt un fichier docs/REPRISE_BACKEND_V1.md et les preuves associées. Avant chaque interruption ou livraison, note : objectif ; périmètre validé ; sources et empreintes ; stack et commit ; fichiers modifiés ; décisions prises ; contrôles exécutés et résultats ; écarts ; prochaine action concrète.

Maintiens docs/MATRICE_VALIDATION_V1.csv et docs/CHIFFRAGE_V1.csv, ainsi que le journal docs/TEMPS_REELS.csv. Ne conserve aucun secret ni donnée personnelle dans ces notes. Préserve les échecs, les corrections et les résultats du rejeu. Une estimation ne remplit jamais le temps réellement passé.

À la reprise, lis ce fichier avant toute nouvelle recherche. Réutilise ce qui est vérifié sur les mêmes versions ; recontrôle ce qui dépend de modifications intervenues depuis. Le but est de gagner du temps sans propager une hypothèse périmée.

## 21 Sources et portée des références

Les deux fichiers fournis restent les sources principales. Les liens ci-dessous sont des sources officielles utiles au développement ; ils ne sont pas tous présentés comme nouvellement relus à la date de cette version. L’existence, la nature et les conditions générales d’accès de France Travail, FINESS et de la clé Annuaire Santé ont été revérifiées lors du cadrage du 14 septembre 2026. Aucun accès API propre au projet n’a été prouvé.

- S01 — [data.gouv.fr : API Offres d’emploi France Travail](https://www.data.gouv.fr/dataservices/api-offres-demploi). Source envisagée pour F15 ; accès et conditions à tester avec le compte projet.
- S02 — [data.gouv.fr : FINESS, structures](https://www.data.gouv.fr/datasets/finess-structures-1). Référentiel d’établissements ; ne remplace pas des offres d’emploi.
- S03 — [ANS : obtenir une clé API Annuaire Santé](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/getting-started/get-api-key.html). Accès nécessaire au contrôle RPPS V1 ; clé et appel réels à vérifier pour le projet.
- S04 — [Ordre national des infirmiers : annuaire de la profession](https://www.ordre-infirmiers.fr/annuaire-de-la-profession). Référence documentaire ; aucune étape de consultation humaine obligatoire n’est ajoutée au contrôle RPPS V1.
- S05 — [NestJS : modules](https://docs.nestjs.com/modules). Organisation du monolithe et frontières de responsabilités.
- S06 — [NestJS : validation](https://docs.nestjs.com/techniques/validation). DTO et contrôle des entrées.
- S07 — [PostGIS : ST_DWithin](https://postgis.net/docs/ST_DWithin.html). Distances, unités et indexation.
- S08 — [PostgreSQL : types intervalles](https://www.postgresql.org/docs/current/rangetypes.html). Intervalles et exclusion de chevauchements.
- S09 — [MongoDB : index TTL](https://www.mongodb.com/docs/manual/core/index-ttl/). Expiration des traces et limites du délai de suppression.
- S10 — [n8n : export et import de workflows](https://docs.n8n.io/workflows/export-import/). Livrables et reproductibilité des scénarios.
- S11 — [OWASP : stockage des mots de passe](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Choix et paramétrage du hachage.
- S12 — [OWASP : prévention des injections SQL](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html). Requêtes paramétrées et validation.
- S13 — [Node.js : crypto](https://nodejs.org/api/crypto.html). Usage des primitives et vérification du chiffrement authentifié.
- S14 — [CNIL : guide du recrutement](https://www.cnil.fr/fr/le-guide-du-recrutement). Finalités, information et traitement des données de candidature.
- S15 — [Service-Public : contrat de travail temporaire](https://www.service-public.gouv.fr/particuliers/vosdroits/F11215). Point de départ pour vérifier le scénario juridique exact.
- S16 — [Bulletin officiel : expérience préalable à l’intérim, note du 2 décembre 2025](https://bulletins-officiels.social.gouv.fr/note-dinformation-ndeg-dgosrh4rh5dgcssd4b2025149-du-2-decembre-2025-relative-la-duree-minimale-dexercice-prealable-linterim-au-sein-des-etablissements-de-sante-des-laboratoires-de-biologie-medicale-et-des-etablissements-et-services-sociaux-et). À confronter aux textes applicables au scénario au moment de l’implémentation.
- S17 — [RGAA : critères et tests](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/). Référence de la recette d’accessibilité demandée par le sujet.
- S18 — [RGESN : référentiel général d’écoconception](https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/). Choix de deux pratiques concrètes et documentation.
- S19 — [API Découpage administratif](https://geo.api.gouv.fr/decoupage-administratif). Source possible de communes ; distinguer centre de commune et lieu exact.

Fin du prompt. Commence par l’état réel du dépôt et la note de reprise, puis réalise la V1 et apporte les preuves sans élargir silencieusement le périmètre.
