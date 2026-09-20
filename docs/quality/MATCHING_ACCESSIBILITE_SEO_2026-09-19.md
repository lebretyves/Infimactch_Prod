# Matching, accessibilité et SEO — lots 2, 6 et 11

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

19 septembre 2026. Travail local autorisé, sans compte réel, sans email, sans publication ni modification de la pondération. Les preuves sont dans `E:\Interimatch\audits\2026-09-19-matching-a11y-seo`.

## Modifications

- `MatchingRules.tsx` distingue clairement matching automatique, score indicatif et confirmation manuelle. Qualifications, RPPS, horaires confirmés et affectations en conflit restent contrôlés. Des disponibilités déclarées absentes et autres avertissements ne deviennent pas des interdictions de confirmation à eux seuls.
- `Missions.tsx` et `Notifications.tsx` expliquent que la ville/rayon de recherche filtrent la liste, tandis que le score et les alertes utilisent la mobilité du profil. Aucune synchronisation automatique ajoutée. `PersonalMatching.tsx` annonce la valeur actualisée avec une région polie.
- `Compte.tsx` : erreur liée au champ et focus sur le mot de passe manquant, puis sur le consentement non confirmé. Avant correction, le focus restait sur Envoyer avec une seule alerte générale. Les trois rôles clients ont été rejoués.
- `admin/App.tsx` : fermeture du dialogue puis retour du focus au bouton déclencheur. L’échec avant correction et le succès après correction sont conservés.
- `frontend/vercel.json` : `/mes-etablissements` ajouté aux réécritures vers la page privée et à la politique `no-store`. La règle générale `noindex` existait déjà. Aucune nouvelle page publique créée.

## Matching : résultat du benchmark

Le script `benchmark.cjs` utilise le moteur compilé et les fonctions réelles `listingOrder`, `compareListingOrder`, `rankedListingPage` : 1 240 annonces synthétiques (1 200 internes et 40 externes), six profils et onze cas métier. IDE/IADE/IBODE, services multiples indépendants par diplôme, absence de préférence, données manquantes, RPPS et conflit réel sont couverts.

Sept pages, dont celles autour de la frontière de lot de 500 et les dernières pages externes, correspondent au classement global attendu. Les offres externes restent sans pourcentage et viennent après les internes. Le déplacement de la ville de recherche ne modifie pas le score fondé sur le profil. Les poids par défaut testés sont compétences 45 %, proximité 25 %, horaires 20 %, expérience 10 %.

**Limite du modèle rendue visible : un score indicatif peut atteindre 100 % alors que les disponibilités sont absentes ou qu’une autre condition d’admissibilité échoue.** Le score représente la correspondance des critères pondérés, pas l’autorisation de confirmer ni une probabilité de réussite. Sans localisation, les 25 points de proximité ne sont pas redistribués.

Ce benchmark ne démontre pas une pondération optimale. Il n’utilise ni résultats réels de recrutement ni appréciations métier de référence. Les mesures CPU incluent des assertions et plusieurs calculs, pas le temps de réponse API. La pagination exécute le vrai algorithme avec un transport SQL simulé : ce n’est pas une mesure PostgreSQL ou PostGIS en charge. Une étude de pertinence sur un échantillon relu par des recruteurs reste nécessaire avant de proposer d’autres poids.

## Recette accessibilité locale

Transport API entièrement simulé et requêtes externes bloquées. Aucun compte, cookie ou secret réel. Parcours : missions, notifications, compte pour intérimaire/agence/établissement ; vue d’ensemble, comptes et accès administrateur.

- **50 contrôles ciblés réussis** : 36 états de page aux largeurs 320, 768 et 1 440 pixels, puis liens d’évitement, dialogues au clavier, fermeture Échap, retour de focus et erreurs du formulaire de clôture.
- Aucun champ visible sans libellé, aucun débordement horizontal sur ces 36 états, un H1 par écran, langue française et `noindex` privé présents.
- **174 échantillons de contraste calculable** sur les 12 pages à 1 440 pixels respectent le seuil applicable au texte inspecté. Textes sur images, effets de transparence et toutes les combinaisons d’états ne sont pas exhaustivement couverts.
- Aucun message d’erreur JavaScript et aucun endpoint de fixture manquant.
- Un essai supplémentaire `CSS zoom: 2` à 1 280 pixels produit un débordement sur les écrans missions infirmier et accueil admin. Cette propriété CSS ne simule pas fidèlement le zoom navigateur et ses media queries. Ces deux observations sont conservées, sans conclure à leur résolution ni à une certification du zoom natif.

Le contrôle de reflow à 320 pixels correspond à la largeur de référence décrite par le [W3C](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Le lecteur d’écran, le zoom natif, les appareils physiques, les listes riches et l’ensemble des dialogues restent à compléter. Aucune conformité RGAA complète n’est revendiquée.

## SEO et écoconception

Le test `frontend/scripts/test-seo-build.mjs` a été exécuté sur un build réel : **5 pages publiques** avec titre distinct, description, canonical et fallback sans JavaScript ; **20 routes privées** couvertes par réécriture, `noindex` et `no-store`; sitemap limité aux cinq pages publiques; administration non indexable. Aucun balisage JobPosting ajouté aux fiches privées. Ce test contrôle les fichiers construits et la configuration Vercel, pas l’indexation Google ou des en-têtes réellement servis après un nouveau déploiement.

Le code conserve les chargements de pages différés, l’OCR local chargé à la demande, les filtres et la pagination serveur, l’absence de rafraîchissement automatique de l’administration et la séparation des horaires d’import. Ce sont des pratiques concrètes, pas une mesure de consommation énergétique ou un score RGESN complet.

## Validation technique et preuves

TypeScript frontend, build utilisateur, build administrateur et **19 tests frontend** réussis. Le warning de résolution de police pendant le build admin est suivi d’une copie effective : `dist-admin/fonts/PlusJakartaSans-Variable.ttf` existe.

Fichiers de preuves : `matching-benchmark.json`, `browser-before-fixes.json`, `browser-checks.json`, `contrast-checks.json`, `seo-build-checks.json`, `validated-summary.json`. Scripts rejouables conservés à côté. Les nombres décrivent cette campagne distincte ; ne pas les additionner aux anciens bilans comme s’ils étaient tous des tests uniques.

Aucun commit, push ou déploiement n’a été effectué dans ce lot. Après publication : vérifier les deux parcours de focus, les nouvelles explications et les réponses HTTP de `/mes-etablissements` sur chaque hébergement prévu.