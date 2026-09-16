# Livraison des sept évolutions V1 — 16 septembre 2026

## Réalisé

1. Parseur métier exécuté à chaque import, stocké dans external_offer.parsed_offer (migration OfferParsing1789381000000), exposé comme parsedOffer sur les fiches/listes/recherche. Version 4.0.0, schéma 1, empreinte canonique stable malgré l’ordre des clés JSONB, date d’analyse, preuves exactes avec origine et positions. Les résultats périmés ne sont pas affichés. Le matching d’admissibilité existant n’est pas alimenté automatiquement par des mentions incertaines.
2. Règles enrichies : exigences mixtes et diplômes alternatifs à confirmer, indemnité transport distincte du salaire, prime de nuit distincte du poste de nuit, handicap candidat distinct de la population, médecine polyvalente et maternité ; jours, permis, logiciels et passages à relire. Plusieurs services cités déclenchent une alerte.
3. Export des trois exemples corrigé : descriptionHash SHA-256 régénéré. La fiche normale utilise maintenant l’API, sans limitation aux trois exemples ni à localhost. L’ancienne page de démonstration reste distincte.
4. Préférences de notifications : lecture privée GET et écriture PUT /me/notification-preferences, interrupteur sur l’accueil infirmier, états chargement/erreur/enregistrement. Correspondance externe privée affichée sur la fiche, critères et valeurs indicatives, aucun score global inventé.
5. Accueil infirmier : propositions issues de /me/matches, ordre personnalisé conservé, lien vers les recommandations et explications ; plus de remplacement silencieux par le catalogue si aucune recommandation.
6. Profils proposés agence : pagination indépendante avec offset, total, précédent/suivant, page courante. Test navigateur avec 21 profils, accès réel à la deuxième page.
7. Libellés : absence d’extraction distincte d’absence d’information ; dates inconnues présentées correctement ; texte original consultable avec chaque preuve.

## Application locale et vérifications

Sauvegarde PostgreSQL avant migration dans backups/before-parser-v4-1789552472277.dump (privée). Migration appliquée après validation isolée. Recalcul : 194 annonces traitées ; second passage : zéro changement. Aucun appel JobsPipe/France Travail nécessaire. Les API locales 3100 et 3101 ont été relancées pour charger le code.

Commande, via les secrets Vault existants :

```powershell
node --use-system-ca scripts/vault/run.mjs cli reparse-offers
node --use-system-ca scripts/vault/run.mjs cli reparse-offers --apply
```

La première commande inspecte sans modifier ; la deuxième applique. Imports et recalcul utilisent le même verrou PostgreSQL.

Tests : 149 réussites backend (130 unitaires + 19 intégrations), PostgreSQL/Mongo/n8n isolés et régressions sécurité. Couverture : 79,39 % lignes, 80,30 % branches sur cette exécution. Frontend : douze tests et build réussis. Recette navigateur : fiche réelle hors des trois exemples, preuves affichées, absence de débordement à 375 px, recommandations, bascule préférence, candidat 21/page 2. Identité et réponses de certains parcours simulées uniquement dans le navigateur ; tests de persistance/API réels en environnement isolé. Aucune création de compte métier pour ces captures.

Preuves : [résultat isolé](proofs/v1-hardening/result.json), [recette navigateur](proofs/parser-v4/browser.json), [fiche](proofs/parser-v4/mission-desktop.png), [page candidats 2](proofs/parser-v4/candidate-page-2.png).

## Évaluation et limites précises

Huit nouvelles annonces France Travail ont servi à une première évaluation : 20/22 attentes ciblées retrouvées, deux omissions corrigées (médecine polyvalente, maternité), puis 22/22 sur ce lot devenu un lot d’ajustement. Une annotation « surveillance » a été retirée car non étayée par le texte tronqué ; elle n’est pas comptée comme omission.

Quatre autres annonces, jamais utilisées pour modifier les règles ensuite : 11/12 attentes ciblées retrouvées. La mention « traitements médicamenteux » n’est pas reconnue comme compétence dédiée dans un cas. Les preuves restituées correspondent au texte original. Les vérifications ciblées de faux positifs (handicap candidat, transport/salaire, période salariale inventée) passent ; ce n’est PAS une garantie d’absence de tous les faux positifs.

Les variantes d’unités (par exemple /heure), noms de matériel, localisation textuelle et contraintes complexes peuvent rester partiellement structurés. Un tarif manifestement surprenant donné par le fournisseur reste à confirmer, jamais corrigé automatiquement. Les descriptions tronquées ne sont pas reconstituées. Les notes source, preuves et file de relecture restent visibles. Les lots nouveaux sont France Travail ; les dix JobsPipe disponibles avaient déjà servi au prototype, aucun nouveau quota n’a été consommé.

Le build frontend signale encore un bundle principal supérieur à 500 kB. Les autres chantiers du bilan global restent distincts : Google Cloud, e-mail de vérification, RPPS enrichi/PSC, cycle de vie des offres, conservation, etc.


## Sessions : 15 minutes sans activité

Délai confirmé par l'utilisateur : avertissement à 14 minutes, déconnexion à 15 minutes, bouton Rester connecté. Les clics, frappes et défilements envoient un signal explicite au serveur, au plus toutes les 30 secondes. Les lectures et rafraîchissements automatiques ne prolongent pas la session. Le serveur refuse les sessions expirées, même si le navigateur ne fonctionne plus ; durée absolue maximale de huit heures. Synchronisation entre onglets et contrôle au retour d'un onglet en veille. Le signal d'activité utilise un quota distinct des tentatives de connexion et reste protégé par session et CSRF.

Les anciennes sessions sans horodatage demandent une nouvelle connexion après activation. Aucune migration supplémentaire : horodatages dans les sessions existantes. Recette navigateur avec identité simulée et horloge accélérée : avertissement, prolongation et redirection validés ([preuve](proofs/parser-v4/idle-browser.json)). Expiration serveur et lectures sans prolongation testées sur PostgreSQL isolé.

La recette OpenAPI utilise une connexion HTTP fermée après réponse et sans compression : cela évite une coupure ECONNRESET observée avec Supertest sous Windows. Le contrat complet est toujours vérifié via HTTP.
