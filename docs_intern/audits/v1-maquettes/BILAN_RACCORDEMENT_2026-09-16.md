# Bilan de raccordement InfiMatch — 16 septembre 2026

## Résultat vérifié

Les boutons des parcours ci-dessous appellent les API locales. Les principaux enregistrements ont été répétés trois fois, puis relus après rechargement ; le profil a aussi été relu après reconnexion. Les photos originales des maquettes ont été ajoutées aux pages accueil, connexion et inscription.

Ce bilan complète l'audit initial `BILAN_V1_MAQUETTES_FRONT_BACK` ; il ne signifie pas que tous les éléments de la V1 sont terminés. Le code n'a pas été publié sur Vercel pendant cette intervention.

## Pages, boutons et liens front-back

| Parcours | Raccordement réalisé | Vérification |
| --- | --- | --- |
| Inscription candidat | Compte et profil dans une transaction : identité, adresse, diplômes, qualifications, compétences, expériences, mobilité, horaires et disponibilités. | Création, retours, rechargement, panne réseau et session tardive. Pas de perte du formulaire. |
| Inscription organisation | Agence ou établissement, FINESS/SIRET, adresse complète et référent. | Les deux types ont été créés dans le navigateur et relus via API. |
| Connexion | Session serveur, déconnexion, retour à la destination demandée. Type d'espace déterminé par le compte. | Cookie HttpOnly, reconnexion et accès protégé contrôlés. |
| Profil et calendrier | GET/PUT /profile. Identité, diplômes, compétences, expériences, mobilité et périodes modifiables. | Trois sauvegardes et relectures. Une période saisie est incluse même sans cliquer sur Ajouter. |
| Dossier | Vérification/retry RPPS ; upload/liste/téléchargement de justificatifs fictifs ; RIB fictif chiffré et masqué. | Boutons RPPS contrôlés ; trois RIB enregistrés ; fichier téléchargé ; accès extérieur refusé. |
| Missions | Recherche réelle, qualification, pagination, détails, site source externe et favoris. | Favori conservé après rechargement puis retiré. Pas d'appel avec qualifications vides. |
| Établissement et favoris | Fiche établissement, missions ouvertes, ajout et retrait des favoris. | Parcours favori → établissement → mission vérifié. |
| Candidatures | Dépôt, retrait, suivi chronologique, refus, reconsentement après modification. | Actions testées dans le navigateur et états relus dans l'API. |
| Organisation | GET /me/organizations, PUT /organizations/:id ; contexte des établissements rattachés. | Trois sauvegardes pour chaque rôle. |
| Besoins de personnel | Établissement → POST /staffing-requests ; agences rattachées → lecture. | Trois créations ; agence liée autorisée, agence extérieure exclue. |
| Gestion agence | Création, édition, publication, annulation, réouverture ; profils proposés et affectation. | Trois éditions de mission, publication et affectation vérifiées. |
| Examen établissement | Liste des candidats, parcours, sélection et refus. | Sélection/refus effectifs ; gestion agence masquée dans l'interface établissement. |
| Historique et confirmations | GET /me/history ; confirmation puis téléchargement du PDF. | PDF généré par le vrai traitement local et téléchargé ; permission extérieure refusée. |
| Notifications | Lecture du serveur et bouton marquer comme lue. | État lu persisté. |
| Navigation | Menu par rôle, routes directes, retour après connexion, page404 et liens légaux. | Contrôles publics à 375/768/1440 px ; huit pages connectées à 375 px. |

## Corrections de fond

- Le backend conserve maintenant les champs qui étaient affichés sans être enregistrés. Migration additive `FrontendFields1789380500000` appliquée : détails du profil et date de création des nouvelles candidatures. Les dates historiques inconnues restent inconnues.
- Un profil peut être enregistré sans position GPS ; le calcul d'admissibilité conserve ses exigences de mobilité.
- Prénom à la place du mail ; choix unique des horaires ; disponibilités en journées entières ; états RPPS techniques retirés des pages générales.
- Les conditions de mission sont affichées avant le consentement. Les candidatures devenues anciennes demandent une nouvelle confirmation.
- Les erreurs d'admissibilité sont formulées en français. Les autorisations restent vérifiées côté serveur.
- Le worker de confirmations a été démarré. Les PDF passent avant les recalculs de matching dans la file, pour éviter l'attente constatée pendant les tests.
- Débordement mobile de l'historique corrigé ; choix du type de compte corrigé ; code des nouveaux écrans remis en forme.

