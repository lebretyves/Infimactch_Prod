# Lecture CV enrichie — 19 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

État : implémentation locale, aucune publication effectuée par cet agent.

`POST /profile/cv/parse` conserve le tableau `experiences`, les avertissements et `requiresReview: true`. La méthode devient `RULES_V2`. Le nouveau champ `suggestions` contient :

- `identity` : champs facultatifs `firstName`, `lastName`, `email`, `phone`, `city`, `postalCode`, chacun `{ value, evidence, warnings }`.
- `diplomas` : `{ qualification: IDE|IADE|IBODE, year: number|null, evidence, warnings }[]`.
- `skills` et `services` : `{ code, label, evidence, warnings }[]`, codes du catalogue clinique existant.

Les suggestions ne sauvegardent rien. Leur preuve est un extrait du document fourni, pas une source indépendante. Aucune qualification ni inscription RPPS n’est certifiée. IADE/IBODE ne crée aucun diplôme IDE implicite dans le résultat ; les règles métier du profil restent indépendantes.

Les années d’obtention restent distinctes. Une période de formation, plusieurs diplômes avec une même date ambiguë, une année absente ou des dates contradictoires donnent `year: null`. Un diplôme annoncé futur, préparé ou en cours n’est pas proposé. Les expériences en cours restent exclues des expériences terminées, avec avertissement ; aucune date de fin n’est fabriquée. Les dates de mois/année des expériences passées conservent le comportement antérieur (bornes proposées avec avertissement explicite).

L’identité est recherchée dans l’en-tête uniquement, avant les sections de parcours et de références. Les champs étiquetés sont préférés. Un prénom en casse mixte et un nom en majuscules peuvent être proposés ; une identité entièrement en majuscules demeure ambiguë. Deux valeurs contradictoires ne sont pas proposées.

Les compétences exigent une mention explicite, dans une section professionnelle ou de compétences, correspondant à un libellé du catalogue ou à une liste limitée de synonymes. Un service n’implique aucune compétence. Une mention négative ou de simple initiation est écartée. Les services lus ne sont pas assimilés aux préférences actuelles d’exercice.

Limites : extraction déterministe française, pas de compréhension sémantique générale ni d’OCR serveur. Des mises en page ou formulations inhabituelles peuvent nécessiter une correction manuelle. Les suggestions de compétence restent des déclarations à confirmer et peuvent ne pas couvrir tout le CV.

Validation : 17 tests unitaires du parseur passent (11 cas historiques et 6 nouveaux groupes : identité/contact, ambiguïtés, diplômes séparés/RPPS, années contradictoires/en cours, catalogue/négations, OCR illisible). Compilation TypeScript backend et vérification du diff réussies. Tests sur données entièrement fictives.