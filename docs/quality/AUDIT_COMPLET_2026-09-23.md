# Audit du projet — 23 septembre 2026

## Mise à jour — MongoDB vérifié depuis Vercel à 17 h 26

**La connexion MongoDB de production est maintenant confirmée : état disponible, ping en 84 ms.** Le contrôle a été exécuté par la route existante `GET /api/v1/admin/infrastructure`, consultée dans Firefox avec la session administrateur normale. Cette route attend la connexion Mongoose puis exécute `admin().ping()` depuis Vercel. PostgreSQL/PostGIS est également disponible (287 ms). Version serveur observée : `1bc970b38efb5f19b202f5e30edbcef767f9d335`.

[Preuve du contrôle de production](../proofs/full-project-20260923/vercel-mongo-connectivity.json).

Le constat MongoDB ci-dessous décrit le blocage du poste lors de la campagne initiale : il ne constitue plus une incertitude sur la connexion de production. Le DNS local reste à corriger durablement ; un essai local avec DNS alternatifs et certificats système a réussi sans désactiver TLS. Ce contrôle ne valide pas une sauvegarde/restauration ni tout le parcours de matching. Les autres problèmes de l'audit restent ouverts.

Aucun compte ni document fictif n'a été créé. Le contrôle a utilisé l'interface existante, sans extraction de cookie ni modification du code ou des réglages de production.

## Résultat de la campagne initiale

**Les tests applicatifs réussissent, mais quatre points opérationnels ou techniques restent ouverts.** Audit du commit `eb9bd26696da2d8402f29e8562567a8f1285f633`, présent sur Yves `Main` et Epitech `main`. Les lectures de production ont été réalisées vers 16 h 39–16 h 45, heure de Paris. Aucun réglage de visibilité, compte, mission, workflow ou secret de production n'a été modifié par cet audit.

[Preuves et résultats](../proofs/full-project-20260923/summary.json) · [Dossier complet des preuves](../proofs/full-project-20260923/).

## Tests relancés

| Contrôle | Résultat |
| --- | --- |
| Unitaires backend | **652 / 652**, aucun échec |
| Couverture unitaire des lignes | **95,08 %** : 11 710 / 12 315 |
| Couverture des branches / fonctions | 89,95 % / 82,32 % |
| Intégration backend | **185 / 185**, 28 fichiers, PostgreSQL/PostGIS + MongoDB + trois workflows n8n réels dans un environnement isolé |
| Régressions de sécurité SQL | 5 contrôles réussis |
| Unitaires frontend | **81 / 81**, aucun échec |
| TypeScript et builds | Application et administration réussies ; backend compilé par la campagne isolée |
| Parcours navigateur | Recherche, inscription, notifications, recommandations, erreurs, accessibilité, publication, Discord et RPPS réussis ; administration réussie |
| Qualité des pages publiques | 18 contrôles responsive/sémantiques réussis ; pas de cache des API sensibles ; repli hors connexion vérifié |
| PWA | 4 / 4 tests réussis |
| Dates et agenda | 20 assertions date/heure et 21 assertions agenda réussies, dans trois fuseaux système |
| SEO | Contrôles HTML, routes, canonical, sitemap et métadonnées réussis |
| Script FINESS | Tests réussis, sans téléchargement ni import |
| Audit npm | 0 vulnérabilité connue signalée pour les dépendances backend, backend de production et frontend |
| Secrets | Aucun des secrets backend/production lus dans Vault retrouvé dans les 1 443 fichiers contrôlés |
| Cohérence documentaire | Aucun écart bloquant |
| Vault et utilitaires sécurité | **14 réussis / 16 exécutés, 2 échecs** ; un test supplémentaire non exécuté faute de `.env` local de comparaison |

La couverture porte sur les lignes backend ; ce n'est pas un pourcentage de couverture fonctionnelle de toute l'application. Les configurations c8 n'ont pas été réduites. La CI complète Yves du commit audité est également réussie : [run 35873322129](https://github.com/lebretyves/Infimactch_Prod/actions/runs/35873322129).

Les tests Vault ont d'abord été lancés sans le répertoire privé de cette installation ; leurs erreurs de fichiers absents ont été diagnostiquées. Le résultat final ci-dessus utilise le bon répertoire privé. Le test comparant les secrets backend au fichier `.env` du checkout a été exclu explicitement ; il ne constitue pas un succès.

## Problèmes confirmés

### P1 — Recommandations externes très coûteuses en transferts Supabase

**Code :** `backend/src/listings/recommendations.ts`, méthode `external`, notamment la requête autour de la ligne 65.

Lorsqu'au moins une source externe est visible, chaque demande parcourt toutes ses offres actives par lots de 100. La requête charge description, provenance et offre parsée avant de ne conserver que trois résultats. Avec les deux sources, l'agrégation SQL mesure **61 421 614 octets, environ 61,4 Mo de représentation JSON** pour 5 128 offres actives non expirées. C'est une estimation du volume des données sélectionnées, pas une capture du trafic réseau facturé ; cette mesure n'a renvoyé que des agrégats au poste d'audit.

La recherche générale mérite la même optimisation : `backend/src/listings/listing-order.ts` parcourt des enregistrements compacts du catalogue avec un curseur de 500 lignes, même pour une petite page. Le curseur limite les lots et la mémoire, mais n'élimine pas les transferts nécessaires au classement global.

La capture fournie par l'utilisateur affiche **7,83 / 5 Go d'egress au niveau de l'organisation Supabase**, qui contient deux projets. Elle ne permet pas d'attribuer tout ce volume à InfiMatch, ni à une seule requête. Les statistiques `pg_stat_statements` sont inaccessibles au rôle d'audit (`42501`) : l'attribution historique précise n'est donc pas établie.

