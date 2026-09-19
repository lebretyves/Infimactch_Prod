# PDF de mission sur une page — 19 septembre 2026

Modèles de confirmation et d’annulation validés par l’utilisateur après revue des aperçus. Publication sur les deux Git et Vercel explicitement autorisée par l’utilisateur.

- Une page A4 : disposition mesurée avant rendu, adaptation aux champs longs, aucun texte coupé silencieusement.
- Logo et palette InfiMatch, statut écrit, participants, référent établissement, agence éventuelle, qualification/service/population/bloc, dates et fuseau, lieu, taux et références.
- Prénom et nom des champs d’identité ; repli sur le nom affiché des anciens profils incomplets, sans inventer d’identité.
- Annulation : initiateur, date, motif, taux prévu et identité conservée dans le snapshot.
- Dates sans horaires précis : « Horaires à confirmer ». Aucun salaire total ou conséquence financière calculés.
- Structure de lecture et langue françaises ; aucune certification PDF/UA revendiquée.

Le modèle s’applique aux nouveaux documents générés. Les PDF historiques stockés ne sont ni réécrits ni renvoyés. Aucune migration de base ou nouvelle configuration SMTP2GO.

Validation : compilation backend ; 274 tests unitaires et 6 intégrations PDF/emails réussis ; test du rendu une page avec champs maximaux complets, marges, accents/euro, fuseaux et annulation ; aperçus PNG examinés. Transport email simulé, aucune émission réelle pendant la recette.

Commandes : `npm run build --prefix backend`, `node scripts/test-confirmation-pdf.cjs`, `node scripts/preview-confirmation-pdf.cjs <dossier-local>`.

Références de conception : https://www.gov.uk/guidance/publishing-accessible-documents ; https://pdfkit.org/docs/text.html ; https://pdfkit.org/docs/accessibility.html.