# Sauvegarde locale sur authentification ? 16 septembre 2026

Snapshot du backend local InfiMatch ? la racine, du frontend local dans frontend/ et des documents transversaux dans workspace-docs/. Inclut les changements non commit?s et les deux branches de s?curit? int?gr?es localement. Le manifeste d?crit les fichiers copi?s avant publication.

Secrets, fichiers .env r?els, donn?es priv?es, volumes Docker, d?pendances node_modules, sorties de compilation et archives de sauvegarde exclus. Il s'agit d'une sauvegarde du projet publiable, pas d'une sauvegarde int?grale du disque ou des bases. Les d?p?ts de travail locaux ne sont pas remplac?s.

Validation avant copie : 101 tests unitaires backend, 10 tests client API frontend, compilations backend/frontend r?ussies. Docker/Vault indisponibles ; migrations non appliqu?es et recette compl?te non effectu?e. Deux d?fauts documentaires connus restent ouverts : quota bloquant les confirmations et nettoyage concurrent. Voir docs/BILAN_RECUPERATION_SECURITE_2026-09-16.md.

Backend : npm ci puis npm run build ? la racine. Frontend : npm ci puis npm run build dans frontend/. Configuration et services ? pr?parer selon les README ; aucun secret fourni.
