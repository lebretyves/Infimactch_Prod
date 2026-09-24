# Cookies et inscription FINESS — 16 septembre 2026

## Fonctionnement livré

- L'inscription établissement consulte `GET /api/v1/reference-data/finess/:finess` dès que les neuf caractères sont complets. Le backend lit le répertoire déjà importé dans PostgreSQL (174 621 établissements lors du contrôle).
- Nom, adresse, code postal et ville sont préremplis. Les coordonnées géographiques et la date du répertoire apparaissent dans le résultat. Les corrections manuelles restent prioritaires.
- Un changement de FINESS nettoie les anciennes valeurs automatiques. Les requêtes périmées sont annulées et leurs réponses ignorées. Les codes corses 2A/2B sont acceptés. Une absence ou une panne laisse la saisie manuelle disponible.
- Le référent est distinct de l'établissement. La recherche n'associe pas un utilisateur à un compte existant. Le formulaire Google utilise le même raccordement.
- À l'enregistrement, le backend existant conserve le FINESS, le nom et l'adresse complète dans `organization`. Les coordonnées GPS restent dans le référentiel FINESS : aucun nouveau champ GPS n'est ajouté au DTO d'inscription.

## Cookies

- Bouton Cookies sur toutes les pages, acceptation/refus de même importance, personnalisation et politique accessible.
- Session nécessaire `infimatch.sid` (HttpOnly, SameSite=Lax, durée configurée huit heures), brouillon d'inscription et mémorisation des préférences distingués du service Google facultatif.
- Google Identity Services et le challenge d'authentification ne démarrent qu'après accord explicite. Le refus ne ferme pas la session InfiMatch. Le retrait enlève le bouton/les cadres Google et bloque les nouveaux chargements, sans prétendre supprimer les cookies appartenant à Google.
- Préférences versionnées conservées six mois dans `infimatch:cookie-preferences`. Stockage bloqué, expiration, rechargement et retrait gérés.
- Police Plus Jakarta Sans servie localement, licence OFL incluse dans `public/fonts`, sans appel Google Fonts au chargement.
- La politique décrit les fonctions présentes; les coordonnées légales et les durées de conservation de production restent à compléter. Ce changement n'est pas un audit juridique complet.
- Référence : https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/comment-mettre-mon-site-web-en-conformite

## Validation

- 75 tests unitaires backend et 10 tests du client API réussis.
- 7 contrôles API/base dédiés, dont trois inscriptions répétées puis annulation de la transaction de test : `InfiMatch/scripts/test-registration-finess.mjs`.
- 25 contrôles navigateur : cookies, chargement Google avec SDK simulé et challenge serveur réel, refus/retrait/rechargement, conservation de la session, panne de stockage, lien de politique, FINESS réel, valeurs manuelles, réponses retardées, erreur/réessai, code corse, inscription depuis le navigateur enregistrée en base, préinscription Google simulée. Aucun compte réel Google utilisé dans les tests.
- Contrôles visuels 1440, 375 et 320 px sans débordement horizontal sur ces écrans.
- Comptes de test et écritures SQL entièrement dans une transaction annulée; sessions de test en mémoire. Aucun compte utilisateur modifié.
- Preuves : `annexe/proofs/cookies-finess/browser.json`, captures dans le même dossier; preuve backend dans `InfiMatch/annexe/proofs/cookies-finess/backend.json`.
- Catalogue enrichi avec les choix cookies et le formulaire FINESS prérempli. Captures de catalogue avec données isolées.

- Compilation TypeScript/Vite finale réussie. Évaluation visuelle indépendante : PASS. Avertissement existant de taille du bundle JavaScript (586 ko avant compression), sans erreur de compilation.
