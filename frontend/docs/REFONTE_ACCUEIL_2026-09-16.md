# Refonte de l’accueil public — 16 septembre 2026

## Demande

Remplacer l’accueil trop court et les boutons d’authentification répétés par une page de présentation professionnelle : mission, publics, fonctionnement, qui sommes-nous et liens utiles.

## Sites consultés

- [Appel Médical](https://www.appelmedical.com/) : navigation par publics, recherche d’emploi, services et accès aux espaces.
- [Mediflash](https://mediflash.fr/) : proposition de valeur, entrées soignants/établissements, fonctionnement, bénéfices, À propos et FAQ.
- [Vitalis Médical](https://www.vitalis-medical.com/) : parcours candidat/recruteur et présentation des services et de l’expertise.

Consultation web effectuée le 16 septembre 2026. Ces sites servent de références de structure ; leurs textes, photographies, chiffres, témoignages, garanties et coordonnées ne sont pas repris dans InfiMatch.

## Choix pour InfiMatch

Navigation descriptive et accès au compte regroupés ; photo originale des trois soignants conservée ; sections Notre mission, Pour qui, Comment ça marche, Qui sommes-nous ; FAQ courte et footer avec destinations existantes. Les bénéfices décrits correspondent aux parcours disponibles. Le projet n’est pas présenté comme une agence déjà implantée ou disposant de clients attestés.

Les parcours soignant, établissement et agence doivent arriver sur un formulaire adapté, sans envoyer de données ni créer de compte pendant les tests. Pas de promesse de messagerie, paiement, contrat signé ou disponibilité garantie.

## Portée

Frontend React existant, principalement AccueilPublic.tsx et son CSS. Pas de modification des règles backend, de l’authentification ou des données métier. Les aperçus concernés du catalogue sont actualisés après validation.

## Réalisation et vérifications

- Accueil public réorganisé dans `src/pages/AccueilPublic.tsx` et `AccueilPublic.module.css` : navigation, présentation, mission, trois publics, étapes, qui sommes-nous, quatre questions fréquentes et liens utiles.
- Dans `src/pages/Inscription.tsx`, les paramètres autorisés `espace=candidat|etablissement|agence` préselectionnent le parcours correspondant ; une valeur inconnue conserve le parcours candidat. Le choix reste modifiable.
- Photo originale de la maquette conservée via le composant existant.
- `npm run build` réussi. Avertissement Vite non bloquant sur un bundle supérieur à 500 kB.
- Contrôles navigateur isolé réussis à 1440, 1024, 768 et 375 px : absence de débordement horizontal sur l’accueil, image chargée, menu mobile et touche Échap, ancres valides, FAQ et un seul accès connexion/inscription dans l’en-tête.
- Dix destinations internes vérifiées, trois préselections d’inscription et repli d’un paramètre inconnu. Aucun formulaire envoyé, aucune écriture API ni compte créé.
- Aperçus ordinateur/mobile de l’accueil recapturés dans le catalogue ; catalogue accessible. Les deux débordements mobiles historiques des listes de missions établissement/agence, signalés dans son rapport global, ne concernent pas l’accueil.

Preuves : `docs/proofs/accueil-refonte/checks.json`, captures dans le même dossier, et `docs/proofs/catalogue-captures.json`.

### Limites de cette validation

Validation de l’accueil et de ses destinations, pas une nouvelle validation des opérations métier ni de la connexion Google. Google a été désactivé uniquement dans le contexte navigateur de test pour éviter de générer des challenges pendant la visite du lien connexion ; sa configuration réelle n’a pas été modifiée. Les mentions légales existantes n’ont pas été réécrites dans cette intervention. Livraison locale, sans déploiement Vercel.

## Évaluation visuelle

Évaluation indépendante effectuée après implémentation : PASS, premier passage. Rapport de travail : C:/Users/lebre/AppData/Local/Temp/infimatch-accueil-z3ljgjp2.eyk/eval_main_1.md.


## Seconde itération : accueil plus léger et photographique

À la demande de l’utilisateur, la page conserve ses rubriques mais réduit fortement le texte : 237 mots visibles dans le contenu principal, FAQ fermée, contre 510 avant modification (−54 %). Trois scènes photographiques remplacent la photo unique : équipe en introduction, deux soignantes à côté des parcours, coordination pour la présentation du projet. Cette dernière est une illustration générée ; sa provenance figure dans `PHOTOS_MAQUETTES.md`.

La bande sombre de mission, les listes et les descriptions répétitives sont remplacées par des présentations brèves. La navigation, les trois parcours, les questions fréquentes et les liens légaux restent accessibles.

### Validation de cette itération

- Compilation réussie ; avertissement Vite de taille du bundle inchangé.
- Contrôles navigateur à 1440, 1024, 768, 375 et 320 px : trois images décodées, aucun débordement horizontal, ancres valides, menu mobile et touche Échap, FAQ ouvrable.
- Dix destinations internes accessibles ; trois préselections d’inscription et valeur inconnue vérifiées. Aucun compte créé ni formulaire envoyé ; écritures API bloquées dans le navigateur de contrôle.
- Aperçus ordinateur et mobile de l’accueil recapturés dans le catalogue.
- Preuves : `docs/proofs/accueil-photos/before.json`, `checks.json`, captures complètes et du premier écran dans le même dossier.

Cette intervention porte sur l’accueil local et sa présentation. Elle ne constitue pas un nouveau test OAuth ni un déploiement Vercel.

Évaluation visuelle indépendante de cette seconde itération : **PASS**, premier passage. Rapport de travail : `C:/Users/lebre/AppData/Local/Temp/infimatch-accueil-photos-ub3z3fu1.agr/eval_main_1.md`.
