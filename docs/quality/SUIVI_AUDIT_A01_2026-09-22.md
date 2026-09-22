# Revue conjointe — A01 : validation continue et navigation après déconnexion

**État au 22 septembre 2026 : correctif validé sur la branche `fix/audit-a01-ci`, commit `cf9ef6f55ab88f5be00cca48ac294c1c2f442ec0`. Intégré ensuite dans Main `081fcc3` et Backend `698292d` lors de l’alignement des dépôts.** La validation de branche et la recette publiée restent distinctes.

L’utilisateur a autorisé les corrections A01, puis l’examen et la correction de la navigation découverte pendant les tests. Les points A02 à A10 restent à revoir ensemble ; aucun accord métier n’est déduit automatiquement du rapport reçu.

## Corrections

- Le job backend prépare les dépendances frontend, Chromium et ses dépendances système, puis les builds application et admin avant les intégrations.
- Le test des recommandations utilise « Vos matchs » et les actions actuelles. Il conserve les contrôles d’origine, score partenaire, absence de pourcentage externe inventé, profil incomplet, navigation, favoris, filtres, erreurs et affichage sur trois largeurs.
- Le test de publication vérifie le bouton d’accessibilité à gauche de l’identité et renseigne le créneau obligatoire, dont il contrôle la transmission.
- La déconnexion ne déclenche plus une navigation supplémentaire depuis AppLayout : la protection des routes effectue seule la redirection liée à la disparition de la session.
- Le test SEC08/SEC18 répète trois cycles connexion, profil, déconnexion, retour arrière et accès direct. Il exige un formulaire de connexion visible, le refus de l’ancien cookie, l’absence de contenu privé et l’absence de données sensibles dans les caches. Chromium est utilisé sur les deux systèmes pour rendre la comparaison reproductible.

Aucun scénario supprimé, ignoré ou placé en continue-on-error. Aucun changement de design, contenu ou politique d’acceptation des candidatures.

## Validation du correctif

Deux campagnes GitHub entièrement réussies sur le même SHA :

- [Run push 35704316008](https://github.com/lebretyves/Infimactch_Prod/actions/runs/35704316008).
- [Run pull_request 35704319942](https://github.com/lebretyves/Infimactch_Prod/actions/runs/35704319942).

Les jobs frontend et backend ont réussi dans les deux campagnes. L’artefact du run push confirme **367 tests unitaires backend et 181 tests d’intégration dans 27 suites**, les régressions SQL et le résultat global PASS. Les trois cycles SEC18 passent sur Linux. Les vérifications XSS, filtres SQL/Mongo, refus de l’ancien cookie et persistance tardive de session sont conservées. Le job frontend exécute les contrôles navigateur ainsi que le build et la recette admin avec données fictives. Le build local et les trois cycles ciblés avec l’API Docker isolée passent aussi.

Ces résultats attestent les environnements de test du commit indiqué, pas une recette du compte propriétaire/MFA en production ni la correction des autres constats de l’audit.

## Historique du diagnostic

Les runs 35701270496 et 35701889822 ont permis de corriger les attentes devenues obsolètes. Au run 35702478417, seule la suite security-evidence restait en échec. Le navigateur demeurait sur `/profil` après retour arrière avec « Cookies » comme seul texte visible. Le marqueur privé était absent et les appels API après déconnexion étaient déjà refusés en HTTP 401 : aucune fuite de données n’était démontrée par cet échec.

Deux chemins de redirection concurrents étaient présents après déconnexion. Leur remplacement par une seule redirection, accompagné d’assertions sur le formulaire réellement affiché, est validé par les campagnes ci-dessus. Aucun rechargement forcé ni contournement du contrôle de retour arrière n’a été ajouté.

## Preuves et revue

- [Proposition révisable n°1](https://github.com/lebretyves/Infimactch_Prod/pull/1).
- [Résultat global Linux](../proofs/audit-a01-2026-09-22/validated/result.json).
- [Suites Linux](../proofs/audit-a01-2026-09-22/validated/suite-results.json).
- [Trois cycles et contrôles de sécurité Linux](../proofs/audit-a01-2026-09-22/validated/security-evidence.spec.js.txt).
- [Statut GitHub push](../proofs/audit-a01-2026-09-22/validated/run-35704316008-status.json) et [pull_request](../proofs/audit-a01-2026-09-22/validated/run-35704319942-status.json).

Les correctifs et cette documentation ont été publiés dans Main `081fcc3` et Backend `698292d`. Le [run d’alignement 35711272315](https://github.com/lebretyves/Infimactch_Prod/actions/runs/35711272315) est entièrement vert sur le dépôt production. Les jobs Epitech n’ont pas démarré en raison du budget Actions de l’organisation ; les tests unitaires et builds y ont été vérifiés localement. Cette synchronisation Git ne constitue pas une recette complète du site publié.
