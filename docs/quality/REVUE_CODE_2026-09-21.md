# Revue du code — 21 septembre 2026

## Périmètre et méthode

Analyse des imports de l’ensemble des sources TypeScript applicatives (147 fichiers backend et 158 fichiers frontend après nettoyage, dont cinq scripts de recette admin), compilation et tests. Relecture ciblée des accès, sessions/MFA, documents privés, traitements différés, parseur d’offres et adaptateurs API. Il ne s’agit pas d’une lecture manuelle exhaustive de chaque ligne ni d’une garantie d’absence de défaut.

Le graphe part des entrées de production et est recoupé avec les scripts et tests. Le module `purge-demo-alerts.ts`, invoqué par un script opérateur, et les cinq recettes navigateur admin restent volontairement hors du graphe de production.

## Corrections

| Constat | Correction et contrôle |
| --- | --- |
| Anciennes interfaces, données de démonstration et expérience de parseur sans consommateur | 17 fichiers retirés après sauvegarde hors dépôt. Les composants actuels de RIB facultatif et de préférences restent actifs. |
| Imports, paramètres et calculs inutilisés | Nettoyage ciblé ; compilation backend avec `noUnusedLocals` et `noUnusedParameters`. Retrait d’une lecture de maintenance inutilisée dans la liste des sources. |
| Test MFA dépendant d’un secret d’environnement | Clé temporaire isolée et restaurée ; le test altère le contenu de l’enveloppe chiffrée puis vérifie le rejet. |
| Réponses API nulles, non JSON ou incohérentes | Refus d’une confirmation non valide ; aucun renvoi automatique d’une mutation. CSRF mal formé : écriture bloquée avant envoi. Les détails d’erreur serveur admin ne sont plus affichés. |
| Erreur de rendu dans l’administration | Écran de secours lisible, bouton Réessayer et rappel de vérifier le résultat d’une action avant de la renouveler. |
| Indicateur de reprise périmé après 70 minutes pour un cycle de quatre heures | Seuil de cinq heures ; refus des dates manquantes, invalides ou futures. |
| Relevé d’exécution d’outil sans valeur de temps humain | Archive hors dépôt ; le dossier renvoie au relevé humain à compléter, sans heures inventées. |

Les commentaires techniques et les licences sont conservés. Aucun auteur humain ni résultat de recette n’est inventé. Les preuves historiques gardent leur date et leur portée.

## Validation locale obtenue

- Backend : compilation réussie, **332 tests unitaires réussis**.
- Intégrations : **160 tests réussis dans 24 fichiers**, bases PostgreSQL/MongoDB isolées, trois workflows réellement publiés et exécutés sur n8n local ; cinq contrôles supplémentaires de sécurité PostgreSQL réussis. Aucun appel à n8n Cloud pour ces contrôles.
- Frontend : tests réguliers réussis, dont 18 tests des adaptateurs API public/admin ; compilation publique et administration réussies.
- Navigateur : notifications lues, recommandations mixtes, erreurs réseau/serveur/données et chargement lent ; écran de secours et récupération. Recette admin : activation/MFA simulés, rôles, confirmation explicite, mobile, déconnexion et réponse de rendu incohérente récupérée.
- `npm audit --omit=dev` : aucune vulnérabilité signalée dans les dépendances de production backend et frontend au moment du contrôle. Ce résultat ne constitue pas un audit de sécurité complet.
- Recherche des secrets locaux connus : aucun retrouvé dans les fichiers suivis. L’historique Git complet n’est pas certifié par ce contrôle.

La recette admin est intégrée à la validation régulière via `npm run test:admin --prefix frontend`, après compilation admin et installation de Chromium Playwright (ou Edge sous Windows). Les appels métier y sont simulés ; elle ne prouve pas l’enrôlement MFA du compte réel.

## Limites restant ouvertes

La recette complète de la version publiée, les destinations de notifications réelles, l’enrôlement MFA du propriétaire et les contrôles humains d’accessibilité restent distincts. Certaines listes admin demeurent limitées ; leur pagination doit être vérifiée écran par écran. Les composants volumineux et les types `any` de l’administration restent une dette de maintenance, sans refonte générale dans ce lot. Les dates, les tarifs et les quantités ne sont pas des économies financières ou carbone mesurées.

Preuves compactes : [résultat isolé](../proofs/code-review-2026-09-21/result.json), [24 suites](../proofs/code-review-2026-09-21/suite-results.json), [empreintes du serveur testé](../proofs/code-review-2026-09-21/source-snapshot.json) et [graphe des imports](../proofs/code-review-2026-09-21/static-import-graph.json). Les journaux complets sont conservés dans le dossier local d’audit.
