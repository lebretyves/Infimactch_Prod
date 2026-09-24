> Mise à jour après ajout des six fonctionnalités : **652/652 tests backend, 95,08 % des lignes**. [Rapport et preuves](quality/INTEGRATION_SIX_FONCTIONNALITES_2026-09-23.md). Les chiffres ci-dessous documentent la campagne initiale.

> Cette page conserve la campagne du 23 septembre. Pour le code réuni le 24 septembre, consulter [l’état courant](ETAT_COURANT.md) et les preuves de la nouvelle revue.
# Couverture unitaire du backend — 23 septembre 2026

Commande reproductible depuis la racine : `npm run coverage:unit`.
Elle compile les tests, execute uniquement `backend/test/unit/*.spec.ts` via leur sortie JavaScript et echoue si la couverture des lignes est inferieure a 95 %. La CI execute cette commande et conserve son rapport en artifact.

| Mesure | Resultat |
| --- | --- |
| Tests unitaires backend | 643 reussis, 0 echec, 0 ignore |
| Lignes | 11 639 / 12 242 — **95,07 %** |
| Branches conditionnelles | 4 594 / 5 106 — 89,97 % |
| Fonctions | 768 / 933 — 82,31 % |

La mesure initiale des tests unitaires seuls etait de 57,48 % des lignes, avec 367 tests. Les 40 nouveaux fichiers ajoutent 276 tests. Les tests existants et les exclusions de `backend/.c8rc.json` sont inchanges : seuls `src/main.ts` et `src/worker.ts` sont exclus. Le frontend et les tests d'integration ne contribuent pas a cette mesure. Le taux de reussite des tests (100 %) et la couverture du code (95,07 % des lignes) sont deux mesures differentes.

Les nouveaux tests verifient notamment les autorisations, sessions et recuperations de compte, transitions de missions, documents et PDF, livraisons et relances, collecte et parsing, clotures et retention. Les bases de donnees et fournisseurs externes sont remplaces par des doubles dans ces tests : ils ne prouvent pas a eux seuls le fonctionnement du SQL ou des integrations reelles.

Trois modifications applicatives accompagnent ces tests :

- Le parseur conserve correctement le delai decimal `1,5 mois` dans les disponibilites a declarer, au lieu de capturer `5`.
- `createCli()` permet de tester les commandes sans les executer lors d'un import ; le lancement direct conserve son fonctionnement.
- Le schema OpenAPI des fichiers envoyes expose les bornes 4 et 7 000 000 caracteres deja appliquees a l'execution.

Verification finale : commande de couverture avec seuil bloquant, compilation backend, typage TypeScript, aide CLI compilee et via tsx depuis backend, coherence du depot et controle des secrets suivis par Git. Les regressions des comportements modifies sont incluses dans les tests unitaires ; la campagne d'integration complete n'a pas ete relancee pour cette modification.

Le rapport HTML et le JSON sont generes dans `docs/proofs/unit-coverage/` (ignores par Git). Ces resultats ont ete mesures sur `test/unit-coverage-95-20260923`, base sur `7cc590a`. Les preuves versionnees sont dans `docs/proofs/unit-coverage-20260923/`. Ils ne constituent pas une validation d'un nouveau deploiement en production.
