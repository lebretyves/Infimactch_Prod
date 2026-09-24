# Exigences InfiMatch

> Actualisation du 24 septembre : voir [l’état courant](ETAT_COURANT.md) pour les nouveaux rappels préparés, les tests et la différence avec la production. Les preuves datées ci-dessous conservent leur portée.
Version documentaire : 22 septembre 2026. Ce document définit le périmètre retenu et les conditions de validation. « Présent dans le code » ne signifie pas « recetté sur la version publiée ».

## 1. Références et priorité

Le [sujet Epitech D-WEB-901](references/D-WEB-901-project.pdf) fixe les exigences du rendu. Les décisions produit confirmées précisent le périmètre InfiMatch. Les anciens prompts et bilans sont archivés ; ils n'ajoutent pas de fonctionnalités obligatoires. Pagination du sujet ci-dessous : pages physiques, couverture incluse.

## 2. Acteurs et périmètre

| Acteur | Usage |
| --- | --- |
| Professionnel de santé | Profil, disponibilités, recherche, candidatures, agenda et documents personnels |
| Établissement / agence | Création et publication directe des missions, examen des candidatures et affectations autorisées |
| Administration | Assistance et exploitation selon les permissions du rôle |

InfiMatch assure la mise en relation. Les agences emploient et paient. Hors périmètre validé : paie, signature électronique et contrat complet. Le PDF de confirmation n'est pas présenté comme un contrat signé. La [répartition métier validée pour la démonstration](quality/PERIMETRE_METIER_A06_2026-09-22.md) distingue les responsabilités des acteurs, les contrôles logiciels et les étapes humaines.

## 3. Exigences du kick-off

| ID | Exigence | Critère d'acceptation | Preuve / état documentaire |
| --- | --- | --- | --- |
| K01 | Secteur et proposition de valeur, p. 3 | Justification santé, concurrence et besoin explicites | [Étude dans le dossier de soutenance](presentation/DOSSIER_SOUTENANCE.md) ; hypothèses terrain identifiées |
| K02 | Roadmap et estimation J+2, p. 3 | Fonctions retenues, charges par lot et cadrage présenté | [Planning](PLANNING_4_PERSONNES_11_JOURS.md), [chiffrage](CHIFFRAGE_V1.csv) ; validation J+2 à attester |
| K03 | Comptes et authentification, p. 3 | Deux familles, permissions, mots de passe hachés, sessions protégées, données sensibles chiffrées | Présent ; recette finale publiée à compléter |
| K04 | Missions et profils, p. 3 | Entreprise crée une mission ; candidat renseigne compétences, disponibilités et zone | Présent ; parcours complet à recetter |
| K05 | Matching et suivi, p. 3 | Critères explicables, suivi des états ouverte/pourvue/terminée | Présent ; [mesures ciblées](quality/OPTIMISATION_MATCHING_2026-09-20.md) distinctes de recette globale |
| K06 | Données publiques, p. 4 | Une source nettoyée et exploitée dans une fonction visible ; dates et lieux normalisés, doublons traités | Catalogue et scripts présents ; [contrat des offres](OFFRES_EXTERNES_V1.md) |
| K07 | Deux automatisations nocode, p. 4 | Deux workflows exécutés avec résultat métier observé | [Rapport du 18 septembre](AUTOMATIONS_VALIDATION_2026-09-18.md) ; nouvelles preuves finales à joindre |
| K08 | Accessibilité, p. 5 | Principes RGAA de base appliqués et expliqués | [Corrections ciblées](quality/RGAA_CORRECTIONS_2026-09-20.md) ; essais humains ouverts |
| K09 | Écoconception, p. 5 | Deux pratiques RGESN concrètes documentées | Réduction requêtes matching et [imports sobres](quality/IMPORTS_SOBRIETE_2026-09-19.md) |
| K10 | Données personnelles et cadre métier, p. 5 | Information utilisateur, finalités, bases et conservation ; périmètre contrat expliqué | Formalisation du responsable et de certaines durées encore ouverte |
| K11 | SEO public, p. 5 | Titres, descriptions, hiérarchie et sitemap utiles | Traitements et tests existants ; aucune indexation privée recherchée |
| K12 | Stack, tests et CLI, p. 6 | TypeScript frontend/backend, bases relationnelle et non relationnelle, unitaires/fonctionnels, couverture, outil CLI | Présents ; campagnes datées conservées, pas de taux global de conformité |
| K13 | Livrables et oral, p. 7–8 | Sept livrables, heures réelles et écarts, pitch et participation de tous | [Dossier de rendu](rendu/README.md) ; heures humaines et répétition à compléter |

