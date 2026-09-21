# Couleurs des trois espaces — 21 septembre 2026

## Périmètre
Palette InfiMatch conservée : bleu foncé, cobalt, turquoise. Fonds plus présents, texte sombre, surfaces et commandes secondaires adoucies, pages publiques/authentification et espaces intérimaire/agence/admin harmonisés. Contenus, contrôles et actions conservés.

Deux changements expressément demandés accompagnent le design :
- « Vos matchs », filtre Toutes : deux meilleures offres partenaires et une externe quand les deux sources sont disponibles ; compléter avec la source disponible sinon. Chaque source conserve son classement. Aucun pourcentage inventé pour les offres externes.
- Accueil admin : photo décorative originale générée d'une soignante à l'ordinateur, intégrée en WebP 960 × 640, 45 116 octets. Import local versionné ; aucune dépendance à un hébergeur d'images.

Aucune modification backend ou base de données dans cette livraison. Les modifications préexistantes de Mentions.tsx et des documents CONSERVATION_UTILISATEURS_REELS/DECISIONS_V1 sont exclues.

## Vérifications
- Builds utilisateur et admin : succès.
- Sélection des matchs : 5 tests unitaires réussis ; mélange, classement, limites, dédoublonnage et sources uniques.
- Navigateurs locaux avec API simulées : actions agence, établissements, favoris, filtres, liens des matchs, états vide/erreur et reprise.
- Comparaison des libellés, champs et liens aux références précédentes : identiques sauf la troisième annonce devenue externe conformément à la demande.
- Admin : smoke général, FINESS, comptes, opérations et demandes ; succès. Deux copies temporaires de tests anciens ont été adaptées au contrat préexistant de réauthentification (code + mot de passe) et aux messages génériques.
- Cookies/accessibilité : focus clavier, consentement, options à 130 %, zoom/espacement et couleurs forcées ; succès. Le test historique de position a été adapté dans une copie temporaire : icône en haut près du menu sur l'accueil mobile, pied de page sur les autres présentations existantes.
- Présentations examinées entre 320 et 1440 px selon les pages ; pas de débordement dans les scénarios contrôlés. Profil, dossier et calendrier remplis également vérifiés.
- Évaluation visuelle indépendante : PASS utilisateur et admin. Principales paires de contraste mesurées entre 4,78:1 et 14,85:1 ; ce contrôle ne constitue pas un audit exhaustif d'accessibilité.

Les tests navigateur sont locaux et simulés : ils ne remplacent pas une campagne complète sur les données réelles. Les vérifications de production se limitent à l'état des déploiements et à la disponibilité des ressources publiques.

Recherche : [125 domaines consultés](RECHERCHE_DESIGN_125_SITES_2026-09-21.md), dont 114 santé/recrutement et 11 systèmes de design ; inspection visuelle d'un sous-ensemble clairement distinguée.
