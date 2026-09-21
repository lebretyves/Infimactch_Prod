# Qualité frontend — 17 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

## Périmètre observé

React 19, React Router 7, Vite 7.3.6. Le lot conserve les recommandations sans modifier leur sélection, titre ou classement. Aucun audit exhaustif RGAA/RGESN n’est revendiqué. Aucun trafic, score SEO, CO₂ ou résultat sur appareil réel n’est inventé.

## Modifications

- Routes publiques `/installer`, `/accessibilite`, `/ecoconception`, liées depuis l’accueil et l’espace utilisateur. Installation demandée exclusivement par un clic lorsque le navigateur fournit `beforeinstallprompt`; aide Safari/iOS, Android et ordinateur sinon. Aucune permission push demandée.
- Manifeste avec identité stable, icônes 192/512 dérivées du logo local et mode standalone. Service worker de production uniquement, absent du mode démo hash.
- Liste blanche de quatre fichiers de cache : aide hors connexion, favicon et deux icônes. Aucun shell authentifié, aucune API, réponse admin, session, mutation ou document en cache. Aucun Background Sync ni file de mutations. Le client refuse les mutations lorsque le navigateur indique être hors ligne.
- Mise à jour en attente jusqu’au clic explicite, avec rappel d’enregistrer les formulaires. Nettoyage des caches `infimatch-*` après déconnexion réussie, sans supprimer les autres applications.
- Chargement des pages à la demande; une seule police locale déjà présente conservée; chargement différé des images secondaires conservé. Aucun nouveau paquet d’exécution.
- Titres UTF-8 réparés, métadonnées par page; canonical limité aux pages publiques utiles. Sitemap : accueil, installation, accessibilité, écoconception, mentions uniquement, sur le vrai domaine Vercel. Espaces privés/démo exclus et en-tête `X-Robots-Tag: noindex, follow`; robots ne bloque pas la lecture de ces directives. L’authentification reste distincte.
- Aucun `JobPosting` ajouté : les détails d’offres sont actuellement derrière authentification, l’origine et les données nécessaires doivent être validées avant exposition publique.

## Mesures de laboratoire

Même commande `npm run build`, même machine, sans compression réseau réelle :

| Fichier principal | Initial | Après découpage |
|---|---:|---:|
| JavaScript brut | 639,61 kB | 408,55 kB |
| JavaScript gzip estimé par Vite | 201,17 kB | 135,33 kB |
| CSS principal brut | 96,75 kB | 16,98 kB |

Les fragments propres à la page sont chargés en complément (accueil : 12,82 kB JS brut, 4,06 kB gzip, plus petits fragments partagés). Ce tableau n’est pas un total réseau ni une mesure LCP/INP/CLS. Budget provisoire : JS principal ≤450 kB brut, ≤150 kB gzip, sans ajout de polling public. Aucun outil de mesure d’audience ou donnée de terrain disponible. Vérification des fréquences d’import/quotas à effectuer côté serveur.

## Grille ciblée RGAA

Référence officielle consultée : [RGAA critères et tests](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/), version 4.1.2. « Conforme au contrôle ciblé » ci-dessous ne valide pas tout le critère.

| Famille / contrôle | Échantillon | État | Méthode / preuve |
|---|---|---|---|
| 1 — présence alternatives images | Accueil, installation, accessibilité, écoconception, mentions, connexion | Conforme au contrôle ciblé | DOM, 3 largeurs, `frontend-checks.json` |
| 8 — langue française, titre de page | Pages publiques du lot | Conforme au contrôle ciblé | Code et navigateur; qualité des titres vérifiée |
| 9 — H1 unique, sections | 6 routes ×320/768/1440 | Conforme au contrôle ciblé | 18 contrôles automatiques |
| 10 — absence débordement | Même échantillon | Conforme au contrôle ciblé | Largeurs émulées, pas appareil physique |
| 11 — noms commandes | Même échantillon | Conforme au contrôle ciblé | Boutons/liens nommés, erreurs d’installation annoncées |
| 12 — lien d’évitement et cible | Même échantillon | Conforme au contrôle ciblé | Présence lien/cible, cible focusable sur nouvelles pages et espace |
| 3 — contraste de tous états | Toute application | Non testé exhaustivement | Palette existante conservée; audit complémentaire nécessaire |
| 7 — lecteur d’écran, restitution focus, tous dialogues | Toute application | Non testé exhaustivement | Aucun lecteur d’écran humain utilisé |
| 4/5 — médias et tableaux de données | Nouvelles pages qualité/install | Non applicable sur cet échantillon | Aucun média temporel ni tableau de données |
| Ensemble critères et parcours connectés | Application complète | Non testé exhaustivement | Ne pas publier de taux RGAA |