**État actuel :** les deux sources sont masquées depuis environ 16 h 17, mais leurs imports restent autorisés. La méthode de recommandations ne parcourt pas leurs offres dans cet état. L'API publique renvoie zéro offre externe, comme demandé. L'audit n'a pas changé ces réglages.

**Correction prioritaire :** réduire la projection aux seuls critères nécessaires au classement, ne charger les descriptions et données détaillées que pour les résultats retenus ; évaluer ensuite un classement SQL/précalcul compatible avec les règles de matching et un cache maîtrisé. Mesurer les octets et comparer les résultats avant/après sur les mêmes fixtures. Contrôler dans le tableau de bord la ventilation par projet et service.

La documentation Supabase distingue notamment les transferts Data API et ceux du pooler SQL ; sélectionner moins de champs et de lignes fait partie des mesures proposées. [Documentation officielle sur l'egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

### P2 — Identifiants AppRole locaux backend et infrastructure refusés

Les contrôles « Infrastructure role cannot read backend secrets » et « Short-lived launcher token is revoked after use » échouent lors de l'authentification AppRole : HTTP 400. Il n'est donc pas possible de valider leurs assertions de permissions/révocation avec les fichiers actuels. La cause exacte du refus — secret expiré, révoqué ou incohérent — n'est pas établie.

Vault est initialisé, déverrouillé et son accès opérateur fonctionne. Le fichier de récupération ne contient pas de jeton root selon le contrôle effectué. La production utilise les variables serveur Vercel et ne dépend pas d'un Vault local allumé.

**Action :** diagnostiquer puis renouveler les identifiants locaux concernés selon la procédure Vault, et relancer les tests. Aucune rotation n'a été effectuée pendant l'audit.

### P2 — Connexion MongoDB non vérifiable depuis ce poste

La tentative de connexion avec la configuration de production échoue avant la connexion à Atlas : `ECONNREFUSED`, opération DNS `querySrv`. Cela bloque ce contrôle local et les opérations locales qui nécessitent cette résolution. La tentative de sauvegarde complète précédente avait également échoué sur MongoDB ; seule la sauvegarde PostgreSQL/configuration avait ensuite réussi.

**Ce résultat ne prouve pas une panne MongoDB depuis Vercel.** `/health` ne teste que PostgreSQL (`SELECT 1`), et les intégrations MongoDB réussies utilisent MongoDB isolé. Aucun contrôle de production avec compte réel ni nouvel envoi de notification n'a été réalisé pour tester Atlas.

**Action :** rétablir la résolution SRV sur le poste, vérifier ensuite Atlas et les droits réseau, puis réaliser une sauvegarde complète et un test de restauration isolé. Contrôler séparément Atlas depuis l'environnement Vercel.

### P2 — Droits d'écriture publics sur la table technique PostGIS

Les rôles `anon` et `authenticated` ont encore `INSERT`, `UPDATE` et `DELETE` sur `public.spatial_ref_sys`. C'est le point déjà documenté dans [les corrections de sécurité du 21 septembre](SECURITE_CORRECTIONS_2026-09-21.md), qui nécessitait une intervention liée à la propriété Supabase de l'extension.

Les six tables métier vérifiées (`account`, `profile`, `session`, `document_blob`, `mission`, `external_offer`) ne sont pas lisibles par ces rôles. Le rôle applicatif n'est ni superutilisateur ni créateur de base/rôle/schéma, et ne peut lire `migrations`. Aucune exploitation ni exposition des données métier n'a été démontrée.

**Action :** finaliser le retrait des permissions sur la table technique avec le propriétaire habilité/Supabase Support, puis vérifier les calculs PostGIS. Ne pas supprimer ou recréer l'extension pour contourner ce problème.

## Production et automatisations

- Frontend, administration et santé API : HTTP 200. Le JavaScript servi par l'administration correspond au build local vérifié.
- Déploiements frontend/backend réussis pour le commit audité ; deux branches principales identiques.
- Supabase répond aux connexions administrateur et applicative vérifiées en TLS. Taille SQL mesurée : 115 207 315 octets. Cette mesure instantanée peut différer de l'indicateur du tableau de bord organisationnel.
- 174 741 références FINESS estimées dans les statistiques de table ; l'import automatique est une commande manuelle, pas une tâche périodique.
- Les imports France Travail ont une activité enregistrée le 23 septembre ; le cycle est `IN_PROGRESS`. Cela ne signifie pas que toute la collecte est terminée.
- Le checkpoint JobsPipe prévoit une reprise au **1er octobre 2026 à 00:00 UTC** ; dernier import `SUCCESS` observé le 19 septembre. Aucun appel fournisseur payant n'a été déclenché pour cet audit.
- Un événement `MissionOPEN` reste en attente : il correspond exactement au lot de démonstration exclu des notifications. Il ne constitue pas une nouvelle alerte bloquée.
- Un reçu de rappel existe le 23 septembre à 14:00 UTC ; des reçus de confirmation/matching existent le 22 septembre. Les reçus ne suffisent pas à prouver une livraison email/Discord.

## Limites et suites

Cet audit combine tests, revue ciblée du code, dépendances et contrôles de production en lecture seule. Ce n'est ni un test de charge de production, ni un audit RGAA exhaustif, ni une garantie d'absence de défaut. Aucun message réel SMTP/Discord, aucun import externe, aucun export complet de base et aucune restauration n'ont été lancés. Les neuf workflows Cloud restent documentés par l'export authentifié du jour ; les tests n8n relancés ici concernent l'environnement isolé.

Les corrections applicatives et les opérations sensibles de remédiation ne sont pas incluses dans cette campagne : priorité à la réduction des transferts, puis à la remise en état des accès opérateur et à la finalisation des droits PostGIS.
