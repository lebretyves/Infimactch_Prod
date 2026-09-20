# Campagne locale finale — 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

**Résultat : PASS, sur un instantané backend stable.** 306 tests unitaires et 148 tests d’intégration répartis sur 22 fichiers ont réussi : **454 tests, aucun échec, aucun test ignoré ou annulé**. Cinq scénarios supplémentaires de régression de sécurité PostgreSQL ont également réussi ; ils sont distincts des 454 tests et ne gonflent pas ce total.

Ce résultat valide le code local testé. Il ne constitue ni une preuve de déploiement, ni une preuve de réception d’email réel, ni une certification de conformité RGAA/RGPD.

## Preuves et instantané

- Fin de campagne : 19 septembre 2026, 20 h 41 UTC, soit 22 h 41 à Paris.
- SHA-256 combiné des fichiers backend/src, backend/test et backend/package.json : `88bd782045c4f5d155c98e665b3b1a13198dc0745111887c62b1492447f18644`. Il s’agit d’une empreinte de sources, pas d’un commit Git.
- Synthèse versionnable : [tests-final-summary-2026-09-19.json](tests-final-summary-2026-09-19.json).
- Preuves locales détaillées : `E:/Interimatch/audits/2026-09-19-final-tests/complete-final` (`result.json`, `source-snapshot.json`, `summary.json`, journaux par fichier, `regressions.txt`, `cleanup.txt`).
- Rapport de couverture local : `docs/proofs/coverage/index.html` et `coverage-summary.json`.
- Export OpenAPI : [../openapi.json](../openapi.json), **150 chemins, 168 opérations, zéro contrat de succès manquant et zéro corps de requête vide détecté**. Le webhook interne conserve uniquement son Bearer ; le BIC reste facultatif.

## Couverture mesurée

| Mesure backend | Couvert / total | Taux |
| --- | --- | --- |
| Lignes et instructions | 10 359 / 11 503 | 90,05 % |
| Branches | 3 645 / 4 275 | 85,26 % |
| Fonctions | 711 / 850 | 83,64 % |

La couverture c8 inclut les sources backend TypeScript et leurs fichiers compilés après remappage. Elle provient des processus unitaires et d’intégration. Les appels des workflows vers l’API séparée sont réellement exécutés mais ne constituent pas, à eux seuls, une mesure de couverture de ce processus. Aucune couverture frontend n’est déduite de ce rapport. Le script de peuplement de démonstration demeure notamment peu couvert (7,89 % des lignes). Un taux global élevé ne prouve pas l’absence de défauts.

## Parcours exercés

Les intégrations couvrent notamment l’administration, les avertissements non bloquants à l’affectation, le stockage cloud simulé, les conversions entreprise, l’exclusion des anciennes annonces fictives, les états de livraison email, les parcours entreprise/intérimaire, l’annuaire des établissements, la collecte d’offres, les crédits JobsPipe, le tri des annonces, le matching, les garde-fous des missions, les confirmations et annulations, les notifications, la fraîcheur des offres, les corrections personnelles, le profil après affectation, la purge ciblée, la récupération de mot de passe, les limiteurs partagés et les tickets de support.

Les trois workflows n8n de confirmation, notification de correspondance et relance sont importés et publiés dans une vraie instance locale. Le parcours d’intégration exerce leur fonctionnement avec PostgreSQL et MongoDB isolés.

Les cinq régressions de sécurité supplémentaires vérifient :

1. L’exclusion des comptes désactivés des candidats, notifications, sélections et affectations, ainsi que la révocation de plusieurs sessions par la CLI.
2. La réactivation, la révocation des sessions et la conservation d’une affectation déjà confirmée lors d’une désactivation.
3. La création et la lecture du PDF de confirmation même lorsque le quota d’envoi de documents est atteint.
4. Le nettoyage des fichiers avec deux connexions SQL concurrentes : conservation du fichier non encore validé en transaction et suppression d’un véritable orphelin.
5. Le remplacement des coordonnées bancaires à la limite du quota, en comptant uniquement la version active.

## Environnement et isolation

`scripts/security/isolated.mjs` démarre des conteneurs éphémères PostgreSQL/PostGIS, MongoDB et n8n sur les ports locaux 55433, 57018 et 55679. L’API locale utilise 3210. Les identifiants sont aléatoires et propres au test ; la configuration du processus repose sur une liste limitée de variables système. Les clés SMTP2GO, Resend, RPPS, France Travail, JobsPipe et Discord sont absentes. Aucun fichier `.env` applicatif n’est chargé et aucun email réel n’est envoyé.

Les fixtures RPPS ne constituent pas des vérifications de professionnels réels. Les dépendances fournisseurs sont simulées lorsqu’un service externe serait nécessaire. Le nettoyage a retiré les trois conteneurs et le réseau du projet Compose de test.

`scripts/security/test-suite.cjs` exécute les fichiers d’intégration séquentiellement et recrée le schéma PostgreSQL ainsi que la base MongoDB de test avant chaque fichier. Les garde-fous de nom de base, hôte, port et NODE_ENV précèdent tout effacement. Le test de migration des relances applique volontairement le schéma antérieur, injecte les anciennes missions fictives puis applique la migration ciblée et ses successeurs.

Les tests admin et journey réinitialisent les compteurs de limitation entre cas indépendants ; aucune limite n’est modifiée dans le code produit. Les tests dédiés vérifient toujours le partage atomique des quotas entre instances, le rejet HTTP429 et le comportement en panne.

## Corrections nécessaires à la recette

Le premier passage a révélé des fixtures historiques devenues incompatibles : dates2030–2037 au-delà du nouvel horizon, changements de noms désormais verrouillés, rappels datés depuis la création au lieu de la publication, quota partagé accumulé entre cas et attente d’une ancienne version de parsing. Les fixtures ont été corrigées en conservant les contrôles actuels et les scénarios de refus de sécurité.

Les cinq contrats de succès OpenAPI manquants et les 33 corps de requête documentaires vides ont été complétés avant la campagne finale. L’export local final ne présente plus ces manques. Le runner a également été corrigé pour interpréter une sélection vide de fichiers comme une campagne complète. Les passages diagnostiques antérieurs restent conservés dans le dossier d’audit ; leurs résultats ne sont pas mélangés au total final.

## Reproduire

Depuis la racine du dépôt : `node scripts/security/isolated.mjs`. Docker et les images épinglées sont requis. `INFIMATCH_TEST_PROOF_DIR` choisit un dossier local de preuves. `INFIMATCH_TEST_FILES` limite exceptionnellement une reprise à des noms compilés séparés par des virgules ; sans cette variable, ou si elle est vide, le runner lance toute la campagne et la couverture. Les régressions de sécurité suivent seulement si la suite réussit. Toute modification des sources backend pendant la campagne invalide son résultat final.

Puis lancer `node scripts/security/summarize-tests.cjs <dossier-de-preuves>` pour consolider les compteurs.

La publication et les vérifications après déploiement restent suivies séparément par le coordinateur. Aucun commit, push ou déploiement n’a été effectué par cette campagne.