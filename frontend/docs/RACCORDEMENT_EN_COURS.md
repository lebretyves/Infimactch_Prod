# Raccordement fonctionnel — recette du 16 septembre 2026

- [x] Photos des maquettes sur accueil, connexion et inscription ; neuf vues responsive contrôlées.
- [x] Inscription : champs professionnels persistés avec le compte, retours et pannes réseau vérifiés.
- [x] Profil/calendrier : identité, compétences, expériences, dates seules et trois cycles de sauvegarde/relecture.
- [x] Dossier : boutons RPPS/retry, document fictif téléchargé, RIB fictif masqué après trois sauvegardes.
- [x] Missions : API réelle, détails enrichis, favoris et liens établissement/source.
- [x] Candidatures : dépôt, retrait, refus, sélection, suivi et nouveau consentement après modification.
- [x] Organisations : trois sauvegardes par rôle, besoins, création/édition/publication/affectation/annulation/réouverture.
- [x] Confirmation : worker lancé, priorité PDF corrigée, génération réelle et téléchargement vérifiés.
- [x] Navigation : routes protégées, retour après connexion, page404, liens légaux et mobile.
- [x] Google : Client ID public actif via runtime Vault, origines locales et utilisateur de test enregistrés, vrai bouton et sélecteur Google vérifiés.
- [ ] Google : première association complète du compte utilisateur, avec son mot de passe InfiMatch.
- [ ] Nettoyage des données de recette : autorisation explicite en attente après refus automatique.

## Preuves

`docs/proofs/raccordement/checks.json` (18 scénarios), `public-navigation/checks.json` (15 contrôles), `signup-regression.json` (13), `profile-persistence.json` (5), `integration-api.json` (11), `google-configuration.json`.

64 tests unitaires et 16 tests d'intégration backend, 7 tests du client API ; compilations réussies. Le RPPS positif est une fixture isolée, aucune validation réelle par l'annuaire n'est revendiquée.

## Limites V1

Ne pas assimiler ces raccordements à une V1 totalement terminée : filtres/recommandations avancés, calendrier visuel, recherche FINESS assistée, documents bancaires réels et réinitialisation email restent incomplets. Aucun déploiement Vercel réalisé.

Bilan détaillé Markdown/Word : `E:/Interimatch/InfiMatch/docs/audits/v1-maquettes/BILAN_RACCORDEMENT_2026-09-16.*`.
