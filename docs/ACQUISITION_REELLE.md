# Acquisition réelle : France Travail et FINESS

État du 15 septembre 2026. Ces résultats remplacent les anciens constats de blocage d'accès France Travail. L’accès ANS/FHIR est testé ; le contrôle positif d’un professionnel reste à valider.

## France Travail

Authentification réussie, lecture à blanc de 5 offres puis import de 50 offres. Un même lot de 50 offres a été importé deux fois et relu en SQL : 50 identifiants uniques et provenance présente. [Preuve réelle](proofs/france-travail-live.json).

```powershell
node scripts/verify-france-travail.cjs
```

La commande effectue un import réel et un rejeu, puis actualise la preuve. Les identifiants restent dans .env. La validation exhaustive du contrat fournisseur, des conditions de réutilisation et de l'affichage frontend reste distincte.

## FINESS officiel

Source fournie par l'utilisateur et consultée : [FINESS - Structures, ANS sur data.gouv.fr](https://www.data.gouv.fr/datasets/finess-structures-1), publiée sous Licence Ouverte 2.0. Le [schéma officiel](https://github.com/ansforge/finess/blob/main/flux/out/data.gouv/structure/schema/schema-structures-v1.json) distingue les personnes morales et les établissements géographiques.

Snapshot utilisé : `finess-structures-mensuel-202608.json.gz`, généré le **1er septembre 2026 à 02:07:30 UTC**, horodatage du contenu. Ce fichier mensuel est une photographie datée, pas une vérification en temps réel.

- 174 621 établissements géographiques uniques, dont 104 752 avec état source A.
- 120 663 disposent d'une paire de coordonnées source exploitable ; 53 958 restent sans coordonnées utilisables.
- Les identifiants, y compris les préfixes corses 2A/2B, restent des chaînes.
- Les établissements inactifs et ceux sans adresse ou coordonnées restent présents pour la recherche d'identité.
- Une présence dans le référentiel n'accorde aucun accès à une organisation et ne prouve pas que le demandeur la représente.

L'archive initiale contenait seulement 78 390 établissements filtrés. Son extracteur copiait X/Y sans conserver l'autre paire de coordonnées. Le flux officiel permet de sélectionner la paire numérique dans les bornes géographiques ; deux paires géographiques contradictoires restent inconnues. Aucune projection n'est devinée ou convertie. Ces coordonnées sont renvoyées avec leur champ de provenance ; elles ne modifient pas automatiquement les lieux des missions.

[Contrôle de l'archive](proofs/finess-quality.json) et [preuve de l'import officiel et des routes HTTP](proofs/finess-live.json).

## Import et consultation

Le fichier téléchargé reste dans `data/public/`, hors Git. Son URL et son SHA-256 sont enregistrés dans le snapshot SQL et les preuves.

```powershell
node backend/dist/cli.js import-finess --file data/public/finess-structures-mensuel-202608.json.gz --source-url https://static.data.gouv.fr/resources/finess-structures-1/20260901-021627/finess-structures-mensuel-202608.json.gz
node scripts/verify-finess.cjs
```

La première commande lit le gzip en flux, valide les identifiants, puis remplace atomiquement le référentiel dédié. Elle ne modifie pas les organisations inscrites. Un snapshot plus ancien est refusé. Une erreur annule la transaction. Le remplacement est sérialisé par un verrou SQL.

| Route GET | Résultat |
|---|---|
| /api/v1/reference-data/finess?q=nom&limit=20&offset=0 | Recherche par nom ou numéro, paginée, total et provenance du snapshot |
| /api/v1/reference-data/finess/:finess | FOUND_IN_SNAPSHOT ou NOT_IN_SNAPSHOT, données et état source de l'établissement |
| Sans référentiel importé | HTTP 503, jamais une absence nationale supposée |

Le test HTTP vérifie pagination, format invalide, numéro corse, absence dans le snapshot, établissement sans coordonnées et absence d'attribution de droits. L'OpenAPI est exporté après vérification.

## Limites

L'absence dans un snapshot daté n'est pas une preuve d'absence actuelle au niveau national. L'inscription ne devient pas automatiquement bloquante sur FINESS : la présente intégration fournit le contrôle de présence et les données à utiliser dans le parcours frontend. L'API de vérification RPPS reste indépendante.

Le fichier brut n'entre pas dans le bundle Git ; il doit être conservé séparément ou téléchargé à nouveau à l'URL enregistrée. Le premier essai de chargement en mémoire a échoué sur la limite de chaîne Node ; la lecture en flux a corrigé ce problème avant l'import réussi.

## Acces ANS/FHIR verifie le 15 septembre 2026

La cle configuree a permis un appel reel a Practitioner : HTTP 200, Bundle FHIR de recherche et resultat NOT_FOUND sur le numero synthetique 00000000000. Aucun profil n'a ete modifie. Ce test valide l'acces et le cas absence, pas le cas FOUND sur un professionnel reel. Preuve : docs/proofs/ans-fhir-live.json (proofs/ans-fhir-live.json depuis docs).

Les anciens constats de cle manquante sont historiques. Restent notamment le controle positif sur un RPPS reel autorise et la recette complete du parcours. La cle et les fichiers .env restent exclus de Git.
