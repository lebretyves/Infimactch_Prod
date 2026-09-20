# Photos des maquettes

Les deux photographies d’origine proviennent du ZIP fourni `InfiMatch_Maquettes_V1_Complet.zip` et sont conservées sans retouche des PNG source. Une illustration photographique générée complète désormais l’accueil (voir ci-dessous). Aucune banque d’images externe utilisée.

## Correspondance

| Page | Maquette source (1448 × 1086 px) | Rectangle affiché : x, y, largeur, hauteur |
| --- | --- | --- |
| Accueil public `/` | `01-accueil-public.png` | 760, 230, 632, 370 |
| Connexion `/connexion` | `02-connexion.png` | 56, 448, 656, 528 |
| Création du compte `/inscription` | `02-connexion.png`, même photographie que `03-inscription-interimaire.png` en meilleure résolution | 56, 448, 656, 528 |

Les maquettes 04 à 18 ne contiennent pas de photos à reporter.

## Cadrage et fidélité

Les PNG source sont copiés sans transformation dans `public/images/maquette-accueil-source.png` et `maquette-connexion-source.png`. Le composant `PhotoMaquette` masque les zones hors photo par un conteneur CSS `overflow: hidden`. Les coordonnées sont relatives au coin supérieur gauche des PNG. Les images disposent d’un texte alternatif, de dimensions explicites et d’un cadre proportionnel responsive.

La photographie d’accueil est partiellement recouverte par la barre de recherche dans la maquette. Son cadrage supérieur conserve les trois visages et exclut cette interface incrustée ; la tablette et la partie basse sont donc moins visibles. Restaurer la photographie entière nécessiterait l’original séparé. Les formulaires et les textes de la maquette ne sont jamais affichés comme boutons factices.

Sur mobile, les champs de connexion/inscription précèdent le panneau photographique. L’image d’inscription est chargée à la demande. Les autres étapes du parcours d’inscription conservent leur interface fonctionnelle.

## Intégrité des sources

- `maquette-accueil-source.png` : SHA-256 `f9af2a057c616cabc6b28e7178ec810c50117a99c4f08a942c00f73f2d18eaed` (identique à la source).
- `maquette-connexion-source.png` : SHA-256 `470fe83f9cd5e90efbd304e2df4cb6a9455f9f99ba97f93c81a57d552f094acb` (identique à la source).

## Accueil allégé — 16 septembre 2026

L’accueil réutilise les deux scènes des maquettes : équipe dans le premier écran, deux soignantes dans la présentation des parcours. Le cadrage des pages d’authentification reste celui du composant partagé.

`public/images/coordination-soins-v1.jpg` est une illustration photographique générée avec imagegen pour la section « Qui sommes-nous ». Elle représente une soignante et une coordinatrice autour d’un planning ; ces personnes ne sont pas présentées comme des membres réels de l’équipe InfiMatch. Le texte alternatif précise le caractère illustratif. L’image est chargée à la demande, avec dimensions explicites.

## Optimisation du 20 septembre 2026

Les originaux cités ci-dessus sont désormais conservés dans `assets-source/`, hors du dossier public. Les cadres CSS ont été remplacés par des découpes identiques (accueil : x760/y230, 632×370 ; soignantes : x56/y448, 656×528), exportées en WebP de plusieurs tailles. Le composant conserve les mêmes formes et textes alternatifs. Les noms des fichiers contiennent leur empreinte ; `src/assets/public-media.json` fournit les dimensions et variantes à React et au préchargement de l’accueil. La photo de coordination reçoit aussi des variantes WebP.

La police Plus Jakarta Sans est convertie en WOFF2 sans changer son contenu ; l’original TTF et sa licence sont conservés. Régénération facultative : `python scripts/optimize-public-media.py` (Pillow avec WebP et fonttools[woff]). Les fichiers produits sont versionnés, aucun outil Python n’est requis pour le build Vercel. Les anciens paragraphes décrivent l’intégration initiale et les empreintes des sources, pas les octets désormais servis.
