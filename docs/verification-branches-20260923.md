# Vérification des branches — 23 septembre 2026

**Mise à jour :** les six nouveautés ci-dessous ont maintenant été reprises et testées. Voir le [rapport d’intégration](quality/INTEGRATION_SIX_FONCTIONNALITES_2026-09-23.md). Le reste de cette page conserve le constat antérieur à cette intégration.

Les deux branches principales ont été vérifiées sur GitHub au même commit `60989e8691dc1e5e35767a717d3f9a9915293e53` : Yves `Main` et Epitech `main`. Les sauvegardes `backup/main-avant-sync-20260923-unit95` existent dans les deux dépôts.

Cela ne signifie pas que toutes les nouveautés des autres branches sont intégrées. Les références ont été actualisées et leurs commits comparés par ascendance, équivalence de patch et inspection des fichiers.

## Nouveautés confirmées non intégrées

| Commit | Date locale +02:00 | Auteur | Branche où le trouver | Changement |
| --- | --- | --- | --- | --- |
| ce90b77 | 22/09 23:26 | ziwazou | Epitech Backend | Regrouper Aide et cookies, en-tête fixe, pied de page ; nouveau HelpMenu absent de main |
| 3c189e1 | 22/09 23:26 | ziwazou | Epitech Backend | Dépôt de justificatifs et présentation des documents sur Mon dossier |
| c92220b | 23/09 13:49 | ziwazou | Epitech Backend | Restreindre les pages infirmier côté établissement et ajouter le brouillon de mission |
| 6945510 | 22/09 16:26 | mbabedse7ra | feature/google-maps-itinerary | Liens Google Maps ; CommuteLink et commute.ts absents de main |
| 500180c | 22/09 21:10 | mbabedse7ra | feature/admin-external-offers-visibility | Contrôle de visibilité des offres externes ; migration et service absents de main |
| b3a9941 | 22/09 21:43 | mbabedse7ra | feature/nurse-personal-calendar-confirmed-missions | Ajout au calendrier personnel ; composants et service absents de main |

Les branches de fonctionnalités sont imbriquées : ne pas additionner leurs compteurs de commits GitHub, qui incluent des ancêtres communs.

## Autres différences

- `chore/cleanup-tests-dead-code` : trois patches non équivalents, `6cb3f12`, `9f4d0ff`, `94c2c21`, concernent notamment suppressions de scripts/tests et renommages. Ils ne doivent pas être appliqués aveuglément à la nouvelle campagne de couverture.
- `fix/openapi-reverse-location` chez Yves : les deux fichiers de contrat API sont identiques à main ; la conservation du contrat OpenAPI est déjà prévue dans la CI.
- `fix/admin-mission-consulter` et `fix/inscription-message-diplome` sur Epitech : patches équivalents déjà présents.
- `fix/audit-seo` : og:url et canonical sont présents dans le HTML et les mises à jour de métadonnées ; le code a ensuite été réorganisé.
- Les anciens commits UI de `front_opti` et Backend ont été retravaillés dans la consolidation ; un SHA différent ne prouve pas une fonctionnalité manquante.
- Les différences de documents `docs_intern` / `docs` expliquent également des patches non identiques.

Aucune de ces six nouveautés n'a été fusionnée pendant cette vérification. Le périmètre déjà publié reste la consolidation et les 643 tests unitaires à 95,07 % de couverture des lignes backend.

CI : chez Yves, frontend et seuil unitaire validés ; campagne d'intégration et CI complète réussies (run 35861433985). Sur Epitech (run 35861649358), les jobs n'ont pas démarré : « The job was not started because an Actions budget is preventing further use. » Ce blocage ne prouve pas une erreur applicative.