## Grille RGESN ciblée

Cadre : [RGESN Arcep 2024, 78 critères](https://www.arcep.fr/mes-demarches-et-services/entreprises/fiches-pratiques/referentiel-general-ecoconception-services-numeriques.html).

| Axe | État initial / preuve | Action | Responsable / limite |
|---|---|---|---|
| Ressources frontend | Bundle unique 639,61 kB | Pages à la demande, baisse mesurée | Équipe frontend; total réseau à mesurer |
| Polices/images | Police locale unique; images secondaires déjà différées | Préserver, ne pas ajouter de police | Optimisation des grandes images à poursuivre après mesure |
| Stockage navigateur | Absence de PWA | Cache strictement borné à 4 fichiers | Équipe frontend; stockage fourni par navigateur |
| Besoin/gouvernance/hébergement | Informations incomplètes | Documenter les inconnues publiquement | Porteur projet; non vérifiable par le code seul |
| Imports et API | Hors lot frontend | Contrôler pagination, quotas, fraîcheur | Équipe backend, pas de conclusion globale ici |

## Tests et limites

`scripts/test-quality.mjs` : 18 contrôles sémantiques/adaptatifs, invitation simulée nécessitant clic, refus explicite, cache borné après appels API fictifs et navigation hors connexion. API interceptée en 401, aucune donnée réelle utilisée. Edge installé via Playwright, captures `installation-390.png`, `installation-1440.png`, résultats `frontend-checks.json`. Ce test ne prouve pas une installation réelle iOS/Android ni l’ajout à l’écran d’accueil.

`scripts/test-pwa.mjs` : non-interception des routes sensibles/écritures, activation sur message explicite seulement, purge des seuls caches de l’application. Le test d’API refuse les mutations hors connexion avant tout appel CSRF/réseau.

Reste à vérifier : installation sur appareils réels, cycle complet de mise à jour avec formulaires sur plusieurs onglets, lecteurs d’écran, audit RGAA complet, engagement hébergeurs/gouvernance RGESN, préproduction hors index, recette des domaines de préproduction. Les titres, descriptions et URL canoniques des quatre sous-pages publiques sont aussi produits en HTML statique au build; le corps interactif reste rendu par React, avec un résumé public noscript ajouté lors des raffinements ci-dessous.

Documentation installation consultée : [MDN — invitation PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt). `beforeinstallprompt` n’est pas disponible dans tous les navigateurs. Aucun lien vers une application homonyme.

## PSC interface

Composant facultatif sur connexion et profil infirmier. Configuration absente ou inactive : aucun bouton trompeur. Démarrage au clic seulement. Association exige une connexion récente, message explicite en cas de refus. Les retours annulation, indisponibilité, association requise et échec sont expliqués. Aucun badge RPPS vérifié ajouté. `scripts/test-psc-ui.mjs` valide ces replis avec fixtures; aucun raccordement ANS réel ne peut être déduit de ce test.

## Raffinements après évaluation visuelle

Évaluation indépendante limitée : PASS. Le bouton Cookies et son avis de stockage sont maintenant dans le flux en bas de page, sans chevaucher les textes. Le bloc Google est espacé du bouton principal. Le contact public demeure à fournir, sans adresse inventée.

Le build produit cinq résumés publics lisibles sans JavaScript, correspondant au contenu existant (accueil, installation, accessibilité, écoconception, mentions). Les parcours de compte et mission nécessitent toujours JavaScript; les résumés ne prétendent pas remplacer les fonctions complètes. Aucun JobPosting ajouté.

`test-quality-refinements.mjs` : cinq pages sans JavaScript PASS; bouton Cookies statique et réouverture du dialogue à 375 et 768 px PASS; espacement Google >=20px PASS. Build et 18 contrôles adaptatifs/PWA repassés avec succès.

Contrôle public final : URL inconnue HTTP 404 confirmée, cinq résumés noscript disponibles. Les 18 contrôles adaptatifs ont aussi passé sur le domaine Vercel publié avec API fictives interceptées ; voir la recette de production.

Actualisation du 21 septembre 2026 : la barre Cookies/Accessibilité a été déplacée en haut de page ; les observations précédentes sur le pied de page décrivent la version du 17 septembre. Voir [Préférences visibles dès l’arrivée](PREFERENCES_VISIBLES_2026-09-21.md).
