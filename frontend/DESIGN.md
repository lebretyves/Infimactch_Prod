# DESIGN.md — Système de design web

Application **web responsive** d'intérim pour les professionnels de santé.

- **Référence en vigueur** : maquettes InfiMatch — accueil public, connexion,
  création de compte.
- **Référence précédente** : kit Figma `Medical App UI Kit` (`4Yp8gwXzctZhMSYzm4woxB`),
  dont dérivent les écrans de recherche et de candidature.

---

## 0. Principe de transition

> **Les maquettes InfiMatch fixent l'identité ; le kit Figma ne subsiste que
> dans la structure des écrans déjà livrés.**

Le passage à InfiMatch change trois choses et n'en change pas une quatrième :

| Ce qui change | Ce qui ne change pas |
|---|---|
| Le bleu de marque passe du cyan `#00BBD3` au bleu `#1466E0` | L'échelle d'espacement en base 4 |
| League Spartan cède la place à Plus Jakarta Sans | Les règles de contraste (§2.8) |
| Les contrôles abandonnent la pilule pour un coin de 12px | Les transformations responsives (§3.4) |

Les noms de tokens hérités (`--blue-500`, `--tint`, `--text-strong`…) sont
conservés comme **alias** de la nouvelle palette : les écrans construits sur le
kit suivent la marque sans réécriture.

---

## 1. Fondations — tokens de marque

| Rôle | Variable CSS | Valeur |
|---|---|---|
| Bleu de marque, surfaces et boutons | `--brand-600` | `#1466E0` |
| Survol d'une surface bleue | `--brand-700` | `#0F51C7` |
| Texte et icônes sur fond clair | `--brand-800` | `#0B3D9E` |
| Remplissage d'une carte sélectionnée | `--brand-50` | `#F1F6FE` |
| Sarcelle d'accompagnement (logo, surtitre) | `--teal-700` | `#0E6C7C` |
| Sarcelle décorative | `--teal-400` | `#3BC1CE` |
| Titres | `--ink-900` | `#0A2540` |
| Texte secondaire | `--ink-600` | `#4F6480` |
| Bordure de champ | `--line` | `#DBE4F0` |
| Fond de page | `--page` | `#E9F6FB` |

Contrairement au cyan précédent, `--brand-600` tient **5,24:1 sur blanc** : le
même bleu peut porter une surface *et* du texte. `--brand-800` reste réservé aux
liens et aux libellés posés sur une surface déjà teintée.

**Police** : Plus Jakarta Sans — Regular 400, Medium 500, SemiBold 600, Bold 700,
ExtraBold 800.

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Forme de marque** : les visuels d'ambiance portent un coin presque droit et
trois coins très arrondis (`--radius-visuel`), repris tel quel des maquettes.

---

## 2. Fondations web

### 2.1 Breakpoints

| Nom | Plage | Cible | Colonnes de grille |
|---|---|---|---|
| `xs` | `0 – 599px` | Mobile — **maquette Figma à l'identique** | 4 |
| `md` | `600 – 1023px` | Tablette, mobile paysage | 8 |
| `lg` | `1024 – 1439px` | Ordinateur portable | 12 |
| `xl` | `≥ 1440px` | Écran large, poste de travail | 12 |

```css
/* Approche mobile-first : le kit est la base, tout le reste est une extension. */
@media (min-width: 600px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1440px) { /* xl */ }
```

### 2.2 Conteneurs et gouttières

| Breakpoint | Marge latérale | Gouttière de grille | Largeur max du contenu |
|---|---|---|---|
| `xs` | `30px` *(valeur du kit)* | `16px` | `100%` |
| `md` | `32px` | `20px` | `100%` |
| `lg` | `40px` | `24px` | `1160px` |
| `xl` | `48px` | `24px` | `1280px` |

Les écrans de données denses (tableaux entreprise) sont autorisés à occuper
toute la largeur jusqu'à `1600px`, sans quoi les colonnes deviennent illisibles.

```css
.container {
  width: 100%;
  margin-inline: auto;
  padding-inline: 30px;
}
@media (min-width: 600px)  { .container { padding-inline: 32px; } }
@media (min-width: 1024px) { .container { padding-inline: 40px; max-width: 1160px; } }
@media (min-width: 1440px) { .container { padding-inline: 48px; max-width: 1280px; } }

.container--wide { max-width: 1600px; }
```

### 2.3 Échelle d'espacement

Base 4px. Le kit utilisait des valeurs irrégulières (5, 15, 30) ; elles sont
conservées **uniquement** dans la reproduction pixel du breakpoint `xs`.

```css
--space-1:  4px;   --space-2:  8px;   --space-3: 12px;
--space-4: 16px;   --space-5: 20px;   --space-6: 24px;
--space-8: 32px;   --space-10: 40px;  --space-12: 48px;
--space-16: 64px;  --space-20: 80px;
```

### 2.4 Couleurs

