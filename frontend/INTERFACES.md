# Interfaces exposées par le routeur

Inventaire au 21 septembre 2026, établi depuis `src/router.tsx`. Les autorisations métier restent vérifiées côté serveur. Le portail administrateur est compilé et déployé séparément ; il ne figure pas dans cette liste de routes publiques et utilisateurs.

| Route | Portée |
| --- | --- |
| `*` | Repli page introuvable |
| `/` | Route utilisateur ; droits selon le compte |
| `/aide` | Route utilisateur ; droits selon le compte |
| `/installer` | Route utilisateur ; droits selon le compte |
| `/accessibilite` | Route utilisateur ; droits selon le compte |
| `/ecoconception` | Route utilisateur ; droits selon le compte |
| `/catalogue` | Redirection conservée |
| `/apercu-annonces` | Redirection conservée |
| `/connexion` | Route utilisateur ; droits selon le compte |
| `/mot-de-passe-oublie` | Route utilisateur ; droits selon le compte |
| `/reinitialiser-mot-de-passe` | Route utilisateur ; droits selon le compte |
| `/inscription` | Route utilisateur ; droits selon le compte |
| `/mentions-legales` | Route utilisateur ; droits selon le compte |
| `/inscription/identite` | Route utilisateur ; droits selon le compte |
| `/inscription/localisation` | Route utilisateur ; droits selon le compte |
| `/inscription/qualification` | Route utilisateur ; droits selon le compte |
| `/inscription/mobilite` | Route utilisateur ; droits selon le compte |
| `/inscription/disponibilites` | Route utilisateur ; droits selon le compte |
| `/inscription/rib` | Redirection conservée |
| `/inscription/consentements` | Route utilisateur ; droits selon le compte |
| `/inscription/confirmation` | Route utilisateur ; droits selon le compte |
| `/inscription/confirmation-etablissement` | Route utilisateur ; droits selon le compte |
| `/accueil` | Route utilisateur ; droits selon le compte |
| `/notifications` | Route utilisateur ; droits selon le compte |
| `/compte` | Route utilisateur ; droits selon le compte |
| `/missions` | Route utilisateur ; droits selon le compte |
| `/missions/:id` | Route utilisateur ; droits selon le compte |
| `/missions/:id/candidater` | Route utilisateur ; droits selon le compte |
| `/candidatures` | Route utilisateur ; droits selon le compte |
| `/calendrier` | Route utilisateur ; droits selon le compte |
| `/profil` | Route utilisateur ; droits selon le compte |
| `/dossier` | Route utilisateur ; droits selon le compte |
| `/favoris` | Route utilisateur ; droits selon le compte |
| `/etablissements/:id` | Route utilisateur ; droits selon le compte |
| `/historique` | Route utilisateur ; droits selon le compte |
| `/affectations/:id/preparation-contrat` | Route utilisateur ; droits selon le compte |
| `/organisation` | Route utilisateur ; droits selon le compte |
| `/mes-etablissements` | Route utilisateur ; droits selon le compte |
| `/besoins` | Route utilisateur ; droits selon le compte |
| `/gestion/missions/nouvelle` | Route utilisateur ; droits selon le compte |
| `/gestion/missions/:id` | Route utilisateur ; droits selon le compte |
| `/gestion/missions/:id/modifier` | Route utilisateur ; droits selon le compte |
| `/candidatures/:id` | Route utilisateur ; droits selon le compte |

`/catalogue` et `/apercu-annonces` redirigent vers l'accueil ; `/inscription/rib` redirige vers les consentements. Le RIB n'est pas une étape obligatoire d'inscription. Les routes connectées sont regroupées sous `ProtectedRoute` ; les pages d'authentification, d'aide et d'information restent publiques selon le routeur.

Les libellés courants sont « Documents et vérifications », « Disponibilités et mobilité » et « Rechercher une mission ». Le domicile, la recherche ponctuelle et la zone enregistrée pour les alertes ont des usages distincts. Discord est proposé après inscription sans être obligatoire.

Voir [le guide utilisateur](../annexe/GUIDE_UTILISATEUR.md), [les exigences](../annexe/REQUIREMENTS_V1.md), [le raccordement API](docs/INTEGRATION_BACKEND.md) et [le design](DESIGN.md). L'ancienne spécification détaillée a été archivée : elle ne décrit plus exhaustivement l'application livrée.
