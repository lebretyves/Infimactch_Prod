# État courant — revue du 24 septembre 2026

Cette page est le point d’entrée pour le rendu. Une présence dans cette branche n’est pas une preuve de publication en production.

## Versions réunies dans la branche de revue

- Yves `Main` observé : `53c09bd6faf0afff4cbb03f39ba9de3dd02e1bc2`.
- Epitech `main` observé : `856ff02ab53a24940b4be24c18c0a71ac5f48f24` : un commit supplémentaire, 42 fichiers modifiés. Ses corrections d’interface et de recommandations sont conservées.
- Dossier financier : branche `docs/couts-projet-exploitation-20260924`, jusqu’à `fb3e22f`, réunie dans cette branche de revue.
- Notifications et alignement des boutons : changements locaux enregistrés dans `2dad137`, réunis et revus ici.
- Travail consolidé : `chore/review-doc-code-20260924`. Les branches principales et la production ne sont pas modifiées par cette revue.

## Ce qui est observé en production

La campagne du 24 septembre confirme le passage des relances de missions non pourvues toutes les quatre heures. Trois rappels internes étaient présents, 31 livraisons Discord et 10 emails métier au statut d’envoi accepté. La livraison email n’est pas confirmée. La consultation de SMTP2GO a montré 14 retours webhook en échec. Ces chiffres sont des observations datées, pas un compteur en direct.

Le dernier déploiement Production GitHub consulté correspondait à `53c09bd`. Le registre [LIVRAISON_VERIFIEE.json](rendu/LIVRAISON_VERIFIEE.json) conserve sa campagne du 23 septembre ; il n’atteste pas le déploiement des ajouts ci-dessous.

## Ce qui est préparé, pas encore déclaré actif

| Changement | État et condition de mise en service |
| --- | --- |
| Relance email des missions non pourvues | Code et migration préparés ; destinataires actifs des organisations concernées |
| Rappels avant mission J-1/H-2 | Code préparé ; affectation active et horaires précis requis |
| Rappel Discord en message privé de membre | Repli préparé ; événement et destination doivent être activés, appartenance recontrôlée |
| Nouveau scénario n8n | [Export inactif](n8n/2026-09-24/README.md), passage toutes les 4 h ; remplacer le planificateur existant sans doublon |
| Suivi des retours SMTP2GO | Code existant testé ; raccordement fournisseur et retours réels encore à vérifier |
| Boutons Connexion / Créer mon compte | Alignement conservé avec les composants de l’interface Epitech |

À quatre heures d’intervalle, le rappel H-2 peut être manqué : limite acceptée pour préserver les crédits avant l’oral. Un seul contrôle périodique représente 180 exécutions sur 30 jours. Le socle de quatre workflows planifiés représente environ 10 exécutions/jour ; les événements, relais Discord et reprises s’ajoutent.

## Où trouver les documents utiles

- [Dossier de rendu et sept livrables](rendu/2026-09-23/README.md).
- [Dossier financier courant](business/2026-09-24/README.md) : environ 396 heures déclarées ; coût de production et amortissement 12 800,98 EUR ; exploitation estimative 5 265,30 EUR/mois. Ce sont des hypothèses de valorisation, pas des factures ni un relevé horaire par fonctionnalité.
- [PDF notifications et nouveaux schémas](rendu/2026-09-24/InfiMatch_Dossier_Notifications.pdf).
- [Exports n8n réellement observés le 23 septembre](n8n/published-20260923/README.md), distincts de l’export préparé du 24 septembre.
- [Inventaire documentaire](INVENTAIRE_DOCUMENTAIRE.md) et [audit notifications daté](audits/2026-09-24-notifications/AUDIT_NOTIFICATIONS.md).

Les résultats des tests de cette revue sont publiés dans le rapport de revue. Les rapports de coverage antérieurs gardent leur date et leur périmètre ; ils ne doivent pas être additionnés ou présentés comme la mesure du code courant. La recette humaine, les preuves J+2 et la ventilation des heures restent distinctes des validations automatiques.

## Validation de cette revue

[Preuves du 24 septembre](proofs/review-20260924/README.md) : **688/688 tests unitaires**, **95,00 % des lignes**, **192/192 intégrations**, **81/81 frontend**. Builds public/admin, typage, parcours navigateur et relance des contrôles SQL réussis. Le statut initial échoué du test de sécurité obsolète est conservé et expliqué dans les preuves.

## Complément des branches

[Reprise du 24 septembre](quality/REPRISE_BRANCHES_2026-09-24.md) : présentation Mon compte, renommage des recommandations et neuf fichiers de tests activés. Le frontend compte désormais **105/105 tests réussis** ; le résultat 81/81 ci-dessus reste la campagne précédente. Aucun code backend modifié dans ce complément.
