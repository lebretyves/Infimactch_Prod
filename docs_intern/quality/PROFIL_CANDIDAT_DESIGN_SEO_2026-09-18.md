# Profil intérimaire, organisation des pages et SEO — 18 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

## Périmètre

Quatorze types de pages candidat examinés : vue d’ensemble, recherche, fiche annonce, candidature, liste et détail des candidatures, disponibilités/mobilité, profil, dossier, favoris, historique des missions, fiche établissement, notifications et compte. Revue de code et tests avec données fictives ; pas de contrôle du contenu du compte personnel ouvert par l’utilisateur.

## Rôle des pages

- Profil : qualifications, compétences, expériences et préférences utilisées pour la recherche et le matching. Informations personnelles en lecture seule avec demande de correction administrative.
- Disponibilités et mobilité : calendrier et zone géographique ; il s’agit de données métier réellement utilisées pour rapprocher les missions.
- Dossier : vérification professionnelle, justificatifs et RIB. Une qualification déclarée ne signifie pas que le diplôme a été vérifié.
- Recherche et favoris : découvrir et conserver les offres.
- Candidatures et missions : suivre une demande, puis les affectations confirmées. Une candidature envoyée n’est pas une affectation.
- Notifications : messages et réglages, sans duplication dans la vue d’ensemble.
- Compte : gestion de la demande de clôture ; aucune suppression immédiate implicite.

## Constats avant réorganisation

Le profil empilait identité verrouillée, diplômes et CV/expériences face à une deuxième pile compétences/préférences, entraînant de grands décalages de hauteur. Les espacements de page et de carte se cumulaient. La mobilité était dissimulée sous un accès nommé seulement Disponibilités. Les étapes d’ajout d’une expérience au formulaire et d’enregistrement du profil pouvaient être confondues. Les pages de suivi partageaient des styles mais pas toujours une organisation cohérente.

## Organisation et design réalisés

Navigation regroupée par usage : Découvrir, Suivi et Mon dossier. Les notifications restent accessibles séparément. L’accès au calendrier indique désormais « Disponibilités et mobilité ».

Le profil présente une seule progression : diplômes, expériences/CV, compétences, préférences, informations personnelles verrouillées. Un sommaire permet de rejoindre chaque partie. Le CV est repliable ; ses erreurs et statuts restent visibles. Le dossier administratif distingue RPPS, justificatifs, référence et RIB. Le calendrier conserve ses couleurs et ses règles métier.

Espacements et largeurs harmonisés, cartes de suivi plus compactes, actions essentielles de 44 px sur mobile. La candidature conserve les avertissements sur les écarts et la confirmation explicite. Les styles partagés sont limités à l’espace candidat pour préserver l’espace entreprise.

## Vérifications et limites

Build TypeScript/Vite et génération HTML réussis. Recettes avec API simulées sur les quatorze types de pages, aux largeurs 375, 768 et 1440 px, avec états vides et remplis. Vérifications du clavier, de la sauvegarde du profil, des cartes d’expérience, de l’import CV PDF/OCR, des demandes de correction, du calendrier et de la candidature simulée. Les tests SEO couvrent titres, descriptions, absence de données personnelles, noindex initial privé et canoniques publiques.

Ces essais ne constituent pas une vérification du CV ou du compte réel de l’utilisateur. Les règles de matching et les conditions d’affectation n’ont pas été modifiées. Les résultats d’analyse de CV doivent toujours être relus avant enregistrement.

## SEO : acquis et corrections

Acquis : accueil public, quatre pages d’information, sitemap de cinq URL publiques, robots.txt permettant aux robots de lire les directives, balise canonique sur les pages publiques, en-tête noindex pour les routes du compte, protection des données par authentification/API. Le noindex n’est pas une protection d’accès.

Corrections réalisées : titres et descriptions de routes cohérents, sans noms ni identifiants personnels ; suppression de la canonique d’accueil sur le HTML initial des pages privées ; fichier HTML privé noindex dès la première réponse, conservant les protections HTTP existantes. Les pages personnelles restent exclues du sitemap.

## Ce qui reste nécessaire pour développer le référencement public

1. Mesurer l’indexation réelle via Search Console sur le domaine retenu et déclarer le sitemap. Aucun accès Search Console disponible dans cette vérification ; ne pas annoncer que les pages sont indexées.
2. Publier des pages utiles pour les métiers IDE/IADE/IBODE avec du contenu réel et distinct si cette extension marketing est retenue. Éviter les pages de villes dupliquées et les promesses de missions non vérifiées.
3. Pour Google Jobs, prévoir des fiches publiques de véritables postes ouverts, accessibles au robot, avec dates, lieu, employeur et expiration fiables. Ne pas appliquer JobPosting aux missions de démonstration, aux listes de résultats ni aux seules pages privées.
4. Mesurer les Core Web Vitals sur des visites réelles ; les builds et captures ne fournissent pas ces mesures. Pas de garantie de position dans Google.
5. Compléter les mentions de l’éditeur et le contact public avant une ouverture commerciale générale. Les améliorations d’interface ne remplacent pas ce travail.

## Références utilisées

- Google noindex : https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Google titres : https://developers.google.com/search/docs/appearance/title-link
- Google JobPosting : https://developers.google.com/search/docs/appearance/structured-data/job-posting
- Organisation des services candidat France Travail : https://www.francetravail.fr/candidat/votre-espace-personnel.html
- Regroupement logique des formulaires W3C : https://www.w3.org/WAI/tutorials/forms/multi-page/

L’organisation des pages proposée est une adaptation à InfiMatch, pas une reproduction d’un site tiers.