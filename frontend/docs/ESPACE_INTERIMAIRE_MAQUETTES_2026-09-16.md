# Espace intérimaire — adaptation des maquettes V1

Date : 16 septembre 2026. Référence : `E:/Interimatch/InfiMatch_Maquettes_V1_Complet.zip`, écrans 04 à 12. Les images et leur inventaire ont servi de référence de présentation et de fonctions ; leurs données fictives ne sont pas des données de production.

## Résultat

Douze pages de l’espace intérimaire partagent maintenant une présentation cohérente : fond bleu clair, navigation latérale commune, cartes blanches, titres, onglets, boutons et statuts harmonisés. Sur téléphone, un menu remplace la longue barre horizontale. L’identité affichée est actualisée après sauvegarde du profil.

Les composants React utilisent les API réelles. Aucun succès simulé ni compte de démonstration n’est ajouté à l’application. Les illustrations du catalogue sont explicitement fictives et interceptent les appels API dans leur navigateur de capture.

## Correspondance et raccordements

| Maquette / page | Adaptation et actions | Raccordement principal |
|---|---|---|
| 04 — `/accueil` | Compteurs cliquables, prochaine mission, confirmation PDF, disponibilités, découverte, favoris, notifications et dossier | `/dashboards`, `/profile`, `/me/history`, `/me/applications`, `/me/favorites`, `/listings/search`, `/me/notifications` et action `/read` |
| 05 — `/missions` | Recherche globale, diplômes, service, population, bloc, spécialité, horaires, dates, établissement, rayon, réinitialisation, total et pages numérotées | `/reference-data`, `/facilities`, `/listings/search`, `/listings/external` |
| 05 — recommandations | Classement interne calculé, accès à l’explication et possibilité de recalcul | `/me/matches`, `/listings/:id`, `/matches/:id/explanation` |
| 06 — `/missions/:id` | Conditions, compétences, établissement, ajout/retrait des favoris, candidature ou source externe, annonce expirée | `/listings/:id`, `/me/favorites`, `/facilities/:id` |
| Complément — `/missions/:id/candidater` | Conditions, consentement explicite, envoi idempotent, confirmation et accès au suivi | `POST /missions/:id/applications` avec version des conditions |
| 07 — `/candidatures` | Onglets, comptes réels, suivi, retrait avec confirmation | `/me/applications`, `POST /applications/:id/withdrawal` |
| Complément — `/candidatures/:id` | Chronologie réelle, confirmation PDF, renouvellement du consentement si les conditions changent | `/applications/:id`, `/assignments/:id/confirmation`, `/me/documents/:id` |
| 08 — `/calendrier` | Semaine/mois, précédent/suivant/aujourd’hui/date, missions confirmées, ajout/modification/suppression des périodes, mobilité | `GET/PUT /profile`, toutes les pages de `/me/history` |
| 09 — `/profil` | Identité, années par diplôme, compétences de population/bloc, expériences, horaires, visibilité, liens planning et RIB | `GET/PUT /profile`, `/reference-data`, `/me/bank-details`, rafraîchissement d’identité |
| 10 — `/dossier` | RPPS et nouvelle tentative, référence professionnelle, choix/dépôt/téléchargement d’un justificatif, RIB fictif masqué | `/profile/rpps`, `/profile/rpps/retry`, `PUT /profile`, `/me/documents`, `/me/bank-details` |
| 11 — `/favoris` | Missions/offres et établissements séparés, consultation, retrait et état persistant | `/me/favorites` et suppression par type/identifiant |
| 12 — `/historique` | Onglets planning, filtre période/statut, détails, vrais événements et confirmation | `/me/history`, `/applications/:id`, `/assignments/:id/confirmation` |
| Complément — `/etablissements/:id` | Fiche, missions, pagination et favori avec état initial et retrait | `/facilities/:id`, `/me/favorites` |

### Données ajoutées côté backend

Le JSON `profile.details` accepte désormais `ideDiplomaYear`, `iadeDiplomaYear`, `ibodeDiplomaYear`, `referenceName`, `referenceRole`, `referenceEstablishment`, `referenceEmail`. Validation des longueurs, de l’adresse email et des années ; les années futures sont refusées. Les champs historiques restent acceptés. Aucune migration SQL nécessaire.

Le dossier relit le profil avant de sauvegarder la référence. Le profil conserve les disponibilités récentes et fusionne les changements de détails pour éviter d’effacer une référence ajoutée entre-temps. Ces protections ne constituent pas un verrou global entre plusieurs onglets.

## Différences volontaires avec les images