#### Marque

```css
--brand-200: #BBD4FA;  /* bordure claire, piste de curseur */
--brand-500: #2E7CEC;  /* décoratif, dégradés */
--brand-600: #1466E0;  /* SURFACES ET BOUTONS — 5,24:1 sur blanc ✓ AA */
--brand-700: #0F51C7;  /* survol d'une surface bleue */
--brand-800: #0B3D9E;  /* TEXTE ET ICÔNES sur fond clair ✓ AA */
--brand-900: #072152;  /* survol d'un lien */

--brand-100: #E4EFFE;  /* halo de focus */
--brand-50:  #F1F6FE;  /* carte de rôle sélectionnée, pastille d'icône */

--sky-100:   #E3F3F9;  /* surface teintée, panneau promesse */
--sky-200:   #D2EBF4;  /* bordure teintée, piste de progression */
--page:      #E9F6FB;  /* fond des écrans publics */
```

Le bleu de marque porte les surfaces **et** le texte ; `--brand-800` prend le
relais dès que le texte repose sur une surface déjà teintée.

#### Neutres

Le kit n'en fournissait aucun. Une interface web a besoin de bordures visibles,
de texte secondaire et de surfaces de survol — quatre neutres suffisent.

```css
--white:       #FFFFFF;
--sky-50:      #F4FBFD;   /* fond d'application */
--grey-100:    #EEF3F9;   /* survol de ligne, surface désactivée */
--line:        #DBE4F0;   /* bordure par défaut */
--line-strong: #C3D2E4;   /* bordure au survol, case à cocher vide */
--ink-400:     #7C8FA8;   /* texte indicatif (placeholder) */
--ink-600:     #4F6480;   /* texte secondaire — 6,06:1 sur blanc ✓ AA */
--ink-700:     #274867;   /* liens de navigation */
--ink-900:     #0A2540;   /* titres et texte principal ✓ AAA */
```

#### Sémantiques

Nécessaires dès la V1 : statuts de candidature (En attente, Acceptée, Refusée,
Retirée, Expirée), statuts d'offre, statuts de vérification de dossier, résultats
d'import API. Toutes les valeurs `-700` sont vérifiées ≥ 4,5:1 sur blanc.

