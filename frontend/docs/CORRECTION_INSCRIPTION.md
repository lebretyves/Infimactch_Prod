# Correction du parcours d'inscription candidat

## Défauts reproduits et corrigés

- Lire les conditions générales rechargeait l'application et effaçait les identifiants du brouillon. Le lien utilise maintenant la navigation interne et la page légale propose un retour à l'inscription.
- Le bouton Retour de l'étape RIB utilisait le titre affiché pour retrouver l'étape. Le titre ne correspondait pas au nom dans la liste et le bouton renvoyait à l'accueil. La navigation se base désormais sur le chemin de la page.
- Revenir à la première étape effaçait les champs email/mot de passe affichés. Ils sont restaurés depuis le brouillon courant.
- Le brouillon du candidat est conservé dans sessionStorage pour l'onglet courant, sauf mot de passe et coordonnées bancaires. Après un rechargement, le mot de passe est demandé sur la dernière étape. Après succès, le brouillon est supprimé.
- Un stockage navigateur indisponible ne bloque plus la création de compte ; le formulaire fonctionne en mémoire.
- Les champs marqués obligatoires utilisent désormais la validation du formulaire (identité, localisation, qualification). Le mot de passe accepte 12 à 128 caractères.
- Une réponse ancienne de vérification de session ne peut plus remplacer la session obtenue après connexion ou inscription : annulation des lectures obsolètes et vérification de leur génération.
- Un compte confirmé comme créé par le backend mais dont la session ne charge pas affiche une explication et un lien de connexion. Il ne propose pas de recréer le compte.
- La confirmation sans session n'effectue plus de redirection silencieuse.
- Les erreurs réseau et de compte déjà existant restent dans le formulaire et sont expliquées en français.
- Les éléments décoratifs des cases de consentement n'interceptent plus les clics destinés aux cases.

## Validation

Commandes :

```powershell
npm run build
npm test
npm run test:signup
$env:E2E_CREDENTIALS_FILE='chemin-des-identifiants-fictifs.json'
npm run test:integration
```

Résultats :

- Compilation TypeScript/Vite réussie.
- 7 tests unitaires du client API réussis.
- 13 vérifications d'inscription réussies, regroupées en 6 scénarios navigateur.
- 11 vérifications existantes du parcours connecté réussies.

Preuves : [inscription](proofs/signup-regression.json) et [parcours connecté](proofs/integration-api.json).

Les tests utilisent des comptes candidats fictifs avec des adresses example.invalid. Ils vérifient la création réelle et la reconnexion sur l'API locale. Les pannes réseau et de chargement de session sont injectées uniquement dans les contextes navigateur de test. Aucun email externe ni contrôle RPPS n'est envoyé.

La cause personnelle exacte du premier essai n'a pas pu être récupérée rétroactivement. La perte du brouillon après lecture des conditions a été reproduite, puis le même parcours a réussi après correction.

## Périmètre

Cette correction porte sur la création de compte, sa navigation et la session. Le transfert intégral du profil professionnel de l'ancien formulaire, les justificatifs et le RIB restent hors du raccordement actuel, comme indiqué dans la documentation d'intégration et la confirmation du compte. Google reste désactivé tant que son Client ID n'est pas configuré.
