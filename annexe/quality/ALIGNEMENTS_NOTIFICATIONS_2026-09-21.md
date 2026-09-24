# Alignements, espaces et notifications — 21 septembre 2026

## Demandes traitées
- Revue des groupes de boutons, cadres, retours à la ligne et grands espaces inutilisés dans les espaces utilisateur et admin.
- Gestion de mission : actions regroupées, liens et boutons de dimensions cohérentes ; confirmation intégrée au flux, y compris après échec.
- Tableau de bord agence/établissement : répartition des offres et notifications pour réduire le vide sous la colonne courte.
- Administration : le fond du libellé de statut s'étend à toute la carte, sans deuxième encadré interne.
- Accueil public : « Créer mon compte » sous « Connexion », lien bleu sans fond ni cadre.
- Vos matchs : ordre des filtres Partenaires, Externes, Toutes. Sélection et classement conservés.
- Notifications agence et établissement : quatre grandes sections indépendantes dépliables vers le bas. Fermées initialement, utilisables au clavier, formulaires conservés quand une section est refermée. Le rôle intérimaire et l'étape facultative d'inscription conservent leur présentation.

Les textes, destinations, commandes et traitements métier restent conservés. Les modifications de structure concernent les conteneurs de présentation et les sections explicitement demandées. Aucun traitement backend ni migration.

## Références consultées
- [GOV.UK — boutons](https://design-system.service.gov.uk/components/button/) : hiérarchie et alignement des actions.
- [GOV.UK — disposition](https://design-system.service.gov.uk/styles/layout/) : grille adaptée aux différentes largeurs, lecture mobile.
- [Carbon — espacements](https://carbondesignsystem.com/elements/spacing/overview/) : échelle régulière et regroupement visuel.
- [W3C — redistribution du contenu](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) : conserver l'information et les actions quand la largeur disponible diminue.

L'identité InfiMatch est conservée ; ces références guident les espacements et comportements responsive, sans introduire la palette d'un autre site.

## Méthode de validation
Navigation locale avec API simulées et données fictives, mesures de rectangles des contrôles et de débordement, captures desktop/mobile, vérifications ciblées clavier et états d'erreur. Aucun message Discord ni email réel envoyé. Les tableaux complexes peuvent conserver un défilement horizontal interne.

Les vérifications de production portent sur les déploiements et les ressources publiques ; elles ne constituent pas une campagne de mutations sur des comptes réels. Les états et données possibles ne sont pas tous exhaustivement testables.

## Contrôles terminés avant publication
- Administration : 24 routes à 320/375/768/1440, six familles de modales aux quatre largeurs, connexion aux quatre largeurs et détail mission avec zoom CSS 200 %. Évaluation indépendante PASS. Les tableaux défilent à l'intérieur de leur conteneur.
- Authentification/inscription : 13 routes aux quatre largeurs, soit 52 cas. Brouillon d'inscription valide restauré pour les étapes ; confirmations également examinées sans session. Évaluation indépendante PASS.
- Notifications agence et établissement : quatre panneaux indépendants, Enter/Espace, saisies et cases conservées à la fermeture, sauvegarde simulée échouée puis reprise, journal email et reprise ; autres rôles et onboarding inchangés. Évaluation indépendante PASS et test sur build local réussi.
- Pages publiques d'information : aide, installation, accessibilité, écoconception, mentions et page introuvable aux quatre largeurs : aucun débordement ou chevauchement visible détecté. Les fragments de liens sont mesurés séparément et les contenus de details fermés exclus.
- Confirmations : retour sans mutation, erreur 503 gardant le panneau ouvert, reprise avec la même clé d'idempotence, succès et rechargement ; aucun dialogue natif, aucun débordement aux quatre largeurs après correction.
- Régressions fonctionnelles simulées : préférences Discord, association et erreurs réseau/code, lecture des notifications, actions du tableau de bord agence, authentification et gestion admin : succès.

## Contrastes principaux
Calcul selon la luminance relative sRGB des WCAG, sans arrondir le résultat avant décision :

| Association | Couleurs texte/fond | Rapport | Texte courant AA |
|---|---|---|---|
| Texte principal | #0b1846 / #f3f7fb | 15,82:1 | Oui |
| Bouton principal | #ffffff / #005bd8 | 6,02:1 | Oui |
| Lien sur blanc | #064bbb / #ffffff | 7,69:1 | Oui |
| Statut ouvert | #1c6047 / #e5f4ee | 6,58:1 | Oui |
| Statut annulé | #943c31 / #fbece9 | 6,20:1 | Oui |
| Statut standard | #113f9c / #e8effa | 8,20:1 | Oui |

Outil public consulté : [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/). Le tableau est un calcul local reproductible, pas un audit complet réalisé par WebAIM. Ces mesures ne prouvent pas la conformité complète de toutes les pages, images ou états possibles.

## Compléments demandés pendant la revue
- Bouton d'accessibilité unique en haut à gauche des en-têtes existants (accueil public, authentification, inscription et trois rôles utilisateur), avec emplacement en flux pour les pages sans en-tête. Cookies en pied de page. Croix de fermeture sans encadré permanent ; repères de focus clavier conservés.
- Zone de recherche du calendrier : ville et rayon alignés par le haut, aides sous leurs champs ; ligne d'enregistrement séparée. Alignement des positions verticales des deux champs contrôlé sur écran large et empilement contrôlé sur mobile, profil vide et rempli.
- Historique : sélection explicite Mois/Année disponible même sans mission ; années courantes et couvertes par les missions, filtrage en Europe/Paris, statut et détail conservés.

Les anciennes annonces à compléter et la reprise d'un besoin ont finalement été contrôlées avec des réponses simulées valides : dix vues supplémentaires sans alerte de fixture ni débordement. Les limites de fixture initiales ont été levées pour ces deux cas. Les vérifications du zoom utilisent du zoom CSS et des largeurs réduites ; elles ne remplacent pas tous les modes de zoom de tous les navigateurs.

## Validation finale
- Compilations utilisateur et admin : succès.
- Accessibilité : évaluation indépendante PASS, 36 vues à quatre largeurs, aucun chevauchement dans les en-têtes, clavier et retour du focus contrôlés ; neuf vues de premier consentement.
- Historique : évaluation indépendante PASS, 51 missions sur deux pages API, fuseau navigateur différent de Paris, filtres mois/année/statut et état vide.
- Sur le build local final : tests accessibilité, historique et notifications agence/établissement réussis. Sources modifiées valides en UTF-8, sans caractère de remplacement.

## Corrections après captures utilisateur
- Centre d’aide : suppression du doublon du menu latéral, lien conservé dans l’en-tête sur mobile et ordinateur.
- Tableau de bord intérimaire : missions à venir et disponibilités/profil sur une seule colonne pleine largeur ; état sans mission compact sur ordinateur pour éviter le vide latéral. Textes, liens et accordéon conservés.
- Dossier : bloc RIB déplacé sous la vérification professionnelle dans la colonne gauche ; justificatifs à droite, passage à une colonne sur mobile. Aucun changement aux traitements de documents.
- Compilation utilisateur réussie ; huit tests existants de coordonnées bancaires et de lecture/révision de CV réussis.

## Emplacement de l’accessibilité révisé
À la demande suivante de l’utilisateur, dans les espaces connectés le bouton d’accessibilité est désormais à droite, immédiatement avant l’identité du compte. Le logo reprend la première position à gauche. Cette demande remplace le placement à gauche précédemment demandé pour ces en-têtes. L’avatar reste visible sur petit écran. Les en-têtes publics et d’inscription ne changent pas.
