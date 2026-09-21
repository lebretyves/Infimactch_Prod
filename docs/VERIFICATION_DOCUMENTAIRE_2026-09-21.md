# Seconde vérification documentaire — 21 septembre 2026

## Conclusion

La documentation ne pouvait pas être annoncée entièrement à jour après la première passe. Cette seconde revue corrige des guides encore contradictoires, les supports techniques de soutenance et les dérivés Word. Elle distingue contenu courant, preuves historiques et validations non réalisées.

## Couverture et contrôles

- **116 fichiers documentaires** inventoriés dans le dépôt, y compris `frontend/`, les supports Office/PDF et les sous-titres ; [registre détaillé](rendu/VERIFICATION_DOCUMENTAIRE.csv).
- Liens locaux de tous les Markdown conservés : aucun chemin cassé détecté. Les liens externes et toutes les ancres internes ne sont pas certifiés par ce contrôle.
- Quatre documents Word régénérés depuis les références Markdown. Douze diapositives et douze pages PDF de soutenance régénérées ; contrôle des bornes des textes et revue visuelle de la planche PDF. Lecture Office/XML réussie ; le rendu PowerPoint sur la machine du jury reste à vérifier.
- Guides Discord, JobsPipe, Vault, intégration frontend, interfaces, récupération MFA et configuration rectifiés. Sources de preuve et état déployé distingués.
- Plans V2 et notes de maquettes remplacées archivés hors branches actives. Sujet du kick-off et catalogue original conservés comme références historiques, non réécrits.
- OpenAPI : contrôle structurel sans réponse de succès manquante ni corps vide ; cette vérification ne remplace pas une recette de chaque route.
- Aide textuelle et deux sous-titres corrigés. Présence des six ressources de tutoriels vérifiée par les tests existants.

## Réserves qui restent réelles

| Élément | État exact |
| --- | --- |
| Six vidéos | Non réenregistrées et non intégralement revues ; l'aide affiche leur caractère antérieur et renvoie aux guides écrits |
| Étude de marché / sources externes | Recherche historique datée, pas une nouvelle vérification web de chaque affirmation |
| Heures, membres et répétition | À renseigner et attester par l'équipe ; aucun chiffre inventé |
| Deux workflows et parcours publié | Preuves actuelles et recette finale à compléter ; aucun appel fournisseur lancé par ce contrôle |
| MFA réel, récupération, sauvegarde et rotation | Code et procédures documentés ; validations réelles distinctes |
| Conservation / responsable / accessibilité humaine | Décisions et essais encore ouverts, aucune conformité globale déclarée |
| Indicateur admin de reprise | Le code considère le dernier passage ancien après 70 minutes alors que le cron est à quatre heures : état « inconnu » possible entre deux passages. Code non modifié dans ce lot |

## Reproduction et versions

`python scripts/render-documentation.py` régénère les documents Word sans lire de secret ; `python docs/presentation/generate.py` régénère le support oral depuis `slides.json`. Le dépôt Epitech utilise `docs_intern` pour ces références. Les générateurs requièrent leurs bibliothèques Python documentaires ; les exports sont joints pour la lecture sans outillage.

Le manifeste du dossier de rendu fixe le commit remis. Les résultats d'anciennes campagnes gardent leurs dates ; une nouvelle date documentaire n'est pas une nouvelle preuve métier.
