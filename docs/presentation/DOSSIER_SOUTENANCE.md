# Dossier de soutenance InfiMatch

Actualisation technique du 21 septembre 2026 ; étude de marché et références externes conservées avec leur date du 19 septembre, sans nouvelle recherche marché dans cette passe. Ce dossier ne constitue ni un procès-verbal de recette globale, ni une preuve de publication des derniers correctifs.

## Livrables utilisables

- [PowerPoint éditable, 12 diapositives](InfiMatch_Soutenance.pptx), avec notes orales dans chaque diapositive.
- [PDF imprimable, 12 pages](InfiMatch_Soutenance.pdf).
- [Scénario de démonstration et secours](DEMONSTRATION.md).
- [Données éditables du support](slides.json) et [générateur local](generate.py).
- [Contrôle de mise en page](validation-layout.json) : dimensions des textes PDF contrôlées lors de la génération.

Le storyboard provient de la section 24 du document de travail local `Interimatch_Sante_Etude_Parcours_Roadmap.docx`. Ses douze messages sont conservés, mais sa répartition historique sur cinq personnes est remplacée par le [planning actuel à quatre personnes](../PLANNING_4_PERSONNES_11_JOURS.md). Les noms des membres, la date et la durée officielle de soutenance sont reportés à l’équipe, sans données inventées.

## Marché : faits, interprétations et limites