## Google : configuration réellement utilisée

- L'identifiant public fourni est chargé depuis `InfiMatch/data/vault/runtime.json` par le lanceur Vault. Le `.env` historique n'est pas la source active.
- API directe et proxy frontend : HTTP200, `enabled: true`, identifiant conforme.
- Google Cloud : origines locales enregistrées et relues ; compte Google du propriétaire ajouté en test ; bouton officiel visible et sélecteur de compte Google ouvert.
- Utiliser `http://127.0.0.1:5173/connexion`. Vercel n'est pas nécessaire pour cet essai local.
- Première association : compte InfiMatch existant avec même adresse et mot de passe InfiMatch. **La première association complète avec l'utilisateur reste à valider.**

Détail : `InfiMatch/docs/FRONTEND_AUTH_GOOGLE.md`. Aucun secret client dans ce document.

## Différences et éléments encore partiels

| Élément | État et raison |
| --- | --- |
| Mot de passe oublié | Service de réinitialisation email absent. Le formulaire qui échouait systématiquement a été remplacé par une explication et un retour à la connexion. |
| Documents/RIB réels | Démonstration uniquement, conformément aux règles actuelles du backend. Aucun paiement ni dépôt de pièce réelle validé. |
| RPPS réel | Les boutons et états sont raccordés. Le scénario de candidature positive utilise un statut RPPS de fixture sur son seul compte fictif, pas une validation réelle par l'annuaire. |
| Google en production | Aucun déploiement Vercel ni origine publique ajoutée. Client local activé ; association réelle utilisateur à terminer. |
| Recherche avancée | Filtre qualification et recherche textuelle sur la page chargée. Filtres métier combinés, tri de pertinence, explications et alertes qualité des offres restent partiels. |
| Tableau de bord | Compteurs, notifications et accès aux pages raccordés. Recommandations personnalisées et synthèse détaillée de prochaine mission non intégrées. |
| Calendrier | Périodes éditables et historique séparé. Pas de calendrier visuel avec superposition des affectations. |
| FINESS | Saisie et sauvegarde, y compris format corse. Recherche assistée dans le référentiel non intégrée au formulaire. |
| Filtres et présentation | Onglets/filtres avancés de favoris, historique et tableaux d'organisation encore incomplets par rapport aux maquettes. |
| Profils proposés | Consultation et affectation d'un candidat ayant postulé. Aucun faux bouton d'invitation ; le consentement reste requis. |
| Rattachement agence–établissement | Doit être autorisé ; aucune auto-attribution de droits à partir d'un FINESS. |

## Recette et preuves

- 64 tests unitaires backend réussis.
- 16 tests d'intégration backend réussis après la correction de priorité PDF.
- 7 tests du client API réussis.
- 13 contrôles de régression d'inscription réussis.
- 5 contrôles de persistance profil, dont trois cycles sauvegarde/relecture/reconnexion, réussis.
- 18 scénarios navigateur de raccordement réussis.
- 15 contrôles publics, inscriptions organisations, navigation et photos réussis.
- 11 contrôles historiques d'intégration frontend réussis.
- Compilation backend et frontend réussie.

Preuves frontend : `docs/proofs/raccordement/checks.json`, `public-navigation/checks.json`, `signup-regression.json`, `profile-persistence.json`, `integration-api.json`, `google-configuration.json`. Captures mobile disponibles dans `docs/proofs/raccordement/`.

Les comptes de recette sont fictifs. Le lien agence/établissement et le RPPS positif sont des fixtures isolées ; les appels navigateur/API, les sauvegardes, les refus d'accès et la génération PDF sont réels. Aucun test ne désactive les règles métier.

## Données de recette

Le nettoyage a été refusé par le contrôle automatique faute d'autorisation explicite pour les annulations. Périmètre compté en lecture seule : 10 profils fictifs visibles, 5 missions fictives à fermer, dont 1 affectation de test et sa confirmation. Aucun compte supprimé et aucune de ces mutations de nettoyage exécutée. Autorisation demandée à l'utilisateur.