## 4. Règles produit confirmées

| ID | Règle | Critère d'acceptation |
| --- | --- | --- |
| P01 | RIB facultatif | Aucun blocage d'inscription, de candidature ou de mission causé uniquement par son absence ; proposition après première mission |
| P02 | Domicile distinct de la zone d'alertes | Ville et rayon enregistrés modifiables ; une recherche ponctuelle ne change pas les alertes |
| P03 | Discord facultatif après création | Choix Configurer / Passer ; aucune nouvelle préférence cochée automatiquement ; réglages accessibles ensuite |
| P04 | Vérification professionnelle | État RPPS conservé, attente et échec explicites, aucune validation fictive ; distinguer éligibilité du matching et candidature volontaire |
| P05 | Décision humaine malgré un profil incomplet | Candidature et acceptation/refus possibles malgré les alertes sur les informations manquantes ou les écarts avec la mission ; permissions, dates et conflits d’affectation restent contrôlés côté serveur |
| P06 | Documents privés | Accès autorisé, métadonnées maîtrisées, chiffrement et distinction confirmation/contrat |
| P07 | Traçabilité honnête | Acceptation d'un email distincte de sa livraison ; configuration d'un service distincte de son fonctionnement prouvé |
| P08 | Administration protégée | Rôles, MFA et opérations sensibles journalisées ; le succès réel d'enrôlement du propriétaire doit être vérifié |

## 5. Validation et preuves

Une validation indique la version, la date, l'environnement, les scénarios et leurs limites. Les fixtures restent distinctes des données réelles. Les performances locales ne mesurent pas directement la production. Le tableau de [recette finale](rendu/RECETTE_FINALE.csv) conserve les étapes encore à vérifier.

La campagne matching du 20 septembre compare les résultats métier et le nombre de requêtes. Les modifications Discord/RPPS postérieures disposent de contrôles séparés. Aucune campagne ancienne n'est déclarée prouver toute la révision courante.

## 6. Conditions de clôture du rendu

- Sept livrables accessibles, code identifié et installation documentée.
- Parcours publié : candidature, confirmation, agenda, PDF, notifications et annulation.
- Deux automatisations nocode avec preuves de résultats ; réception externe attestée seulement si observée.
- Heures humaines et écarts fournis par l'équipe, cadrage et répétition attestés.
- Réserves RGPD, accessibilité et exploitation explicitement traitées ou présentées comme ouvertes.

## 7. Améliorations distinctes du sujet

Diagnostic détaillé des connexions, chronologie admin centralisée et tableau de gains sont des recommandations, pas des exigences explicites du kick-off. La fiabilité de l'interface et la visibilité des listes tronquées restent des améliorations identifiées. Leur absence ne doit pas être confondue avec l'absence des fonctions métier déjà présentes.

## Documentation de référence

[Architecture technique](SCHEMA_ARCHITECTURE_V1.md), [flux métier](FLUX_V1.md), [automatisations et preuves](AUTOMATISATIONS.md), [guide utilisateur](GUIDE_UTILISATEUR.md) et [inventaire documentaire](INVENTAIRE_DOCUMENTAIRE.md). Les six tutoriels vidéo ont été réenregistrés et contrôlés le 21 septembre 2026 : [périmètre et preuves](quality/TUTORIELS_VIDEO_2026-09-21.md). La répétition humaine du support oral reste à faire.

### Profil incomplet, RPPS et décision humaine

Bloquer systématiquement une candidature ou son examen parce que le profil est incomplet serait trop restrictif. Le candidat peut candidater et l’entreprise ou l’agence peut accepter ou refuser malgré les avertissements correspondant aux informations manquantes et aux écarts avec la mission. Le statut RPPS est conservé sans validation fictive. Les permissions, les dates et les conflits d’affectation restent contrôlés.

Le réglage `DEMO_OPTIONAL_RPPS=true` concerne le critère RPPS du matching interne. Sans ce réglage, ce critère redevient strict dans le matching ; cela ne rend pas les alertes RPPS automatiquement bloquantes pour une candidature volontaire ou son acceptation. Les horaires doivent être confirmés avant l’affectation. Les offres externes conservent leur comparaison partielle et leurs propres conditions.

La [politique de candidature et d’affectation](quality/POLITIQUE_CANDIDATURE_AFFECTATION_2026-09-22.md) détaille cette distinction, les avertissements et les tests associés.