| Rôle | Fond | Bordure | Texte / icône | Contraste |
|---|---|---|---|---|
| **Info** *(en attente, en cours)* | `--info-50: #F1F6FE` | `#BBD4FA` | `--info-700: #0B3D9E` | 9,30:1 ✓ |
| **Succès** *(acceptée, vérifiée, publiée)* | `--success-50: #E6F6EF` | `#BCE3D2` | `--success-700: #0B7A55` | 5,35:1 ✓ |
| **Avertissement** *(expire bientôt, complément demandé)* | `--warning-50: #FDF3E2` | `#EFD9AE` | `--warning-700: #8A5300` | 6,33:1 ✓ |
| **Danger** *(refusée, erreur d'import, échec)* | `--danger-50: #FCECEA` | `#F2C4BF` | `--danger-700: #B3261E` | 6,54:1 ✓ |
| **Neutre** *(retirée, archivée, expirée)* | `--grey-100` | `--line` | `--ink-600` | 6,06:1 ✓ |

> **Règle :** un statut ne se distingue **jamais par la seule couleur**. Chaque
> pastille de statut porte un libellé textuel, et une icône quand l'écran est dense.

### 2.5 Typographie

Les tailles étroites restent la borne basse d'une échelle fluide. Les maquettes
InfiMatch tapent plus fort dans les titres : graisse `800` et crénage négatif.

| Rôle | étroit | large | Graisse | Usage |
|---|---|---|---|---|
| `hero` | 34 | 56 | 800 | Titre de la page d'accueil |
| `display` | 28 | 42 | 800 | Titre d'écran d'accès, promesse de marque |
| `h1` | 24 | 30 | 800 | Titre de page applicative |
| `h2` | 18 | 22 | 800 | Titre de section |
| `h3` | 15 | 17 | 700 | Titre de carte, en-tête de bloc |
| `lead` | 15 | 18 | 400 | Chapeau, sous-titre |
| `body` | 14 | 15 | 400 | Texte courant |
| `body-sm` | 13 | 14 | 400 | Texte secondaire, métadonnées |
| `label` | 14 | 14 | 600 | Libellé de champ |
| `caption` | 13 | 13 | 400 | Aide, mentions légales, horodatages |
| `button` | 16 | 16 | 700 | Libellé de bouton |

```css
--font-hero:    clamp(34px, 3.1vw + 16px, 56px);
--font-display: clamp(28px, 1.9vw + 16px, 42px);
--font-h1:      clamp(24px, 1.0vw + 19px, 30px);
--font-h2:      clamp(18px, 0.5vw + 16px, 22px);
--font-h3:      clamp(15px, 0.3vw + 14px, 17px);
--font-lead:    clamp(15px, 0.4vw + 14px, 18px);
--font-body:    clamp(14px, 0.15vw + 13px, 15px);
--font-body-sm: clamp(13px, 0.15vw + 12px, 14px);
--font-label:   14px;
--font-caption: 13px;
```

**Interlignes** — le kit utilisait `line-height: normal` partout, acceptable sur
des libellés courts, illisible pour du texte suivi sur écran large :

```css
--leading-tight: 1.12;  /* titres */
--leading-snug:  1.35;  /* libellés, cellules de tableau */
--leading-normal:1.6;   /* paragraphes, descriptions de mission */
```

**Longueur de ligne** : `max-width: 68ch` sur tout bloc de texte suivi
(description de mission, CGU, aide). Sans cette contrainte, une description
s'étale sur 1400px et devient illisible.

**Chiffres tabulaires** dans les tableaux et les calendriers :
`font-variant-numeric: tabular-nums;` — avec repli sur la pile système si
Plus Jakarta Sans ne fournit pas la fonte chiffrée.

### 2.6 Rayons

| Token | Valeur | Usage |
|---|---|---|
| `--radius-sm` | `8px` | Pastille de statut, petit bouton, cellule sélectionnée |
| `--radius-md` | `13px` | Champ de saisie *(valeur du kit)* |
| `--radius-lg` | `17px` | Carte médecin *(valeur du kit)* |
| `--radius-xl` | `18px` | Tuile spécialité, zone de texte, puce jour *(kit)* |
| `--radius-2xl` | `20px` | Carte rendez-vous, boîte de dialogue, panneau *(kit)* |
| `--radius-3xl` | `30px` | CTA principal, conteneur de section large *(kit)* |
| `--radius-pill` | `999px` | Bouton pilule, filtre, pastille |

Le rayon `30px` du **cadre d'écran** mobile disparaît en web : à `md` et au-delà,
l'application occupe la fenêtre, sans coins arrondis sur le shell.

### 2.7 Élévation

Le kit n'utilisait aucune ombre — la séparation venait du fond teinté et des
filets 1px. Sur écran large, ce vocabulaire ne suffit plus : les couches
superposées (menu, boîte de dialogue, panneau) doivent flotter.

```css
--shadow-none: none;                                        /* cartes en flux */
--shadow-sm:   0 1px 2px rgba(37,37,37,.06),
               0 1px 3px rgba(37,37,37,.04);                /* carte survolée */
--shadow-md:   0 4px 12px rgba(37,37,37,.08);               /* menu, popover, toast */
--shadow-lg:   0 12px 32px rgba(37,37,37,.14);              /* dialogue, panneau latéral */
--shadow-ring: 0 0 0 1px var(--grey-300);                   /* bordure-comme-ombre */
```

**Règle :** les cartes **en flux** restent plates (bordure `--grey-300` ou `--tint`).
L'ombre signale exclusivement un élément **au-dessus** du contenu.

### 2.8 Accessibilité — le point critique

Le cyan précédent était inutilisable pour du texte ; le bleu InfiMatch lève
cette contrainte. Vérifications :

| Combinaison | Ratio | Verdict |
|---|---|---|
| `#1466E0` sur blanc | **5,24:1** | ✓ AA |
| Blanc sur `#1466E0` *(bouton primaire)* | **5,24:1** | ✓ AA |
| `#0B3D9E` sur blanc | **9,30:1** | ✓ AAA en grand texte |
| `#0E6C7C` sur blanc *(surtitre sarcelle)* | **6,08:1** | ✓ AA |
| `#4F6480` sur blanc *(texte secondaire)* | **6,06:1** | ✓ AA |
| `#7C8FA8` sur blanc *(texte indicatif)* | **3,56:1** | ✗ réservé au placeholder |
| `#0A2540` sur `#E3F3F9` | **14,6:1** | ✓ AAA |

**Règles qui en découlent — non négociables :**

1. **Texte d'accentuation** : `--brand-800` sur fond blanc ou teinté ; la
   classe `.accent` ne fait rien d'autre.
2. **Valeurs saisies dans un champ** : `--ink-900`. Le texte indicatif descend à
   `--ink-400`, qui reste sous 4,5:1 : il ne porte donc **jamais** une
   information absente du libellé.
3. **Texte blanc sur `--brand-600`** : autorisé à toutes les tailles depuis le
   passage au bleu, y compris le libellé de bouton en 16px.
4. **Icônes fonctionnelles** (navigation, actions) : `--brand-800` ou
   `--ink-700`. `--teal-400` et `--brand-500` restent décoratifs.
5. **Cible de pointage** : 24 × 24px minimum (`lg`), 44 × 44px au toucher (`xs`).
6. **Focus clavier visible sur tout élément interactif** (§2.9) — le kit n'en
   prévoyait aucun.
7. **`prefers-reduced-motion`** respecté : transitions ramenées à `0ms`.
8. Chaque champ possède un `<label>` réel ; le placeholder n'est jamais le seul
   libellé.

### 2.9 États d'interaction

Le kit ne fournissait que deux états (actif / inactif). Le web en exige six.
Ce tableau est **normatif pour tout élément interactif** :

| État | Traitement |
|---|---|
| `default` | Tel que spécifié au §4 |
| `hover` | Assombrissement de 6 % du fond, ou passage de `--blue-700` à `--blue-900` ; ajout de `--shadow-sm` sur les cartes cliquables |
| `active` | Assombrissement de 10 %, `transform: translateY(1px)` |
| `focus-visible` | `outline: 2px solid var(--blue-700); outline-offset: 2px;` — **jamais supprimé** |
| `disabled` | `background: var(--grey-100); color: var(--grey-600); cursor: not-allowed;` — la couleur de marque est remplacée par un aplat gris, jamais désaturée |
| `loading` | Libellé conservé + indicateur, largeur figée pour éviter le saut de mise en page |

```css
:root { --focus-ring: 2px solid var(--blue-700); }

*:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 2px;
  border-radius: inherit;
}
```

### 2.10 Mouvement

```css
--duration-fast:  120ms;  /* survol, focus */
--duration-base:  200ms;  /* ouverture de menu, bascule d'onglet */
--duration-slow:  320ms;  /* panneau latéral, dialogue */
--ease-out: cubic-bezier(.2, .8, .3, 1);

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

---

## 3. Structures d'écran (shells)

### 3.1 Shell public et authentification

| Breakpoint | Structure |
|---|---|
| `xs` | Pleine largeur, marge 30px, logo en haut, formulaire au fil |
| `md` | Carte centrée `max-width: 440px`, `--radius-2xl`, `--shadow-lg`, sur fond `--tint` |
| `lg` `xl` | **Écran scindé** : panneau gauche 45 % en `--blue` (logo, baseline, argument), panneau droit 55 % blanc avec le formulaire centré `max-width: 400px` |

Le panneau bleu est le seul endroit où une grande surface de marque est
justifiée : il n'y a aucun contenu à lire par-dessus, hors titre en blanc 32px/600.

### 3.2 Shell infirmier

| Breakpoint | Navigation | Contenu |
|---|---|---|
| `xs` | **Barre basse fixe 67px**, 4 icônes *(kit)* + barre haute 56px | 1 colonne |
| `md` | **Rail latéral gauche 72px**, icônes seules + info-bulle ; barre basse supprimée | 1–2 colonnes |
| `lg` | **Barre latérale 240px** dépliée (icône + libellé), barre haute 64px | Contenu `max-width: 1160px` |
| `xl` | Barre latérale 240px | Contenu + **colonne contextuelle droite 320px** (prochaine mission, alertes de complétude) |

Ordre de navigation identique au kit : **Accueil · Recherche · Candidatures ·
Calendrier · Profil**. Élément actif : fond `--tint`, icône et libellé `--blue-700`,
barre d'accent 3px en `--blue` (à gauche sur la barre latérale, au-dessus
sur la barre basse).

### 3.3 Shell entreprise

Interface de travail, densité supérieure.

| Breakpoint | Structure |
|---|---|
| `xs` | Barre haute + **tiroir de navigation** ; les tableaux deviennent des cartes |
| `md` | Barre latérale 72px repliée + barre haute 64px |
| `lg` `xl` | **Barre latérale 260px** persistante + barre haute 64px (fil d'ariane, recherche, notifications, compte) ; contenu `--container--wide` jusqu'à 1600px, fond `--grey-50` pour détacher les cartes blanches |

Navigation : Tableau de bord · Offres · Candidatures · Profils · Planning ·
Import API · Paramètres.

### 3.4 Transformations responsives

Table de correspondance **normative** entre le pattern mobile du kit et son
équivalent sur écran large.

| Pattern `xs` (kit Figma) | `md` | `lg` / `xl` |
|---|---|---|
| Barre de navigation basse | Rail 72px | Barre latérale libellée 240px |
| Écran de filtres plein écran | Tiroir latéral | **Colonne de filtres 280px persistante** |
| Liste verticale de cartes | Grille 2 colonnes | Grille 3 colonnes *(infirmier)* / **tableau dense** *(entreprise)* |
| Détail plein écran | Plein écran | **Liste-détail** : liste 380px + panneau de détail |
| Assistant étape par étape | Idem + indicateur horizontal | **2 colonnes** : indicateur vertical 260px + formulaire 640px |
| En-tête bleu pleine largeur 268px | Pleine largeur 220px | **Carte bleue contenue**, `--radius-2xl` — cf. §5 |
| Grille de tuiles 3 × 96px | 4 colonnes | 6 colonnes, tuiles 120 × 116px |
| Calendrier mensuel compact | Mois + panneau du jour | Mois pleine largeur + **panneau latéral du jour 360px** |
| Notifications en écran plein | Tiroir | **Popover** (10 dernières) + page dédiée |
| Actions empilées en bas d'écran | Alignées à droite | Barre d'actions en haut à droite de la page |
| Champ 298px pleine largeur | 2 champs par ligne | 2–3 champs par ligne, largeur pilotée par le type de donnée |

---

## 4. Composants

### 4.1 Boutons

| Variante | Dimensions `lg` | Fond | Texte | Rayon |
|---|---|---|---|---|
| **Primaire** | hauteur 44, padding `0 24` | `--blue` | blanc 16/600 | `--radius-pill` |
| **Secondaire** | hauteur 44 | `--tint` | `--blue-700` 16/600 | `--radius-pill` |
| **Contour** | hauteur 40 | transparent, bordure 1px `--blue-500` | `--blue-700` | `--radius-pill` |
| **Fantôme** | hauteur 40 | transparent | `--blue-700` | `--radius-pill` |
| **Danger** | hauteur 44 | `--danger-700` | blanc | `--radius-pill` |
| **Icône seule** | 40 × 40 | `--tint` | `--blue-700` | cercle |

Tailles : `sm` 36px · `md` 44px *(défaut)* · `lg` 52px *(CTA d'authentification,
reprend le 207 × 45 du kit à `xs`)*.
Six états obligatoires (§2.9). Le CTA principal du kit (`radius: 30px`,
libellé 24px) est conservé tel quel au breakpoint `xs`.

### 4.2 Champs de formulaire

| Élément | Spécification |
|---|---|
| **Libellé** | 13/500 `--text-strong`, au-dessus du champ, `margin-bottom: 6px` |
| **Champ** | hauteur 44 (`xs` : 45 *kit*), `--radius-md`, fond `--tint`, bordure 1px transparente, texte **`--text-strong` 15/400**, padding `0 15px` |
| **Placeholder** | `--grey-600` — jamais `--blue-400` (§2.8) |
| **Survol** | bordure `--tint-200` |
| **Focus** | bordure 1px `--blue-500` + `outline: 2px solid --blue-700; offset: 2px` |
| **Erreur** | bordure 1px `--danger-700`, message 13/400 `--danger-700` sous le champ, `aria-describedby` |
| **Désactivé** | fond `--grey-100`, texte `--grey-600` |
| **Aide** | 12/400 `--grey-600` sous le champ |
| **Zone de texte** | `--radius-xl`, hauteur min 120 (`xs` : 298 × 166 *kit*), padding `16px 20px` |
| **Sélecteur** | même boîte, chevron `--blue-700` à droite, menu `--shadow-md`, `--radius-lg` |
| **Recherche** | pilule blanche bordée `--grey-300`, loupe `--blue-700` à gauche, effacement à droite |

**Largeur des champs, pilotée par le contenu** : code postal 120px, date 180px,
numéro RPPS ou FINESS 220px, email et adresse pleine largeur de colonne. Un champ
« code postal » à 640px de large est une erreur de lecture.

### 4.3 Pastille de statut

`--radius-pill`, padding `4px 10px`, texte 12/600, point de 6px ou icône à gauche.
Couleurs : §2.4. **Toujours accompagnée d'un libellé écrit.**

Correspondances : `En attente` → info · `Acceptée` / `Vérifiée` / `Publiée` →
succès · `Refusée` / `Échec d'import` → danger · `Expire bientôt` /
`Complément demandé` → avertissement · `Retirée` / `Archivée` / `Expirée` → neutre.

### 4.4 Carte

Fond blanc, `--radius-lg`, bordure 1px `--grey-300` *(ou `--tint` pour conserver
la douceur du kit)*, padding 20 (`lg`) / 16 (`xs`), `--shadow-none` au repos.
**Si cliquable** : `--shadow-sm` au survol, translation `-1px`, curseur pointeur,
et **toute la carte est un lien** — pas seulement le titre.

**Carte de mission** — établissement + logo, intitulé, spécialité, qualification
requise, dates, distance, rémunération, indicateur de correspondance, bouton favori
en haut à droite.
**Carte médecin** — reprise du kit : `--radius-lg` (17px), avatar circulaire 85px
à gauche, nom `h2` en `--blue-700`, spécialité `body-sm` `--grey-600`, ligne de
méta (étoiles, avis, favori), actions en pilules contour.

### 4.5 Tableau de données — *nouveau, web uniquement*

Pivot de l'espace entreprise (offres, candidatures, journal d'import).

