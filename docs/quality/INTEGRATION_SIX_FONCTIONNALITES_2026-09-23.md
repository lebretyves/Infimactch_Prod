# Intégration des six fonctionnalités — 23 septembre 2026

Les six nouveautés identifiées dans les branches secondaires ont été reprises avec leur provenance Git (`cherry-pick -x`) dans `integration/six-features-20260923`, à partir de `c1e7c2f`.

| Source | Commit repris | Fonctionnalité |
| --- | --- | --- |
| 6945510 | d0ec711 | Itinéraire Google Maps |
| 500180c | d2e2019 | Visibilité des sources externes dans l'administration |
| b3a9941 | 808071a | Export des missions confirmées vers un calendrier personnel |
| ce90b77 | 5fbd00e | Menu Aide et cookies, en-tête et pied de page |
| 3c189e1 | 38cba28 | Dépôt de justificatifs et liste des documents |
| c92220b | 7c4c0c8 | Restrictions des pages infirmier et brouillon de mission |

Les historiques contiennent des reprises de patches : les compteurs « ahead/behind » GitHub ne représentent pas un nombre de fonctionnalités manquantes. Les suppressions de tests de la branche cleanup ne sont pas reprises.

## Revue du code

**Verdict : APPROVE** après corrections et vérifications. Aucun défaut P0/P1 identifié ne reste ouvert dans ce périmètre.

Corrections apportées pendant la revue :
- Une panne de lecture de visibilité n'interrompt plus les recommandations internes ; un seul chargement des sources par requête.
- Les favoris respectent le masquage des sources, sans effacer les favoris enregistrés.
- Le nouvel endpoint de visibilité décrit les champs `visible` et `reason` dans OpenAPI.
- Les exports ICS échappent CR/LF, replient les lignes sans couper les caractères Unicode et rejettent les périodes inversées ou vides.
- Modifier les heures d'une mission de nuit existante n'ajoute plus un jour à sa fin.
- Les scénarios existants conservent leurs assertions et utilisent le nouveau libellé accessible du créneau ; les offres fictives utilisent un fournisseur autorisé.

## Vérification

Preuves versionnées : [docs/proofs/six-features-20260923](../proofs/six-features-20260923/).

- Backend unitaire : **652/652**, 0 échec ; **95,08 % des lignes** (11 710 / 12 315), 89,95 % des branches et 82,32 % des fonctions. Aucun périmètre de couverture supprimé.
- Frontend unitaire : **81/81**, 0 échec ; typecheck et builds application/administration réussis.
- Intégration : **185/185**, répartis sur 28 fichiers, sur PostgreSQL/PostGIS, MongoDB et n8n isolés. Les quatre tests de visibilité vérifient listes, détail, comparaison, favoris, recommandations, audit et refus sans autorisation.
- Cinq contrôles de sécurité SQL réels réussis.
- Parcours Playwright existants application et administration réussis, ainsi que les contrôles SEO. Tests ciblés supplémentaires : brouillon agence/établissement, restrictions de rôle, téléchargement ICS, menu Aide/cookies, retrait du justificatif et remise à zéro de sa confirmation. Les API des scénarios UI sont simulées ; les contrôles SQL ci-dessus exercent la base réelle isolée.

La campagne isolée contient 650 tests unitaires et 185 intégrations ; deux tests d'origine supplémentaires ont ensuite été conservés et la suite unitaire finale relancée (652). Aucune source backend n'a changé entre la campagne isolée réussie et cette conservation de tests. Le fichier `isolated-source-snapshot.json` identifie exactement le périmètre de la campagne isolée.

Commandes reproductibles : `npm run coverage:unit`, `npm test --prefix frontend`, `npm run build --prefix frontend`, `npm run build:admin --prefix frontend`, `npm run test:browser --prefix frontend`, `npm run test:admin --prefix frontend`, `npm run test:isolated`.

## Préparation production

Le 23 septembre, la migration additive `ExternalVisibility1790024000000` a été appliquée après sauvegarde chiffrée de PostgreSQL et de sa configuration. La colonne `source_control.visible` vaut `true` par défaut : les catalogues existants restent visibles. Aucun import externe ni workflow n8n de production n'a été déclenché pour ces tests.

La tentative de sauvegarde complète a échoué sur la connexion MongoDB (`MongooseServerSelectionError`). La sauvegarde PostgreSQL/configuration suivante a réussi ; elle couvre les données affectées par cette migration SQL et ne constitue pas une sauvegarde MongoDB.

Les neuf exports n8n actifs vérifiés restent dans [docs/n8n/published-20260923](../n8n/published-20260923/). Google Maps et Google Calendar utilisent des liens sortants et un fichier ICS, sans nouvelle clé d'API.
