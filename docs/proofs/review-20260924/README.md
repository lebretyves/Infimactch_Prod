# Preuves de la revue du 24 septembre 2026

- [Bilan](summary.json) : 688/688 unitaires, 95,00 % des lignes ; 192/192 intégrations ; 81/81 frontend.
- [Log unitaires](unit-coverage.txt), [couverture par fichier](unit-coverage-summary.json).
- [Suites complètes](full-suite-results.json), [comptage des intégrations](integration-counts.json).
- [Statut initial de la campagne](full-result.json) : FAIL au contrôle de sécurité, après réussite des suites. L’attente du test supposait qu’un candidat ayant postulé restait proposé, comportement modifié dans Epitech.
- [Relance corrigée](security-result.json), [cinq contrôles SQL](security-regressions.txt) : PASS. Le test utilise une autre mission sans candidature pour vérifier l’exclusion d’un compte désactivé ; l’assertion de sécurité n’est pas supprimée.
- [Frontend](frontend-tests.txt), [navigateur public](browser-tests.txt), [administration](admin-browser.txt), builds associés.

Les deux campagnes restent distinctes et les tests répétés ne sont pas additionnés. Les fichiers de preuve ne contiennent ni secrets ni exports de production. Les scénarios navigateur utilisent des API simulées. Aucun pourcentage ne garantit l’absence de bugs, la conformité RGAA ou une livraison email réelle.