| Élément | Spécification |
|---|---|
| En-tête | hauteur 44, fond `--grey-50`, texte 13/600 `--grey-600`, **collant** au défilement |
| Ligne | hauteur 56 *(confortable)* ou 44 *(compacte)*, filet bas 1px `--grey-300` |
| Survol de ligne | fond `--grey-100` |
| Sélection | fond `--tint`, case à cocher en première colonne |
| Tri | chevron sur l'en-tête, état annoncé via `aria-sort` |
| Alignement | texte à gauche, nombres et dates **à droite**, chiffres tabulaires |
| Colonne d'actions | dernière colonne, largeur fixe, alignée à droite, collante à droite si défilement horizontal |
| Vide | message centré sur 3 lignes + action de sortie |
| Chargement | 5 lignes squelette, jamais un indicateur seul |
| `xs` | **Le tableau devient une liste de cartes** — une carte par ligne, libellés inclus |

### 4.6 Pagination — *nouveau*

Sous le tableau : « 1–25 sur 312 », sélecteur de taille de page (25/50/100),
précédent / suivant + numéros, page courante en `--blue` texte blanc.
Alternative acceptée pour les listes infirmier : défilement infini avec bouton
« Charger plus » de repli.

### 4.7 Boîte de dialogue — *nouveau*

