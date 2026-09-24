# Tutoriels du nouveau frontend — 24 septembre 2026

Les six parcours ont été réenregistrés dans le vrai frontend servi localement sur le port 4189. Les données sont fictives ; toutes les routes API sont simulées et toute destination extérieure est bloquée. Aucune inscription, notification, candidature ou mission réelle n’a été créée.

## Résultats

- Six enregistrements réussis, aucune erreur JavaScript ni route API inconnue.
- Six vidéos VP8 avec voix française Microsoft Hortense / audio Opus, décodées intégralement sans erreur par FFmpeg.
- Sous-titres français WebVTT et six affiches renouvelés.
- Version du cache : `2026-09-24-front-r3`.
- La vidéo candidature montre désormais la vue Mois : ouverture du jour, modification du créneau et confirmation de sauvegarde automatique. Le scénario vérifie exactement un appel simulé PATCH `/profile/availability`.

L’ancienne fixture indiquait une candidature déjà envoyée, ce qui masque correctement le bouton de candidature dans le nouveau frontend. Le scénario démarre maintenant sans candidature, puis en crée une simulée. Le produit n’a pas été modifié pour contourner cette protection.

## Preuves

- [Parcours et appels simulés](recording-results.json)
- [Décodage et piste audio des six vidéos](audio-validation.json)
- [Lecture réelle dans Edge des six médias](browser-playback.json)
- [Empreintes SHA-256 des 18 médias](media-manifest.json)
- [Vidéos, affiches et sous-titres](../../../frontend/public/guides/tutorials/)

## Reproduction

Depuis la racine : définir `PROOF_DIR` sur un dossier de travail, puis exécuter `python frontend/scripts/narrate-help-tutorials.py --prepare`, `node frontend/scripts/record-help-tutorials.mjs` avec `BASE_URL` du frontend local, et `python frontend/scripts/narrate-help-tutorials.py --mix` avec `FFMPEG_BINARY`. Le générateur de voix utilise Windows System.Speech ; le recorder utilise Edge et Playwright.

Ces preuves valident des tutoriels locaux simulés, pas la livraison des emails ou le fonctionnement des fournisseurs en production.
