# Synchronisation des branches principales — 23 septembre 2026

Demande : même contenu final dans `lebretyves/Infimactch_Prod:Main` et `EpitechMscProPromo2027/D-WEB-901-PAR-9-1-InteriMatch-1:main`.

Références avant synchronisation : Yves Main `7cc590acf8d25aa0cb1188da8a387a580ba6148b`, Epitech main `90600daf839efde724b9c4e17f4d8099063e3f4e`. Le commit `07c7d91` ajoute les tests, le seuil CI, les corrections ciblées et les preuves.

Le contenu applicatif retenu est la consolidation validée, complétée par les tests unitaires. Les premières versions Epitech de l'accessibilité, du parseur et des erreurs de connexion sont déjà reprises et améliorées, notamment dans `0f96fb5` et `7af9324`. La fusion conserve les versions consolidées et rattache l'historique Epitech comme second parent. Aucun ancien fichier applicatif n'est réintroduit.

Les sauvegardes distantes conservent les deux états antérieurs. La publication se fait sans forcer les branches principales. Les autres copies de travail locales avec modifications préexistantes ne sont pas réinitialisées.

Preuve unitaire : 643 tests réussis, 95,07 % des lignes backend, sans contribution des tests d'intégration. Voir `docs/proofs/unit-coverage-20260923/`. Une publication Git ne prouve pas que tous les projets Vercel sont déployés.

Les workflows n8n ne sont ni modifiés ni déclenchés par cette synchronisation. L'état de la comparaison Cloud est indiqué dans la note API/n8n.
