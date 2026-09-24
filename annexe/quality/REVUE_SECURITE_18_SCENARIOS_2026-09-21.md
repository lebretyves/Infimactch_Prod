# Vérification des 18 scénarios — 21 septembre 2026

Source des scénarios : tableau de la note complémentaire Sécurité / Qualité fournie. **OK** signifie une preuve exécutée dans le périmètre indiqué. **KO** signifie que la preuve complète attendue reste absente ; ce n’est pas nécessairement une faille démontrée. Aucun résultat local n’est présenté comme une recette interactive de production.

**367 tests unitaires backend**, quatre tests PWA et onze tests CV/aide passent également. Les huit fichiers d’intégration ont été exécutés sur des bases PostgreSQL/MongoDB et n8n isolées. Sept fichiers passent dès le premier passage. `journey.spec.ts` contenait une attente obsolète de refus des profils incomplets et un test de rotation dépendant du premier test : ces deux tests ont été corrigés. Son passage final réussit **32/32**, ainsi que les cinq régressions PostgreSQL. La régression de présélection supprimée a été remplacée par le contrôle que l’acceptation d’un compte désactivé est refusée sans changer l’état de la candidature.

Preuves conservées dans `annexe/proofs/security-review-2026-09-21/` : passage initial (échec conservé), passage final et régressions. La production a été interrogée en lecture seule pour les comptes, MFA, clés et incidents. Aucune clé ni identité de compte n’est incluse dans les preuves.

| Scénario | Test ou preuve | Résultat réel / périmètre | Statut |
|---|---|---|---|
| SEC01 — Connexion après session anonyme | `backend/test/integration/journey.spec.ts`, parcours interne | Rotation de session et refus de l’ancienne session, intégration isolée PASS | OK |
| SEC02 — Déconnexion ou expiration | `journey.spec.ts`, révocation / expiration ; `admin.spec.ts`, expiration MFA | Sessions révoquées et expirées refusées, intégration PASS | OK |
| SEC03 — Échecs répétés de connexion | `shared-rate-limit.spec.ts`, `recovery.spec.ts`, unités auth-rate-limit | Limitation partagée et réponses génériques, intégration PASS | OK |
| SEC04 — Écriture sans CSRF valide | `journey.spec.ts`, « CSRF required before registration » ; `admin.spec.ts`, origine séparée | Requêtes rejetées, intégration PASS | OK |
| SEC05 — Pièce d’une autre organisation | `journey.spec.ts`, parcours ; `cloud-storage.spec.ts`, ownership | Lecture non autorisée refusée, intégration PASS | OK |
| SEC06 — Liste ou export depuis une autre entreprise | `journey.spec.ts`, parcours et listes secondaires ; `admin.spec.ts`, permissions | Listes bornées au périmètre et refus d’accès, PASS. Aucun export métier supplémentaire n’est revendiqué | OK |
| SEC07 — Modification de role / verified | `journey.spec.ts`, parcours ; `admin.spec.ts`, permissions et invitation | Champs / accès non autorisés refusés et absence de privilège acquis dans les cas exécutés | OK |
| SEC08 — Texte contenant du code exécutable | Échappement React et CSP existants ; preuve navigateur historique | Pas de nouvelle injection XSS bout en bout rejouée dans cette campagne | KO |
| SEC09 — Filtres SQL ou MongoDB malformés | `journey.spec.ts`, pagination invalide ; `unit/crypto-search.spec.ts` | Limites rejetées et valeurs SQL liées. Une injection MongoDB malformée complète n’est pas explicitement reliée à un test exécuté | KO |
| SEC10 — Fichier trop gros ou trompeur | `journey.spec.ts`, pièces et RIB ; `cloud-storage.spec.ts`, rollback ; unités fichiers CV | Formats / tailles invalides rejetés, rollback sans métadonnée ni blob orphelin, PASS | OK |
| SEC11 — Chiffrement altéré ou mauvaise clé | `unit/crypto-search.spec.ts` ; restauration authentifiée | Altération / mauvais contexte refusés ; aucun contenu partiel retourné | OK |
| SEC12 — Changement de clé | `journey.spec.ts`, rotation document ; `live-metadata.json` | Ancienne version lisible et nouvelle écriture avec version active, PASS. Production : V2 active, V1 présente | OK |
| SEC13 — Affectations / notifications concurrentes | `journey.spec.ts`, concurrence et exclusion PostgreSQL ; `notifications.spec.ts` | Invariants et idempotence testés, PASS | OK |
| SEC14 — Token de service absent / invalide | `journey.spec.ts`, parcours automatisation ; exécution n8n isolée | Routes de service protégées et workflows isolés exécutés, PASS | OK |
| SEC15 — Export dépôt / workflows sans secret ni document personnel | `current-secret-scan.json`, scan des 1273 fichiers suivis | Aucune valeur secrète actuelle de production trouvée. Historique Git et classification exhaustive des documents personnels non vérifiés | KO |
| SEC16 — Restauration isolée | `annexe/quality/restore-production.json` + contrôles de droits et parcours d’intégration | Sauvegarde réelle fraîche restaurée : 11 comptes, 3096 missions, **3 documents déchiffrés / 3 blobs** ; réseau absent, aucun port publié, aucune modification production | OK |
| SEC17 — Incident fictif et action sensible | `admin.spec.ts`, « source controls and incident lifecycle are permission checked and audited » | Création, état, résolution et audit PASS en isolation. Aucun incident en production ; exercice complet d’alerte et de procédure non prouvé | KO |
| SEC18 — Retour arrière après déconnexion / cache | Tests de session, cache privé et PWA | Contrôles serveur et politique de cache testés ; navigation retour arrière après vraie déconnexion non rejouée de bout en bout dans cette campagne | KO |

