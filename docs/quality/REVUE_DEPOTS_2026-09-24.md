# Revue des dépôts, du code et de la documentation — 24 septembre 2026

## Résultat

La branche `chore/review-doc-code-20260924` réunit les deux bases principales, le dossier financier et les changements de notifications préparés. Elle contient les corrections documentaires et les nouveaux tests. Elle n’est pas une preuve de déploiement.

## Périmètre réellement vérifié

- Comparaison de **1 739 fichiers**, représentant **248 454 lignes de texte**, avec les deux branches principales récupérées sur Git : [registre par fichier](COMPARAISON_FICHIERS_2026-09-24.json). Les fins de ligne seules sont normalisées pour la comparaison ; les différences réelles restent signalées.
- Vérification structurelle des fichiers, JSON et liens Markdown locaux ; classification des documents, doublons par empreinte SHA-256, contrôle des manifestes du rendu et de la photographie n8n.
- Revue sémantique des changements réunis, en particulier notifications, destinataires, affectations, journal email, API et filtrage des candidats ; lint/typage, suites backend/frontend et parcours navigateur.
- Ce contrôle intégral des fichiers et lignes **n’est pas une certification manuelle de la logique de chaque ligne**. Les tests et l’analyse ciblée ne prouvent pas l’absence de défaut dans tout le projet. Les URL privées ne deviennent pas accessibles aux collègues sans droits GitHub.

## Écarts corrigés

| Écart | Correction |
| --- | --- |
| Epitech main en avance sur Yves Main | Commit `856ff02` conservé : 42 fichiers d’interface et ajustements backend |
| Coûts et notifications sur branches séparées | Branches réunies dans cette revue, sans écraser le PowerPoint ouvert dans l’autre copie locale |
| 11 copies documentaires identiques | Suppression avec [empreintes et remplacements](NETTOYAGE_DOUBLONS_2026-09-24.json) ; liens réparés |
| Anciennes présentations présentées comme courantes | Marquées historiques ; liens vers le rendu et le complément actuels |
| Heures indiquées inconnues malgré la déclaration équipe | 396 h déclarées distinguées de la ventilation par fonctionnalité encore à fournir |
| `REMINDER_DELAY_MINUTES` présenté comme actif | Indiqué hérité ; le code fixe les relances de missions non pourvues à 24 h |
| Nouveaux rappels assimilables à la production | [État courant](../ETAT_COURANT.md), exports inactifs et limite H-2 explicites |
| Chiffres obsolètes dans les supports | PDF, PPTX, DOCX et sources actualisés avec les preuves du 24 septembre |
| Contrôle documentaire bloqué par le PowerPoint ouvert | Exclusion des verrous Office et caches Python ; fichiers illisibles signalés sans plantage global |
| Couverture unitaire sous le seuil après ajout | Tests de confidentialité, dates, erreurs et annulations ; retour à 95,00 % sans exclusion de code |
| Régression de sécurité fondée sur un ancien comportement | Test adapté : les candidats ayant déjà postulé ne sont pas proposés à nouveau ; exclusion des comptes désactivés vérifiée sur une mission sans candidature |

Le code de production du filtrage n’a pas été affaibli pour satisfaire le test. Le script FINESS existe bien ; il conserve les corrections de lancement sans shell sous Windows et ses tests passent.

## Résultats de validation

[Preuves et limites](../proofs/review-20260924/README.md).

- Backend : **688/688 tests unitaires**, **95,00 % des lignes** (12 027 / 12 659), 90,12 % des branches, 82,63 % des fonctions.
- Intégration : **192/192**, 30 suites, PostgreSQL/PostGIS, MongoDB et vrais workflows n8n locaux.
- La campagne complète a ensuite échoué sur l’ancienne attente du test de sécurité. Après correction de ce test, une campagne ciblée a réussi : quatre intégrations de rappels et cinq contrôles SQL réels. Les preuves initiales FAIL sont conservées ; les tests répétés ne sont pas additionnés.
- Frontend : **81/81**, typage et builds public/admin réussis ; scénarios navigateur public et administration réussis avec API simulées.
- FINESS : résolution officielle et lancement du processus vérifiés avec transport simulé, sans téléchargement ni import de production.
- Horaires n8n : quatre tests existants réussis ; cadence quatre heures conservée.
- Contrôle des secrets connus : aucun secret local configuré détecté dans les fichiers suivis ; ce n’est pas un audit cryptographique de tout l’historique.

## Branches secondaires

Le [registre des branches](BRANCHES_2026-09-24.json) indique les commits non ancêtres. Ces compteurs ne sont pas des fonctionnalités manquantes : plusieurs reprises ont été faites par cherry-pick ou consolidation. Le [rapport des six fonctions intégrées](INTEGRATION_SIX_FONCTIONNALITES_2026-09-23.md) conserve la correspondance des commits. FINESS a également été repris avec corrections de lancement. Les suppressions de tests des anciennes branches cleanup ne sont pas réappliquées. Aucun historique ni branche de sauvegarde n’a été supprimé.

## Documents conservés et limites ouvertes

Les preuves datées, photographies n8n et références du sujet sont conservées. Les modèles de workflow maintenus et la photographie publiée ont des usages distincts ; leur contenu identique à une date ne justifie pas de perdre cette provenance. Les index relient maintenant les guides courants, livrables, hypothèses financières et historiques.

Les nouveaux rappels nécessitent toujours migration/déploiement, association des credentials n8n et activation des événements Discord pertinents. Le raccordement SMTP2GO reste à vérifier : 14 retours webhook en échec observés, livraison réelle non confirmée. La cadence de quatre heures préserve le quota mais ne garantit pas H-2. La recette humaine, la preuve de cadrage J+2, le responsable des données et le détail des heures restent à compléter. La maintenance Vault reste manuelle, conformément au choix de l’utilisateur.

Aucun workflow Cloud, import de production, email ou message Discord n’a été déclenché par cette revue.