Voile `rgba(37,37,37,.45)`, panneau blanc `max-width: 560px`, `--radius-2xl`,
`--shadow-lg`, padding 24. Titre `h2`, corps, actions alignées à droite
(secondaire puis primaire). Fermeture par `Échap` et par clic sur le voile —
**sauf** si le contenu est un formulaire en cours de saisie, auquel cas une
confirmation est demandée. Focus piégé dans le panneau, restitué à l'ouvrant.
À `xs` : feuille remontante occupant 90 % de la hauteur, poignée en haut.

Usages : confirmation de retrait de candidature (D10), décision sur une
candidature (E7), création d'un intervalle de disponibilité (D12).

### 4.8 Panneau latéral — *nouveau*

Glisse depuis la droite, largeur 420px (`lg`) / 480px (`xl`), pleine hauteur,
`--shadow-lg`. Sert au détail sans quitter la liste : profil candidat depuis la
file de candidatures, détail d'une offre importée, filtres à `md`.
À `xs` : écran plein.

### 4.9 Notification éphémère (toast) — *nouveau*

En bas à droite (`lg`) / en haut (`xs`), `--radius-lg`, `--shadow-md`, largeur
max 360px. Icône sémantique + message + action facultative. Durée 5s, 8s si une
action est proposée, **persistante** pour une erreur. `aria-live="polite"`,
`assertive` pour les erreurs. Empilement de 3 maximum.

