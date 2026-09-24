# Tutoriels d’aide — frontend actuel et voix française

Les six tutoriels ont été réenregistrés sur le frontend construit le 21 septembre 2026 : inscription et Discord, profil/CV, recherche/matching, candidature/agenda, acceptation/PDF, annulation/emails. Captures et réponses API utilisent uniquement des exemples fictifs. Aucun email ni message Discord réel n’est envoyé.

Chaque vidéo comporte une narration française (Microsoft Hortense Desktop), un flux Opus, des explications à l’écran, une piste WEBVTT synchronisée, une affiche actualisée et des étapes écrites. La durée des scènes tient compte de la narration. Aucun démarrage automatique ni téléchargement du média avant le choix du tutoriel. Révision de cache : `2026-09-21-voix-r2`.

Les scènes montrent notamment l’acceptation directe et sa confirmation intégrée, les rubriques Notifications dépliables et l’enregistrement explicite du CV dans Mes documents. Les six vidéos ont été intégralement décodées, image et son. Le lecteur a été testé avec audio décodé, sous-titres chargés et absence de débordement à 1440, 390 et 320 pixels. Des images de contrôle ont été examinées sur les six parcours. Cela ne remplace pas une recette sur chaque modèle de téléphone physique.

Preuves : `annexe/proofs/help-videos-2026-09-21/audio-validation.json` et `browser-audio-results.json`.

## Reproduire

Depuis la racine du dépôt, construire le backend et le frontend, puis servir le build frontend localement au port 4189. Sous Windows, avec la voix française Hortense installée :

```text
python frontend/scripts/narrate-help-tutorials.py --prepare
node frontend/scripts/record-help-tutorials.mjs
python frontend/scripts/narrate-help-tutorials.py --mix
npm --prefix frontend run build
node frontend/scripts/test-help-videos-browser.mjs
```

Définir `FFMPEG_BINARY` vers un FFmpeg avec libopus pour le mixage. `BASE_URL` permet de choisir le serveur local. `PROOF_DIR` permet de choisir le répertoire de travail des enregistrements et de la narration. Les WAV intermédiaires et captures ne sont pas publiés.
