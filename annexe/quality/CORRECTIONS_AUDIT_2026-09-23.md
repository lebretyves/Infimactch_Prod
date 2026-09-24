# Corrections de l’audit — 23 septembre 2026

État le plus récent : [suivi final des corrections](SUIVI_AUDIT_FINAL_2026-09-23.md). Les sections ci-dessous conservent la chronologie historique.

## Mise a jour apres autorisation du 23 septembre 2026

Cette mise a jour remplace les statuts Vault et support en attente consignes plus bas.

- Vault : politique operateur corrigee sur le coffre actif, apres sauvegarde Raft. Jeton root temporaire revoque et configuration originale restauree ; recuperation non authentifiee de nouveau refusee.
- Les acces AppRole backend et infra sont renouveles jusqu'au 30 septembre. Les secrets applicatifs ne sont pas modifies.
- **18/18 verifications Vault et securite reussies**, zero echec, zero test ignore. La premiere relance apres renouvellement donnait 17/18 : elle comparait les secrets a un ancien .env volontairement retire. Le test compare desormais en memoire les valeurs lues par le backend aux valeurs actuelles autorisees a l'operateur ; les refus d'acces aux autres espaces restent testes. Il ne pretend pas verifier l'egalite avec une ancienne version des secrets.
- Le redemarrage attend maintenant que Vault soit actif apres deverrouillage avant de lancer la recuperation, ce qui corrige l'erreur HTTP 500 pendant l'election du leader.
- Supabase : demande PostGIS envoyee, confirmation de creation recue dans le tableau de bord. Reponse attendue a yves.le-bret@epitech.eu. Les droits PostGIS ne sont pas encore corriges.
- DNS Windows : inchanges apres annulation de l'elevation. Ce point reste ouvert.

[Preuve de maintenance et envoi](../proofs/remediation-20260923/vault-support-followup.json) | [Tests Vault finaux](../proofs/remediation-20260923/vault-final-tests.log).



## Transferts Supabase

Le classement des offres externes lit désormais uniquement l’identifiant, le titre et les critères utilisés par `partialOfferMatch`. Les descriptions, les données fournisseur et les offres parsées sont chargées pour les trois recommandations retenues. Le classement et le chargement final utilisent la même transaction Ã  instantané cohérent. La recherche générale réutilise la projection réduite des critères externes. Aucun cache partagé ni limite arbitraire de catalogue n’est ajouté.

Mesure SQL en lecture seule sur 5 128 offres actives, sans réactiver les sources :

| Recommandations externes | Octets JSON estimés |
| --- | ---: |
| Ancienne sélection de tout le catalogue | 61 421 614 |
| Nouvelle lecture des critères | 1 724 157 |
| Trois plus grosses offres complètes, borne supérieure | 139 369 |
| Total après correction, borne supérieure | 1 863 526 |

La réduction estimée est de **96,97 %**. Il s’agit de tailles de représentations JSON calculées côté SQL, pas d’une mesure du trafic facturé par Supabase. Le volume exact varie avec le catalogue. La recherche générale transfère aussi moins de provenance externe : 3 580 032 → 1 190 411 octets pour cette partie uniquement.

Les deux sources restent masquées ; leurs imports restent autorisés. Cette correction ne réinitialise pas le quota dÃ©jÃ  consommé et ne modifie pas ces réglages.

## Vault : correction préparée, application administrative en attente