### 4.10 Onglets — *nouveau*

Libellés 14/600, indicateur 3px en `--blue` sous l'onglet actif,
inactif `--grey-600`, survol `--blue-700`. Filet 1px `--grey-300` sur toute la
largeur. Navigation au clavier par flèches, `role="tablist"`.
À `xs` : défilement horizontal sans barre visible.
Usages : Favoris Offres/Établissements (D8), statuts de candidature (D9),
calendrier / historique (D11 ↔ D14).

### 4.11 Contrôle segmenté

Reprise du sélecteur `Doctors / Services` du kit. Piste `--tint`,
`--radius-pill`, segment actif en `--blue` texte blanc, inactif
`--blue-700`. Hauteur 40. Deux à quatre segments — au-delà, utiliser des onglets.

### 4.12 Indicateur d'étapes (stepper) — *nouveau*

Assistants d'inscription (B1–B9, C1–C6).
`xs` : barre de progression fine + « Étape 3 sur 8 ».
`lg` : **colonne verticale 260px** à gauche — étape faite (pastille `--blue`
+ coche blanche), en cours (anneau `--blue-500`, libellé `--text-strong` 600),
à venir (`--grey-300`, libellé `--grey-600`). Les étapes franchies sont
cliquables pour revenir en arrière.

### 4.13 Menu déroulant, info-bulle, fil d'ariane — *nouveaux*

- **Menu** : `--radius-lg`, `--shadow-md`, éléments 40px, survol `--grey-100`,
  séparateurs 1px, action destructrice en `--danger-700`, navigation aux flèches.
- **Info-bulle** : fond `--text-strong`, texte blanc 12/400, `--radius-sm`,
  délai 400ms. **Jamais porteuse d'une information indispensable** — inaccessible
  au toucher.
- **Fil d'ariane** : `caption` `--grey-600`, séparateur `/`, page courante en
  `--text-strong` non cliquable. Espace entreprise uniquement, à partir de `lg`.

### 4.14 Dépôt de fichier — *nouveau*

Documents et justificatifs (D19), logo d'établissement (C2).
Zone en tirets 2px `--tint-200`, `--radius-xl`, fond `--tint`, icône + « Glissez
un fichier ou parcourez ». Survol et glisser-déposer : bordure `--blue-500`.
Liste des fichiers déposés avec nom, taille, barre de progression, suppression,
et **statut de vérification** en pastille. Contraintes de format et de poids
affichées **avant** le dépôt, erreurs par fichier.

### 4.15 Calendrier

