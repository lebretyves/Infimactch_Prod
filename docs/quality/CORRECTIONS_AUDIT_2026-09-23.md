# Corrections de lâ€™audit â€” 23 septembre 2026

## Transferts Supabase

Le classement des offres externes lit dÃ©sormais uniquement lâ€™identifiant, le titre et les critÃ¨res utilisÃ©s par `partialOfferMatch`. Les descriptions, les donnÃ©es fournisseur et les offres parsÃ©es sont chargÃ©es pour les trois recommandations retenues. Le classement et le chargement final utilisent la mÃªme transaction Ã  instantanÃ© cohÃ©rent. La recherche gÃ©nÃ©rale rÃ©utilise la projection rÃ©duite des critÃ¨res externes. Aucun cache partagÃ© ni limite arbitraire de catalogue nâ€™est ajoutÃ©.

Mesure SQL en lecture seule sur 5 128 offres actives, sans rÃ©activer les sources :

| Recommandations externes | Octets JSON estimÃ©s |
| --- | ---: |
| Ancienne sÃ©lection de tout le catalogue | 61 421 614 |
| Nouvelle lecture des critÃ¨res | 1 724 157 |
| Trois plus grosses offres complÃ¨tes, borne supÃ©rieure | 139 369 |
| Total aprÃ¨s correction, borne supÃ©rieure | 1 863 526 |

La rÃ©duction estimÃ©e est de **96,97 %**. Il sâ€™agit de tailles de reprÃ©sentations JSON calculÃ©es cÃ´tÃ© SQL, pas dâ€™une mesure du trafic facturÃ© par Supabase. Le volume exact varie avec le catalogue. La recherche gÃ©nÃ©rale transfÃ¨re aussi moins de provenance externe : 3 580 032 â†’ 1 190 411 octets pour cette partie uniquement.

Les deux sources restent masquÃ©es ; leurs imports restent autorisÃ©s. Cette correction ne rÃ©initialise pas le quota dÃ©jÃ  consommÃ© et ne modifie pas ces rÃ©glages.

## Vault : correction prÃ©parÃ©e, application administrative en attente

Les accÃ¨s `backend` et `infra`, crÃ©Ã©s le 15 septembre avec une validitÃ© de sept jours, sont expirÃ©s. Lâ€™accÃ¨s opÃ©rateur reste utilisable pour lire les secrets, mais ses chemins de renouvellement utilisent `infimatch-v1-*/role-id` et des motifs analogues. Vault rÃ©serve le glob `*` Ã  la fin du chemin : ces rÃ¨gles ne donnent pas les permissions attendues. [Documentation officielle des politiques Vault](https://developer.hashicorp.com/vault/docs/concepts/policies).

Le code de crÃ©ation de politique est corrigÃ© : neuf chemins exacts pour les trois rÃ´les existants, sans extension aux autres rÃ´les. Le test de politique vÃ©rifie la portÃ©e et lâ€™idempotence de cette transformation. `npm run vault:renew` renouvelle uniquement les accÃ¨s applicatifs expirÃ©s, vÃ©rifie leur isolation puis remplace atomiquement leurs fichiers ; aucun secret applicatif nâ€™est modifiÃ©.

La politique du coffre actif nâ€™a pas Ã©tÃ© modifiÃ©e. Lâ€™approbation automatique a refusÃ© la rÃ©cupÃ©ration temporaire de privilÃ¨ges root, le redÃ©marrage de Vault et la modification de politique sans accord explicite. La procÃ©dure concrÃ¨te est dans `scripts/vault/repair-operator-policy.mjs` :

1. Sauvegarde Raft dans le rÃ©pertoire privÃ©.
2. RÃ©cupÃ©ration temporaire par le quorum des parts dÃ©jÃ  dÃ©tenues localement.
3. Correction des seuls chemins de rotation de la politique opÃ©rateur.
4. RÃ©vocation du jeton root temporaire, restauration de la configuration et vÃ©rification des accÃ¨s.
5. Renouvellement des accÃ¨s expirÃ©s, puis nouvelle campagne de tests Vault.

Sans `--apply`, le script dÃ©crit seulement les opÃ©rations. Lâ€™exÃ©cution avec `--apply` reste soumise Ã  lâ€™accord explicite demandÃ©. Ne pas annoncer ce point rÃ©solu avant la rÃ©ussite des tests rÃ©els.

## PostGIS : droits fournisseur encore nÃ©cessaires

La tentative avec le compte `postgres` nâ€™a pas retirÃ© les droits effectifs ; le script a dÃ©tectÃ© `WRITE_PRIVILEGES_REMAIN` et annulÃ© la transaction. Aucune dÃ©finition de coordonnÃ©es nâ€™a changÃ©. La table appartient Ã  `supabase_admin`.

La demande prÃªte Ã  transmettre est dans [DEMANDE_SUPABASE_POSTGIS_2026-09-23.md](DEMANDE_SUPABASE_POSTGIS_2026-09-23.md). Aucun message nâ€™a Ã©tÃ© envoyÃ© au support. Il ne faut pas supprimer/recrÃ©er lâ€™extension pour traiter ce point. Supabase documente ce cas de table technique et prÃ©cise quâ€™elle ne contient pas les donnÃ©es mÃ©tier. [Documentation PostGIS Supabase](https://supabase.com/docs/guides/database/extensions/postgis#troubleshooting).

## DNS local

Les recherches SRV MongoDB Ã©chouent via le DNS de la box, mais rÃ©ussissent via 1.1.1.1 et 8.8.8.8. Le ping Atlas rÃ©ussit avec ces DNS et les certificats systÃ¨me, sans dÃ©sactiver TLS. La production Vercel a Ã©tÃ© vÃ©rifiÃ©e sÃ©parÃ©ment et reste disponible.

Le changement des interfaces physiques Ethernet/Wi-Fi requiert une Ã©lÃ©vation Windows. Les anciens serveurs sont sauvegardÃ©s dans le dossier dâ€™audit local. Le script `E:/Interimatch/audits/repair-dns-20260923.ps1` configure les deux DNS, conserve les interfaces VPN et restaure les anciens rÃ©glages en cas dâ€™Ã©chec ; `-Restore` permet le retour arriÃ¨re. Le rÃ©sultat effectif est Ã  confirmer aprÃ¨s lâ€™Ã©lÃ©vation Windows.
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