Les accès `backend` et `infra`, créés le 15 septembre avec une validité de sept jours, sont expirés. L’accès opérateur reste utilisable pour lire les secrets, mais ses chemins de renouvellement utilisent `infimatch-v1-*/role-id` et des motifs analogues. Vault réserve le glob `*` Ã  la fin du chemin : ces règles ne donnent pas les permissions attendues. [Documentation officielle des politiques Vault](https://developer.hashicorp.com/vault/docs/concepts/policies).

Le code de création de politique est corrigé : neuf chemins exacts pour les trois rôles existants, sans extension aux autres rôles. Le test de politique vérifie la portée et l’idempotence de cette transformation. `npm run vault:renew` renouvelle uniquement les accès applicatifs expirés, vérifie leur isolation puis remplace atomiquement leurs fichiers ; aucun secret applicatif n’est modifié.

La politique du coffre actif n’a pas été modifiée. L’approbation automatique a refusé la récupération temporaire de privilèges root, le redémarrage de Vault et la modification de politique sans accord explicite. La procédure concrète est dans `scripts/vault/repair-operator-policy.mjs` :

1. Sauvegarde Raft dans le répertoire privé.
2. Récupération temporaire par le quorum des parts dÃ©jÃ  détenues localement.
3. Correction des seuls chemins de rotation de la politique opérateur.
4. Révocation du jeton root temporaire, restauration de la configuration et vérification des accès.
5. Renouvellement des accès expirés, puis nouvelle campagne de tests Vault.

Sans `--apply`, le script décrit seulement les opérations. L’exécution avec `--apply` reste soumise Ã  l’accord explicite demandé. Ne pas annoncer ce point résolu avant la réussite des tests réels.

## PostGIS : droits fournisseur encore nécessaires

La tentative avec le compte `postgres` n’a pas retiré les droits effectifs ; le script a détecté `WRITE_PRIVILEGES_REMAIN` et annulé la transaction. Aucune définition de coordonnées n’a changé. La table appartient Ã  `supabase_admin`.

La demande prête Ã  transmettre est dans [DEMANDE_SUPABASE_POSTGIS_2026-09-23.md](DEMANDE_SUPABASE_POSTGIS_2026-09-23.md). Aucun message n’a été envoyé au support. Il ne faut pas supprimer/recréer l’extension pour traiter ce point. Supabase documente ce cas de table technique et précise qu’elle ne contient pas les données métier. [Documentation PostGIS Supabase](https://supabase.com/docs/guides/database/extensions/postgis#troubleshooting).

## DNS local

Les recherches SRV MongoDB échouent via le DNS de la box, mais réussissent via 1.1.1.1 et 8.8.8.8. Le ping Atlas réussit avec ces DNS et les certificats système, sans désactiver TLS. La production Vercel a été vérifiée séparément et reste disponible.

Le changement des interfaces physiques Ethernet/Wi-Fi requiert une élévation Windows. Les anciens serveurs sont sauvegardés dans le dossier d’audit local. Le script `E:/Interimatch/audits/repair-dns-20260923.ps1` configure les deux DNS, conserve les interfaces VPN et restaure les anciens réglages en cas d’échec ; `-Restore` permet le retour arrière. Le résultat effectif est Ã  confirmer après l’élévation Windows.
## Vérifications finales

- Backend : **652/652 tests unitaires**, couverture des lignes **95,09 %**.
- Frontend : **81/81 tests unitaires**.
- Intégrations : **187/187 résultats finaux réussis**, consolidés par fichier ; les 185 tests existants passent dans la campagne complète. Les deux nouvelles régressions et les fichiers concernés passent lors de la relance ciblée finale.
- Les cinq régressions SQL de sécurité passent dans l’environnement isolé ; les trois workflows n8n de test sont importés et publiés localement.
- Les premières comparaisons échouaient sur deux détails du jeu de test : dates sans fuseau, puis horodatage de parsing variable. Le jeu corrigé utilise des dates explicites et une horloge fixe. Le code applicatif est identique entre la dernière campagne complète et la relance ciblée ; cela est vérifié par les empreintes des sources.
- Vault et utilitaires sécurité : **15/18 réussis, trois échecs d’authentification des rôles expirés**. Le test auparavant exclu faute de `.env` de référence est maintenant exécuté avec le chemin privé explicitement configuré. Il échoue à l’authentification, pas sur une différence de secrets.
- La transformation de politique opérateur passe son test séparé. Son application au coffre actif reste en attente.

[Résumé et méthode de consolidation](../proofs/remediation-20260923/summary.json) · [Preuves détaillées](../proofs/remediation-20260923/).

Les deux branches principales ont été sauvegardées dans `backup/main-avant-corrections-audit-20260923`, au commit `18dfdeb1319699be20f2896b6c2739261c30db00`, avant publication.
## Publication et production

La correction applicative `2c4f46f1b0a6c123c11fb68de67b09316e2087d1` a été publiée sur Yves `Main` et Epitech `main`. Les déploiements backend et frontend Vercel sont réussis. À 17 h 57, heure de Paris, l’API de santé, le site et l’administration répondent HTTP 200 ; le catalogue externe renvoie zéro offre, conformément aux sources masquées.

[Déploiements](../proofs/remediation-20260923/production-deployments.json) · [Contrôles HTTP](../proofs/remediation-20260923/production-http.json).

Le contrôle administrateur MongoDB du 23 septembre à 17 h 26 reste la dernière preuve authentifiée de connexion depuis Vercel. La session administrateur avait expiré lors de la nouvelle consultation après déploiement ; aucun contournement d’authentification n’a été effectué. La correction publiée ne modifie pas la connexion MongoDB. La CI distante est également déclenchée ; les résultats de tests indiqués ci-dessus sont les résultats locaux consignés, pas une affirmation que cette nouvelle CI est déjà terminée.