S1 — [France Travail, synthèse BMO 2026](https://www.francetravail.fr/actualites/a-laffiche/2026/se-reconvertir-professionnelleme.html), consultée le 19 septembre 2026 : 36 700 projets de recrutement pour les infirmiers et sages-femmes, dont 60,2 % jugés difficiles. Il s’agit d’intentions de recrutement tous contrats, pas du seul intérim ni du nombre de clients accessibles à InfiMatch. Aucun chiffre d’affaires prévisionnel ni marché adressable fiable ne découle directement de cette donnée.

S2 — [Appel Médical](https://www.appelmedical.com/), consulté le 19 septembre 2026 : le site public expose recherche d’offres de santé, entrée établissement, portail intérimaire et documents administratifs. Nous n’avons pas audité son espace connecté ; ses résultats commerciaux ne sont pas attribués à InfiMatch.

S3 — [Hublo](https://hublo.com/fr), consulté le 19 septembre 2026 : l’offre publique présente la gestion des remplacements et la communication pour les établissements de santé. Ce modèle de logiciel RH diffère d’un simple agrégateur d’offres et d’une ETT. Aucune comparaison chiffrée de performance n’a été réalisée.

Positionnement proposé : rendre compréhensibles les conditions d’une mission et leur correspondance avec le profil, tout en conservant une décision humaine. Cette proposition reste une hypothèse de valeur tant qu’aucune étude terrain ou mesure d’usage ne l’a validée. Le besoin est documenté ; la viabilité économique n’est pas démontrée.

## Scénario pédagogique et limites métier

S4 — [Service Public, contrat de travail temporaire](https://www.service-public.gouv.fr/particuliers/vosdroits/F11215), page vérifiée le 19 juin 2026, consultée le 19 septembre 2026. Le schéma présenté distingue le contrat de mission entre salarié et ETT, et la mise à disposition entre ETT et entreprise utilisatrice. Les formalités contractuelles sont distinctes d’un récapitulatif de mission.

InfiMatch est présenté comme un projet étudiant. Les affectations de démonstration utilisent des personnes fictives. Le [PDF de confirmation ou d’annulation](../quality/PDF_MISSIONS_UNE_PAGE_2026-09-19.md) récapitule l’état applicatif ; il n’est ni un contrat complet signé ni une preuve que toute obligation liée à l’intérim est satisfaite. Un bouton d’annulation ne décide pas de la validité juridique d’une rupture réelle. Le dossier ne certifie aucune autorisation d’activité d’ETT ni l’adéquation d’un cas réel au régime du travail temporaire.

Le RPPS facultatif lors de l’inscription ne vaut pas vérification professionnelle. Le CV propose des données déclarées, sans authentifier une identité, un diplôme ou un droit d’exercice. Un usage réel suppose de faire valider séparément le cadre opérateur, les vérifications professionnelles, les contrats et les responsabilités de traitement ; ces décisions ne sont pas attribuées automatiquement à Epitech.

## Roadmap : plan initial et réalisé disponible

| Phase initiale | Preuve disponible | Ce qui reste à établir |
|---|---|---|
| J1–J2 : cadrage, marché, architecture, contrats API | Étude, planning et chiffrage existent ; documentation API exportée | Preuve de remise/validation effective à J+2 non reconstituée |
| J3–J7 : profils, missions, matching, données, automatisations | Code et tests par lot ; exports n8n ; parcours documentés | Répétition intégrée sur la version qui sera remise |
| J8–J9 : sécurité, accessibilité, sauvegarde, correction | Recettes ciblées ; correctifs ; restauration isolée réussie | Vérifier les parcours connectés et la configuration réelle des derniers lots |
| J10–J11 : preuves, dossier, pitch, livraison | Ce support et le scénario de secours sont préparés | Répétition collective, temps humains, couverture finale et SHA de remise |

Ce tableau compare des jalons prévus à des preuves disponibles ; il n’invente aucune date réelle de réalisation. Le [chiffrage de référence](../CHIFFRAGE_V1.md) reste 348–528 heures-personnes, détail dans [le CSV](../CHIFFRAGE_V1.csv). Il remplace pour cette présentation l’ancienne hypothèse de 288 heures figurant dans le document de travail initial. La capacité de quatre personnes sur onze jours vaut 44 journées-personnes ; leur durée productive n’a pas été fournie.

Les heures effectivement consacrées au projet sont à renseigner par l’équipe dans [le relevé des temps humains](../rendu/TEMPS_HUMAINS.csv). Le réalisé reste inconnu tant que ce relevé n’est pas complété : ni les commits ni les durées d’exécution des outils ne remplacent ces heures. Aucun coût humain ou gain de productivité n’est présenté comme mesuré.

## État des versions et preuves techniques

Les versions applicatives et déploiements vérifiés figurent dans [le registre de livraison](../rendu/LIVRAISON_VERIFIEE.json). Le manifeste du rendu identifie le commit remis ; la [matrice des 42 scénarios](../quality/MATRICE_42_TESTS_2026-09-19.md) reste une campagne historique, distincte de la recette finale.

| Lot | Preuve locale | Réserve de présentation |
|---|---|---|
| CV enrichi | [Contrat et 17 tests ciblés](../quality/LECTURE_CV_ENRICHIE_2026-09-19.md) | Parcours intégré dans le frontend ; recette actuelle et qualité des extractions à vérifier, jamais une certification |
| Récupération autonome | [Parcours et contrôles](../quality/RECUPERATION_AUTONOME_2026-09-19.md) | Configurer et recetter le canal réel avant promesse d’envoi |
| Livraison email | [Modèle des statuts et webhook](../EMAILS_LIVRAISON.md) | Accepté ≠ livré au serveur ≠ lu ; webhook fournisseur à vérifier |
| Limiteurs partagés | [Tests atomiques multi-instance](../quality/LIMITEURS_PARTAGES_2026-09-19.md) | Contrôles présents dans le code livré ; la recette ciblée reste datée |
| Sauvegarde | [Restauration de copie réelle](../quality/restore-production.json) et [fixture chiffrée](../quality/restore-synthetic.json) | La copie réelle ne contient aucun document ; le déchiffrement est prouvé sur fixture, pas sur d’anciens PDF absents |
| Imports sobres | [Créneaux et limites](../quality/IMPORTS_SOBRIETE_2026-09-19.md) | Nouveau succès fournisseur→base→interface à observer |
| API | [Contrat OpenAPI](../openapi.json) | Réexporter si les dernières réponses changent avant remise |

Les nombres de tests de campagnes différentes ne sont pas additionnés. Aucun pourcentage global de couverture, de conformité RGAA ou de satisfaction n’est inventé. Les [42 scénarios](../quality/MATRICE_42_TESTS_2026-09-19.md) distinguent réussi, partiel et restant ; ce n’est pas « 42/42 validés ».

## Écoconception, accessibilité et achats responsables

Deux pratiques concrètes sont documentées : regrouper les requêtes de matching et limiter les imports avec réutilisation du parsing. Sur le banc local de 1 000 profils côté recruteur, 2 015 requêtes SQL sont devenues 35 avec les mêmes résultats métier comparés. La reprise n8n est publiée toutes les quatre heures ; les imports gardent leurs créneaux séparés. Montrer les limites avant/après et les journaux d’exécution, sans transformer le nombre d’appels évités en quantité de CO₂ sans méthode.

Pour l’achat et le réemploi : privilégier le matériel déjà disponible, entretenir et réparer, puis examiner le reconditionné si un achat est nécessaire. Cette orientation n’est pas la preuve d’un achat réalisé ; aucun inventaire matériel ni gain environnemental mesuré n’est disponible. La prolongation de durée de vie est un choix proposé, pas une obligation déjà exécutée.

Présenter les contrôles clavier, responsive, focus et erreurs réellement rejoués. Ne pas assimiler une série de contrôles ciblés à un audit RGAA complet, ni un PDF lisible à une certification PDF/UA. La recette sur lecteurs d’écran et appareils physiques doit garder son état réel.

## Décisions et validations restantes

| Proposition | État / décision attendue |
|---|---|
| MFA administrateur et secours | Implémenté et portail publié avec QR de configuration ; enrôlement réel du propriétaire et récupération à attester séparément |
| Contrat complet et signature | Cadrer le rôle opérateur, le modèle, les données et le prestataire avant développement/publication |
| Fiches mission publiques, pages métier/ville et JobPosting | Décision éditoriale et confidentialité à valider avant exposition ; aucun candidat publié |
| Hébergement pérenne n8n | Comparer continuité après essai, coûts, maintenance et sauvegarde ; aucune migration implicite |
| Changement de pondération du matching | Demande de mesure et validation distincte ; aucune optimisation statistique affirmée |
| Membres, heures réelles, date et durée de soutenance | Éléments reportés à l’équipe ; aucun nom, temps ou calendrier inventé |
| Démo RPPS | Bouton de contournement abandonné ; inscription sans RPPS inchangée, pas de faux statut vérifié |

## Validation du support

Les douze diapositives PPTX sont éditables ; les douze pages PDF sont générées depuis la même source. Le générateur vérifie les bornes de texte PDF. Les liens relatifs de ce dossier sont contrôlés à la livraison. Le rendu PowerPoint peut varier selon les polices et la version : vérifier le diaporama sur la machine de soutenance. Le PDF constitue une version de secours stable.


## Actualisation du 24 septembre 2026

Déclaration équipe : 5 personnes prévues (385 h), 4 effectives, 11 jours de 7 h et environ 2 h le soir, soit environ **396 h**, dont 88 h le soir. Cette déclaration actualise les mentions historiques de temps inconnus ; la ventilation par lot reste à établir. Valorisation employeur hypothétique et matériel amorti : **12 800,98 EUR**. Exploitation avec un salarié et matériel : **5 265,30 EUR/mois**. Détail et hypothèses : `docs/rendu/2026-09-23/09_COUTS_PRODUCTION.md`.
