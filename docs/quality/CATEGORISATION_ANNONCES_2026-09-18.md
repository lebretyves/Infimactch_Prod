# Catégorisation des extraits d’annonces — 18 septembre 2026

Échantillon de 200 annonces distinctes du catalogue public actuel : 168 France Travail et 32 JobsPipe. Récupération UTC : 2026-09-18T00:17:56.440Z. Le catalogue renvoyait 4 840 annonces. Échantillon des 150 premières et des 50 dernières annonces du catalogue ; il ne représente pas statistiquement l’ensemble, ni 100 annonces de chaque fournisseur. Aucune nouvelle collecte payante et aucune modification des annonces en base.

## Constat et correction

Une même phrase pouvait produire plusieurs champs (service, spécialité, compétence). Leur regroupement faisait perdre les intitulés et affichait « Passage de l’annonce ». Les avantages FASTT, les mentions de services dans la présentation du recruteur et les activités de soins pouvaient se retrouver dans la même rubrique.

Les intitulés sont désormais choisis sur le contenu du passage et l’ensemble de ses champs, avec des rubriques distinctes : poste et lieu d’exercice ; activités et soins ; diplômes, compétences et expérience ; contrat, dates et horaires ; rémunération et avantages ; établissement et équipe. Les rubriques vides ne sont plus affichées.

Exemples : titre original → « Intitulé du poste » ; surveillance en SSPI → « Activités et soins à réaliser » ; FASTT/location de véhicules → « Avantages proposés » ; collaboration avec les équipes → « Coordination et transmissions ». Une description de l’établissement ne devient pas une exigence de spécialité. Les majorations horaires sont rattachées à la rémunération.

## Fidélité et matching

Le texte source reste reproduit exactement, sans résumé inventé. Les passages identiques sont regroupés. Les niveaux d’exigence et incertitudes restent distincts ; une phrase mêlant plusieurs niveaux reste à confirmer. Les catégories sont destinées à la lecture : aucun code métier stocké, score, filtre de matching ou exigence n’est ajouté ou modifié. Le texte intégral et les passages à relire restent accessibles. Ces corrections s’appliquent aussi aux anciennes annonces lors de leur affichage.

## Validation

1 626 champs contrôlés sur 200 annonces, donnant 921 passages affichés après regroupement et filtrage contextuel. Chaque extrait affiché a été retrouvé dans le titre ou la description d’origine ; absence de doublons textuels affichés et de mutation des champs source contrôlée. Sept tests ciblés réussis ; recette navigateur des rubriques, de l’extrait exact, du dédoublonnage et du texte intégral réussie sur ordinateur et mobile ; build TypeScript/Vite réussi.

Cette validation ne mesure pas un taux de précision sémantique sur tous les passages. Le classement repose sur des règles prudentes et une relecture de formulations représentatives. Les textes très longs mêlant plusieurs sujets peuvent encore nécessiter une lecture du contexte. Les extraits ne remplacent pas l’annonce originale.

Livrable filtrable : Controle_categories_200_annonces.xlsx ; export texte : extraits-categorises.csv. Chaque ligne comporte la source, l’identifiant, le lien original, la rubrique, l’intitulé, le passage exact et son statut.