- Disponibilités en **journées entières**, conformément à la demande précédente de supprimer les heures obligatoires. Les horaires d’une mission restent ceux du backend.
- Compteurs, missions et dates issus des données disponibles ; les exemples « 2 candidatures / 1 mission / 3 favoris » ne sont pas recopiés.
- Les missions accessibles découlent des diplômes détenus. Les compétences de population et de bloc alimentent les codes utilisés par le matching ; aucun indicateur de compatibilité n’est inventé.
- Les recommandations chiffrées concernent les missions internes. Une annonce externe renvoie vers son site source ; ses champs inconnus ne valent pas validation des critères.
- RPPS : état humain provenant de l’API. La référence professionnelle est **déclarée**, sans prétendre qu’un contact a été vérifié ou sollicité.
- Justificatifs et coordonnées bancaires restent limités à la **démonstration fictive** selon le contrat existant. PDF, PNG et JPEG sont acceptés jusqu’à 5 Mo ; la maquette n’illustrait qu’un PDF. La confirmation PDF n’est pas un contrat signé.
- L’historique affiche les vrais événements disponibles. Il ne fabrique pas d’événement « mission commencée » ou « mission terminée » à partir de l’heure seule.
- Les notifications actuelles ne fournissent pas d’identifiant de mission : leurs liens ouvrent la rubrique concernée.
- Les résultats de recherche ont un total serveur et des numéros de pages. Les favoris, candidatures et affectations sont parcourus intégralement avant calcul des comptes/filtres. Les documents et missions d’établissement conservent une pagination adaptée aux réponses API sans total.

## Vérifications effectuées

- **75 tests unitaires backend** réussis, dont validation des nouveaux champs et compatibilité avec les anciens.
- **18 vérifications backend réelles** réussies : profils enregistrés/rechargés trois fois, filtres, favoris ajoutés/retirés trois fois pour chaque type, candidature/retrait, droits d’accès, matching et explication MongoDB, documents chiffrés, RIB masqué, PDF de confirmation, notifications.
- **63 contrôles navigateur** réussis : 12 pages à 1440/768/375/320 px (48 contrôles), puis 15 scénarios d’actions. Aucun débordement horizontal sur ces pages ; aucune erreur JavaScript.
- Scénarios navigateur : sauvegardes répétées avec rechargement, prénom actualisé, calendrier, filtres réels, favoris, consentement et renouvellement après modification de mission, retrait, PDF, référence professionnelle, RPPS simulé, RIB, téléversement/téléchargement, menu mobile, diplômes/expériences, notification lue, reprise après erreur, session expirée et déconnexion.
- **10 tests du client API** réussis. Compilation frontend/backend réussie. Avertissement Vite de taille du bundle toujours présent, sans échec de compilation.
- Évaluation visuelle indépendante : **PASS**. Rapport de travail : `C:/Users/lebre/AppData/Local/Temp/infimatch-interimaire-aro3svlt.wvf/eval_main_1.md`.
- Aperçus du catalogue renouvelés pour l’espace intérimaire et les tableaux de bord organisations touchés par le menu commun.

### Isolation des tests

Les tests utilisent les vrais contrôleurs Nest, la validation, PostgreSQL et le matching MongoDB. Les écritures SQL sont contenues dans une transaction annulée à la fin ; l’absence des comptes temporaires est vérifiée. Les sessions sont en mémoire dans le processus de test. Les documents sont chiffrés dans un dossier temporaire supprimé après test. Les explications MongoDB sont supprimées uniquement pour les identifiants des comptes créés par le test. Aucun compte utilisateur réel n’est modifié.

La réponse du fournisseur RPPS est simulée uniquement dans l’instance isolée ; ces tests ne prouvent pas une vérification RPPS externe. Les erreurs réseau sont injectées dans le navigateur pour vérifier les états de reprise. Google OAuth et le déploiement Vercel ne font pas partie de cette validation.

## Preuves et consultation

- Accueil privé : http://127.0.0.1:5173/accueil
- Catalogue sans connexion : http://127.0.0.1:5173/catalogue — groupe candidat.
- Frontend : `docs/proofs/interimaire-maquettes/browser.json` et captures dans le même dossier.
- Backend : `E:/Interimatch/InfiMatch/docs/proofs/interimaire-maquettes/backend.json`.
- Scénario backend reproductible : `node --use-system-ca scripts/test-nurse-workspace.mjs` depuis `E:/Interimatch/InfiMatch`.
- Script navigateur de cette session : `%TEMP%/playwright-test-interimaire.cjs` ; il utilise `scripts/nurse-workspace-fixture.mjs`.
- Rapport de captures : `docs/proofs/catalogue-captures.json`. Les anciens débordements mobiles des listes de missions organisation sont hors du périmètre intérimaire de cette intervention.

Livraison locale ; aucun déploiement ni publication effectué.