## Les huit points opérationnels demandés

1. **Matrice** : explicite ci-dessus, avec les limites et KO de preuve conservés.
2. **Clés / Vault** : `ADMIN_MFA_KEY`, sa version, `DOCUMENT_KEY_V1` et `BACKUP_KEY` présents dans Vault, clés de 32 octets distinctes. Version MFA 1, document actif 2, document ancien 1 et backup 1. Les variables applicatives correspondantes sont présentes dans la cible Vercel production. `BACKUP_KEY` est lu par le travailleur de sauvegarde depuis Vault, pas par le frontend ni l’application Vercel.
3. **Sauvegarde hors site** : **KO de preuve**. La sauvegarde chiffrée fraîche est locale, dans le répertoire privé opérationnel. Aucune destination externe indépendante n’a été configurée ni copie externe prouvée. Une perte du disque local reste un risque.
4. **Documents réels** : la nouvelle restauration dépasse désormais la seule preuve fictive : les trois documents de production ont été restaurés et déchiffrés avec contrôle de taille. Leur contenu personnel n’a pas été exporté dans le rapport. Ce contrôle ne promeut aucune restauration et ne dispense pas de réconcilier le registre courant des effacements avant une vraie reprise.
5. **MFA réel propriétaire** : les trois propriétaires actifs ont un TOTP inscrit, aucun en attente d’activation, et des codes de récupération présents. Une trace `ADMIN_MFA_VERIFIED` suivie d’`ADMIN_LOGIN` existe le 21/09 à 20:49 UTC. L’affirmation « MFA encore non configuré » n’est donc plus exacte.
6. **Recette publiée admin** : présence et utilisation réelle du MFA confirmées par métadonnées/audit ; recette interactive complète connexion / récupération / accès sur la version publiée **encore à rejouer avec le propriétaire**. Aucun secret TOTP réel n’a été utilisé pour se faire passer pour lui. La ligne de recette indique ce statut partiel au lieu d’un OK global.
7. **Partage Vault** : cloisonnement AppRole backend vérifié (403 sur les chemins production et migration), accès humain nominatif documenté. Le rôle opérateur n’a pas accès à l’inventaire `sys/auth` / politiques (403) : séparation exhaustive actuelle par personne **non attestée**.
8. **Incidents** : cycle et audit testés en isolation ; aucun faux incident ajouté en production. L’exercice d’alerte et la procédure complète restent à attester.

## Saisie manuelle CV / profil

Bug reproduit : une année invalide dans une proposition de CV non appliquée empêchait la soumission native de tout le formulaire. Les propositions sont maintenant exclues de la validation de la sauvegarde du profil ; les champs du profil conservent leur validation. Test navigateur : proposition 2100 non appliquée → profil enregistré ; année réelle 2100 → sauvegarde refusée ; retour à une année valide → sauvegarde autorisée. Le stockage PDF / DOCX, la reprise après 503, l’idempotence, la liste persistante et le téléchargement original passent également, à quatre largeurs.

Commande : `BASE_URL=http://127.0.0.1:4189 node frontend/scripts/test-cv-storage-browser.mjs` (adapter la syntaxe de variable à PowerShell).