`xs` : grille mensuelle compacte du kit, puce jour 42 × 64 `--radius-xl`.
`lg` : mois pleine largeur, cellules 120px minimum, **panneau latéral 360px**
pour le jour sélectionné. Trois couches distinguées par **motif et couleur** —
disponibilité (aplat `--tint`, bordure `--blue-500`), indisponibilité (hachures
`--grey-100`), mission affectée (`--blue`, texte blanc). Légende toujours
visible. Navigation au clavier : flèches entre les jours, `PagePrécédente` /
`PageSuivante` entre les mois.

### 4.16 État vide, squelette, erreur — *nouveaux*

- **Vide** : illustration ou icône en trait `--blue-700`, titre `h3`, une phrase
  d'explication, **une action de sortie**. Jamais un simple « Aucun résultat ».
- **Squelette** : blocs `--grey-100`, `--radius-sm`, pulsation 1,5s, **reproduisant
  la forme du contenu attendu** — pas un rectangle générique.
- **Erreur** : icône `--danger-700`, cause en langage clair, bouton « Réessayer »,
  et un chemin alternatif quand il existe.

---

## 5. Règles d'usage du bleu de marque

Le bleu est l'identité de la marque et **le principal risque** de la transition
web : ce qui fonctionne sur 360px de large devient écrasant sur 1440px.

1. **Une seule grande surface bleue par écran.** Deux blocs bleus côte à côte
   annulent l'effet et fatiguent.
2. **L'en-tête pleine largeur devient une carte contenue.** À `xs`, l'en-tête
   360 × 268 est à bord perdu *(kit)*. À partir de `lg`, il s'inscrit dans le
   conteneur avec `--radius-2xl` et une hauteur de 200–240px — un bandeau de
   1600 × 268 en bleu saturé est inutilisable.
3. **Jamais de bleu sur bleu.** Un élément posé sur une surface bleue est blanc,
   contour blanc, ou `--tint` plein.
4. **Le survol d'une surface bleue** passe à `--blue-600`, et l'état actif à
   `--blue-700`. Pas de voile superposé : l'aplat se fonce directement.
5. **Texte** : `--blue-700` en aplat, à partir de la classe `.accent` (§2.8).
6. **Le fond d'application n'est jamais bleu.** Blanc côté infirmier,
   `--grey-50` côté entreprise.

```css
.accent {
  color: var(--blue-700);
}
```

## 6. Recette d'implémentation

### 6.1 Socle

```css
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  font-family: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: var(--font-body);
  line-height: var(--leading-normal);
  color: var(--text-strong);
  background: var(--white);
}

h1, h2, h3 { line-height: var(--leading-tight); margin: 0; }
p { max-width: 68ch; }

/* Lien d'évitement — obligatoire */
.skip-link {
  position: absolute; left: -9999px;
  background: var(--white); color: var(--blue-700);
  padding: 12px 20px; border-radius: var(--radius-md); z-index: 999;
}
.skip-link:focus { left: 16px; top: 16px; }
```

### 6.2 Shell applicatif

```css
.app {
  display: grid;
  grid-template-areas: "main" "nav";        /* xs : nav en bas */
  grid-template-rows: 1fr auto;
  min-height: 100dvh;                       /* dvh : barres mobiles */
}

@media (min-width: 600px) {
  .app {
    grid-template-areas: "nav header" "nav main";
    grid-template-columns: 72px 1fr;
    grid-template-rows: 64px 1fr;
  }
}
@media (min-width: 1024px) {
  .app { grid-template-columns: 240px 1fr; }   /* 260px côté entreprise */
}

.app__nav    { grid-area: nav; }
.app__header { grid-area: header; display: none; }
.app__main   { grid-area: main; overflow-y: auto; }
@media (min-width: 600px) { .app__header { display: flex; } }
```

### 6.3 Ordre de construction

1. **Tokens** (§1, §2.4, §2.5) et chargement de Plus Jakarta Sans.
2. **Socle et shells** (§3, §6.2) — les trois structures avant tout composant.
3. **Primitives** : bouton, champ, carte, pastille, `.grad-text`, avec leurs
   **six états** (§2.9). Un composant sans état de focus n'est pas terminé.
4. **Composants web** (§4.5 à §4.16) : tableau, dialogue, panneau, toast, onglets.
5. **Reproduction pixel du breakpoint `xs`** sur l'écran Home (§7) — c'est le test
   de fidélité au kit.
6. **Extension responsive** des écrans en suivant la table §3.4.
7. **Passe d'accessibilité** : navigation entièrement au clavier, contrastes
   vérifiés, `prefers-reduced-motion`, zoom 200 % sans défilement horizontal.

### 6.4 Icônes

Toutes les icônes sont des **SVG en trait** exportés depuis Figma. Ne jamais les
redessiner ni les remplacer par une librairie générique : le trait fin et le style
« line art médical » font l'identité du kit.

