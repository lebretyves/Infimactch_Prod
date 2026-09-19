> Archive : les pages /catalogue et /apercu-annonces ont été retirées le 19 septembre 2026. Elles redirigent vers l’accueil. Les nouvelles captures éventuelles restent dans docs/proofs/catalogue-archives, hors des fichiers publics. Les instructions ci-dessous décrivent l’ancienne galerie.

# Catalogue consultable du frontend — 16 septembre 2026

Ouvrir http://127.0.0.1:5173/catalogue (serveur Vite lancé). Route publique, accessible depuis l’accueil et le menu connecté.

49 vues et 98 captures : recherche par titre, route et fonctionnalité ; filtres par espace ; visionneuse bureau/mobile avec navigation précédente/suivante. Les liens « Ouvrir la page » ouvrent les routes réelles et peuvent demander une connexion et un rôle. Aucun lien vers un identifiant fictif n’est fourni.

## Provenance et limites

Les captures montrent les vrais composants React avec des réponses API entièrement interceptées dans un navigateur isolé. Les données sont fictives ; aucun compte ou enregistrement serveur n’a été créé pour ce catalogue. Il s’agit d’aperçus statiques, pas d’une démonstration interactive des opérations métier ni d’une preuve que toutes les fonctionnalités fonctionnent.

Toutes les routes du routeur sont représentées, avec les variantes utiles des espaces et des inscriptions. Le catalogue lui-même n’est pas photographié récursivement. Le composant non routé ASuivre n’est pas une page accessible et n’est pas inclus.

Google n’est pas exercé dans les captures. La récupération du mot de passe est présentée dans son état réel, indisponible. Les captures des listes de missions établissement/agence révèlent un débordement mobile existant de 400px pour un écran de 375px ; cela ne concerne pas la mise en page de la galerie.

Les aperçus reflètent la date du manifeste. Après évolution des pages, régénérer avec `node scripts/capture-catalogue.mjs`, Vite démarré sur le port5173 et Edge disponible sur le poste.

## Inventaire

| Espace | Vues |
| --- | ---: |
| Public | 6 |
| Candidat | 23 |
| Établissement | 6 |
| Agence | 11 |
| Système | 3 |

| Page | Espace | Route |
| --- | --- | --- |
| Accueil public | Public | `/` |
| Connexion à mon espace | Public | `/connexion` |
| Inscription candidat · compte | Public | `/inscription` |
| Inscription établissement | Public | `/inscription` |
| Inscription agence | Public | `/inscription` |
| Mentions légales et conditions | Public | `/mentions-legales` |
| Inscription · Identité | Candidat | `/inscription/identite` |
| Inscription · Localisation | Candidat | `/inscription/localisation` |
| Inscription · Qualifications et expérience | Candidat | `/inscription/qualification` |
| Inscription · Mobilité | Candidat | `/inscription/mobilite` |
| Inscription · Disponibilités | Candidat | `/inscription/disponibilites` |
| Inscription · RIB · information | Candidat | `/inscription/rib` |
| Inscription · Consentements | Candidat | `/inscription/consentements` |
| Compte candidat créé | Candidat | `/inscription/confirmation` |
| Mon espace candidat | Candidat | `/accueil` |
| Recherche de missions | Candidat | `/missions` |
| Missions · profil à compléter | Candidat | `/missions` |
| Détail d’une mission | Candidat | `/missions/:id` |
| Détail d’une annonce externe | Candidat | `/missions/:id` |
| Confirmer une candidature | Candidat | `/missions/:id/candidater` |
| Candidature enregistrée | Candidat | `/missions/:id/candidater` |
| Mes candidatures | Candidat | `/candidatures` |
| Suivi d’une candidature | Candidat | `/candidatures/:id` |
| Calendrier et disponibilités | Candidat | `/calendrier` |
| Profil professionnel | Candidat | `/profil` |
| Dossier professionnel | Candidat | `/dossier` |
| Mes favoris | Candidat | `/favoris` |
| Fiche établissement | Candidat | `/etablissements/:id` |
| Mes missions confirmées | Candidat | `/historique` |
| Compte établissement créé | Établissement | `/inscription/confirmation-etablissement` |
| Mon espace établissement | Établissement | `/accueil` |
| Missions · établissement | Établissement | `/missions` |
| Gestion de mission · établissement | Établissement | `/gestion/missions/:id` |
| Organisation · établissement | Établissement | `/organisation` |
| Besoins de personnel · établissement | Établissement | `/besoins` |
| Compte agence créé | Agence | `/inscription/confirmation-etablissement` |
| Mon espace agence | Agence | `/accueil` |
| Missions · agence | Agence | `/missions` |
| Gestion de mission · agence | Agence | `/gestion/missions/:id` |
| Organisation · agence | Agence | `/organisation` |
| Besoins de personnel · agence | Agence | `/besoins` |
| Créer une mission | Agence | `/gestion/missions/nouvelle` |
| Modifier une mission | Agence | `/gestion/missions/:id/modifier` |
| Mission · brouillon | Agence | `/gestion/missions/:id` |
| Mission · pourvue | Agence | `/gestion/missions/:id` |
| Suivi candidature · organisation | Agence | `/candidatures/:id` |
| Mot de passe oublié · indisponible | Système | `/mot-de-passe-oublie` |
| Confirmation · session absente | Système | `/inscription/confirmation` |
| Page introuvable | Système | `*` |

## Fichiers et vérifications

- `src/pages/Catalogue.tsx` et `Catalogue.module.css` : galerie et visionneuse.
- `public/catalogue/manifest.json` et `captures/` : inventaire et images.
- `scripts/capture-catalogue.mjs` : génération reproductible avec fixtures.
- `docs/proofs/catalogue-captures.json` : couverture des routes et contrôles de capture.
- `docs/proofs/catalogue-functional.json` : 98 images servies ; galerie et visionneuse vérifiées à1440,768 et375px ; aucune erreur JavaScript.
- `npm run build` : compilation réussie.
