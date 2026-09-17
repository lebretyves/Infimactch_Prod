# Import de missions de démonstration, sans publication

Prérequis : Node 24, dépendances du dépôt installées (`npm ci`), backend compilé (`npm run build --workspace backend`). Pour le test SQL : Docker disponible et port local 55433 libre. Aucune variable ou connexion de production n’est nécessaire.

Le dossier de données doit contenir `missions.json`, `mission-draft-payloads.json` (même empreinte SHA-256), `sources/finess-active-20260917.json`. Le fichier optionnel `organization-finess-readonly.json` fournit uniquement des organisations réellement observées pour la préparation ; il n’accorde aucun droit. Les données volumineuses restent hors du dépôt.

Préparer les vacations sans connexion à une base :

```powershell
node scripts/safe-demo-mission-import.cjs C:/chemin/vers/missions-500
```

Résultat : `mission-import-prepared-finess.json`. Un FINESS doit être géographique, actif et unique dans le snapshot récent (maximum un mois calendaire). Une organisation correspondante doit être unique. Sans compte importateur identifié et autorisé, le résultat demeure bloqué. Aucun UUID, établissement ni GPS n’est inventé.

Exécuter le test d’import dans PostGIS jetable :

```powershell
node scripts/test-safe-demo-mission-import.cjs C:/chemin/vers/missions-500
```

Le test lance un conteneur PostGIS local avec mot de passe aléatoire, migre la base, crée explicitement des organisations et un compte **fictifs de test**, puis importe les vacations valides en DRAFT. Les identités FINESS de la fixture servent à tester la résolution, sans affirmer de mandat réel. Un deuxième passage vérifie l’idempotence. Les références périmées, FINESS absents, organisations ambiguës et comptes non autorisés sont bloqués. UTC et fuseaux DOM sont vérifiés. Le conteneur est supprimé à la fin ; aucune publication n’est effectuée.

L’idempotence métier est liée au compte importateur : une reprise utilise le même compte. Les clés d’idempotence contiennent l’empreinte du dataset et l’identifiant demande/vacation. Une nouvelle version du dataset a de nouvelles clés : ne pas importer plusieurs versions dans la même base sans stratégie explicite de remplacement. L’importeur ne remplace ni ne supprime les anciennes missions.

Le module exporte `load`, `prepare`, `organizationCandidates` (SELECT uniquement) et `applyIsolated`. Cette dernière refuse toute base autre que `127.0.0.1:55433/infimatch_test`, exige `NODE_ENV=test` et contrôle la connexion réellement utilisée. L’écriture des missions passe par le service métier et ses autorisations. Aucune création d’organisation ou publication n’existe dans l’importeur ; les créations de fixtures appartiennent exclusivement au script de test.

Une demande avec plusieurs jours devient plusieurs vacations continues. Les coordonnées manquantes bloquent le matching strict et l’import ; les coordonnées de centre-ville ne doivent pas remplacer celles du site. Les champs de preuve, contrat et caractère fictif restent dans l’enveloppe et la description : ils ne sont pas des autorisations de publication.