Web : les exporter en un **sprite SVG** (`<symbol>` + `<use>`), `stroke:
currentColor` pour hériter de la couleur d'état, `stroke-width` ajustée par taille
(1,5 à 20/24px ; 1,25 à 32px et au-delà). Grille d'icônes : **20px** (interface
dense), **24px** (navigation), **40px** (tuiles, reprise du kit).

Ré-export via le MCP Figma (les URLs d'assets expirent sous ~7 jours) :

```bash
curl -L -o icons/cardiology.svg "<url-retournée-par-get_design_context>"
```

| Ressource | nodeId |
|---|---|
| Page Design System | `2064:8` |
| Planche `Icons` | `2064:101` |
| Planche `Components & Variants` | `2399:1481` |
| Planche `Additional Elements` | `2064:842` |
| Écran `05 - A - Home` | `2213:326` |
| Jeu d'icônes 40×40 (`Component 28`) | `2238:1267` |
| Boutons `Log In` | `2327:651` |
| `Main Button` | `2327:475` |
| `Filter Button` | `2327:1938` |
| `Switch` | `2445:2069` |
| `Check Point` (radio) | `2327:346` |
| `Booking choose button` (puce jour) | `2130:1153` |
| Carte rendez-vous (`Component 30`) | `2249:2935` |
| En-tête de marque | `2104:646` |

---

## 7. Référence pixel — breakpoint `xs`

Coordonnées exactes de l'écran `05 - A - Home` (nœud `2213:326`), à reproduire
telles quelles sous 600px de large. C'est le **test de conformité** au kit.

| y | Élément |
|---|---|
| `0` | Barre de statut `360 × 28`, fond `#E9F6FE` *(remplacée en web par la barre haute applicative)* |
| `48` | 3 icônes rondes (`27px`) à `x = 30, 61, 92` |
| `48` | Bloc profil `141 × 31` à `x = 190` |
| `106` | Titre `Categories` (`x=31`) + lien `See all` (`x=290`) |
| `130` | Filet 1px, `x=24`, largeur `310` |
| `141` | Rangée des 5 catégories |
| `198` | **En-tête bleu à bord perdu** `360 × 268` |
| `210` | `upcoming schedule` (blanc) + lien `Month` à `x=290` |
| `230` | Filet 1px blanc, `x=31`, largeur `298` |
| `235` | 6 puces de jour `42 × 64` à `x = 32, 81, 132, 183, 234, 285` |
| `260` | Chevrons `‹` `›` à `x = 19` et `x = 333` (`8 × 14`) |
| `317` | Carte rendez-vous `298 × 125`, centrée, bordure blanche |
| `476` | Titre `Specialties` + `See all` |
| `497` | Filet 1px, `x=31`, largeur `298` |
| `515` · `624` | Deux rangées de tuiles à `x = 30, 131, 232` |
| `733` | Barre de navigation `360 × 67`, fond `#E9F6FE` |

**Grille des tuiles `xs`** : 3 colonnes de 96px, pas horizontal 101px
(gouttière 5px), hauteur 94px, pas vertical 109px (gouttière 15px).
**À `lg`** : 6 colonnes, tuiles 120 × 116px, gouttière 24px.

---

## 8. Checklist de conformité

**Marque**
- [ ] Les surfaces primaires portent l'aplat `--brand-600` (#1466E0).
- [ ] Une seule grande surface bleue par écran.
- [ ] L'en-tête bleu devient une carte contenue à partir de `lg`.
- [ ] Plus Jakarta Sans uniquement, en 400 / 500 / 600 / 700 / 800.
- [ ] Icônes en trait, importées depuis Figma, jamais redessinées.
- [ ] Sous 600px, l'écran Home reproduit la table §7 au pixel près.

**Structure**
- [ ] Marges et largeurs max conformes au §2.2 à chaque breakpoint.
- [ ] Navigation transformée selon §3.4 (barre basse → rail → barre latérale).
- [ ] Aucun bloc de texte suivi au-delà de `68ch`.
- [ ] Largeur des champs pilotée par le type de donnée, pas par la colonne.
- [ ] Tableaux transformés en cartes sous 600px.

**Accessibilité**
- [ ] Tout texte d'accentuation en `--blue-700`, jamais en `--blue`.
- [ ] Valeurs de champ en `--text-strong`, jamais en `--blue-400`.
- [ ] Focus visible sur **tout** élément interactif, jamais supprimé.
- [ ] Tout statut porte un libellé écrit, pas seulement une couleur.
- [ ] Navigation complète au clavier, y compris calendrier et tableaux.
- [ ] Zoom 200 % sans défilement horizontal.
- [ ] `prefers-reduced-motion` respecté.
- [ ] Chaque champ possède un `<label>` réel.

**Complétude**
- [ ] Chaque composant interactif possède ses six états (§2.9).
- [ ] Chaque liste possède ses états : rempli, vide, chargement, erreur.
- [ ] Ombres réservées aux couches superposées ; cartes en flux plates.
