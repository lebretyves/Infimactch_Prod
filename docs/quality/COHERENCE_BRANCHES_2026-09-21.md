# Cohérence des branches — 21 septembre 2026

## Périmètre

Comparaison des branches distantes actualisées : production `Main` au commit `48e03c1eea64019192b670f93d15a4f30102769f` et Epitech `Backend` au commit `20c3e0b4cf1667f3f8a0d56e76d21b2a88780c1c`, puis contrôle des corrections de ce lot. Les deux copies étaient propres et identiques à leurs références distantes avant modification.

L’inventaire initial comprend 1 201 fichiers de production et 1 205 fichiers Epitech. Chaque contenu est comparé intégralement ; les fichiers binaires sont comparés par leurs octets. Les fichiers texte de production représentent 982 fichiers et 146 560 lignes, données et verrous de dépendances compris. Les 26 fichiers différents ont été examinés : liens relatifs et emplacements de documentation, plus quatre chemins de sortie de scripts de preuve. Aucun écart de logique applicative entre branches n’a été trouvé.

## Corrections

- Anciennes versions retirées des guides courants README, déploiement et soutenance ; une seule [référence de livraison vérifiée](../rendu/LIVRAISON_VERIFIEE.json).
- SHA non prérempli dans les scénarios encore à recetter : la version doit désigner le code effectivement testé, avec date et preuve.
- Trois doubles d’exports n8n propres à Epitech archivés hors Git. Le double de reprise à 30 minutes était obsolète ; l’export conservé est à quatre heures, Europe/Paris. Les deux autres étaient identiques à leur référence conservée.
- Chemin d’exclusion des notes locales `workspace-docs` rétabli côté Epitech : une ancienne substitution avait produit `workspace-docs_intern`. Le comparateur ne normalise plus les suffixes de noms arbitraires.
- Note de cadrage propre au dépôt Epitech conservée. Les chemins `docs` / `docs_intern` restent adaptés à chaque dépôt.
- Contrôle structurel ajouté à la CI : liens Markdown locaux, JSON, absence de doubles documentaires, cadence de reprise et cohérence du tableau de recette. Comparaison de branches disponible en option.

## Reproduction

Depuis le dépôt production :

```powershell
python scripts/check-repository-consistency.py --compare ../Infimatch-Epitech-sync --output ../audits/2026-09-21-branch-parity/final.json
```

Le résultat détaille chaque fichier, son empreinte SHA-256, son nombre de lignes et son équivalent. Le contrôle local sans `--compare` fonctionne dans les deux dépôts et en CI. Il ne lit pas les secrets ignorés par Git et n’appelle aucun fournisseur ni n8n Cloud.

## Portée exacte

Ce lot vérifie exhaustivement l’identité du contenu entre branches et la cohérence structurelle des références ; ce n’est pas une nouvelle relecture sémantique manuelle des 146 560 lignes ni une garantie d’absence de défaut. La [revue du code et ses tests](REVUE_CODE_2026-09-21.md) conserve son périmètre. Le code applicatif n’est pas modifié dans ce lot.

Les documents historiques et originaux du sujet conservent leurs dates, résultats et anciennes versions ; ils ne sont pas réécrits comme des preuves récentes. Les liens externes, toutes les ancres et la justesse de chaque affirmation métier ne sont pas certifiés par le contrôle automatique. Le porteur confirme le fonctionnement passé des automatisations ; cette déclaration n’est pas transformée en nouvelle preuve de réception.
