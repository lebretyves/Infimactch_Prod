# InfiMatch

Plateforme de mise en relation entre établissements de santé et infirmiers
intérimaires.

Le secteur retenu est l'intérim **santé / paramédical** : marché dominé par des
acteurs généralistes aux outils datés, tension de recrutement forte et durable,
et contraintes métier spécifiques (qualification réglementée, vérification RPPS,
numéro FINESS côté établissement) qui justifient une plateforme dédiée.

## Sommaire

- [Périmètre](#périmètre)
- [Stack](#stack)
- [Installation](#installation)
- [Scripts](#scripts)
- [Arborescence](#arborescence)
- [Design](#design)
- [Accessibilité, éco-conception, SEO](#accessibilité-éco-conception-seo)
- [Conformité](#conformité)
- [Branches](#branches)

## Périmètre

Deux rôles : **intérimaire** (IDE, IADE, IBODE) et **entreprise** (établissement
de santé ou agence d'intérim). L'inventaire complet des 53 écrans de la V1 est
décrit dans [INTERFACES.md](INTERFACES.md).

Écrans actuellement implémentés :

| Écran | Route |
| --- | --- |
| Accueil public | `/` |
| Connexion | `/connexion` |
| Création de compte | `/inscription` |
| Suite du parcours d'inscription | `/inscription/*` |
| Tableau de bord intérimaire | `/accueil` |
| Recherche de missions | `/missions` |
| Détail d'une mission | `/missions/:id` |
| Candidature | `/missions/:id/candidater` |
| Mentions légales et données personnelles | `/mentions-legales` |

Les trois premières routes sont construites d'après les maquettes InfiMatch ;
les suivantes dérivent du kit précédent et suivent la nouvelle marque par les
tokens.

## Stack

| Couche | Choix |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build | Vite |
| Routage | React Router 7 (mode data) |
| Styles | CSS Modules + variables CSS |
| Données | couche `src/data` simulée, remplaçable par l'API |

Aucune librairie de composants ni framework CSS : les tokens de
[DESIGN.md](DESIGN.md) sont implémentés directement, ce qui garde le bundle
léger (critère RGESN) et le rendu fidèle à la maquette.

## Installation

```bash
npm install
```

## Scripts

```bash
npm run dev          # serveur de développement
npm run build        # build de production
npm run preview      # prévisualisation du build
npm run typecheck    # vérification TypeScript
npm run icons        # régénère le sprite depuis src/assets/icons
npm run screenshots  # capture les écrans (serveur de dev requis)
npm run audit:a11y   # contrôles RGAA sur 14 routes × 3 largeurs
```

`screenshots` et `audit:a11y` pilotent Chromium via Playwright et supposent
`npm run dev` lancé dans un autre terminal.

## Arborescence

```
src/
  data/       types et jeu de données de démonstration
  layouts/    coques publique, authentification et application
  pages/      un fichier par écran
  styles/     tokens et socle CSS
  ui/         primitives du design system
public/
  images/     visuels d'ambiance
docs/
  screenshots/  captures des interfaces
```

## Design

Le système de design est spécifié dans [DESIGN.md](DESIGN.md).

- Marque **InfiMatch** : bleu `#1466E0` pour les surfaces et les boutons,
  `#0B3D9E` pour le texte sur fond clair, sarcelle `#0E6C7C` en accompagnement,
  typographie Plus Jakarta Sans.
- Les noms de tokens hérités du premier jeu de maquettes (`--blue-500`,
  `--tint`, `--text-strong`…) sont conservés comme alias de la nouvelle palette :
  les écrans déjà livrés suivent la marque sans réécriture.
- Le visuel de `public/images` est un **SVG de substitution**. Il occupe la place
  et la forme prévues pour la photographie ; le cliché sous licence se substitue
  au fichier sans toucher au code. Les écrans d'accès n'en portent pas : leur
  panneau gauche tient sur la promesse de marque seule.
- Les maquettes présentent chaque écran comme une carte posée sur un fond
  coloré : c'est le cadre de présentation du fichier de design, pas l'interface.
  Les pages sont donc rendues en pleine largeur, en-tête collant compris, et le
  contenu est contenu par un conteneur centré de 1320px.

## Accessibilité, éco-conception, SEO

**RGAA 4.1** — structure sémantique (un seul `h1` par page, `main`, `nav`,
`fieldset`/`legend` sur les groupes de champs), navigation clavier complète,
focus visible jamais supprimé, libellés réels sur tous les champs, contrastes
vérifiés, lien d'évitement, `prefers-reduced-motion` respecté.

`npm run audit:a11y` vérifie automatiquement sept critères sur 14 routes à
320, 768 et 1440px et échoue si l'un d'eux régresse. Cette couverture est
partielle : elle ne remplace pas un audit manuel (ordre de tabulation,
lecteur d'écran, contraste des états au survol).

**RGESN** — quatre pratiques appliquées et vérifiables :

1. *Réduction des requêtes* — aucune dépendance UI tierce, icônes servies par un
   sprite unique intégré au bundle, aucun appel réseau au premier rendu.
2. *Compression d'images* — visuels en SVG (moins de 2 Ko chacun) plutôt qu'en
   bitmap.
3. *Chargement différé* — `loading="lazy"` et `decoding="async"` sur les visuels
   d'ambiance, qui ne retardent jamais l'affichage du formulaire.
4. *Sobriété typographique* — une seule famille, cinq graisses, `display=swap`.

**SEO** — `title` et `description` propres à chaque page publique, hiérarchie de
titres logique, URLs lisibles en français, `robots.txt` et `sitemap.xml`.

## Conformité

- **RGPD** — base légale, durées de conservation et droits des personnes sont
  exposés sur `/mentions-legales`, lié depuis la connexion et la création de
  compte. Le consentement aux conditions d'utilisation est une case décochée par
  défaut, distincte des communications facultatives.
- **Code du travail** — les règles propres à l'intérim (durée maximale de
  mission, mentions obligatoires du contrat de mission) sont rappelées sur la
  même page et s'appliqueront aux écrans de mission et de contrat.
- **Sécurité** — le formulaire de connexion suspend les tentatives au bout de
  cinq essais. C'est un garde-fou d'interface : le hachage des mots de passe,
  l'expiration des sessions et la limitation réelle relèvent du serveur.

## Branches

| Branche | Contenu |
| --- | --- |
| `main` | documentation produit et design |
| `front-end` | application React |


## Recuperation locale des ecrans

Les ecrans de missions et candidatures supprimes par le commit feat:AUTH ont ete recuperes avec leurs routes protegees. Lire [le bilan et les limites d’integration](docs/RECUPERATION_FRONT.md). Les donnees et la connexion restent simulees par defaut ; aucune integration backend complete n’est validee.
