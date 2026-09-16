# Historique de travail — 16 septembre 2026

Journal maintenu à la demande de l’utilisateur. Horaires en Europe/Paris sauf mention contraire. Les horaires exacts viennent des commits ou preuves ; les étapes sans horodatage fiable sont regroupées. Ne jamais inscrire de mots de passe, clés API, jetons, données de compte ou secrets dans ce journal. Les états « en cours » ne constituent pas une livraison.

## Matin — reprise, sécurité et environnement local

- Reprise des travaux V1/kick-off et récupération des branches de sécurité backend. Sauvegarde combinant backend et frontend dans la branche authentification. Commit de sauvegarde `afc6c4c` à 08:30.
- Corrections quota des PDF de confirmation et concurrence entre nettoyage et enregistrement ; exclusion des comptes désactivés des propositions et nouvelles affectations, révocation des sessions ; permissions minimales des bases et migrations sécurité.
- Validation isolée PostgreSQL/MongoDB/n8n, sauvegarde/restauration globale initiale et activation HTTPS local. Commits `5bb0477` à 08:54 et `9a74ed2` à 09:00. La première restauration contenait peu de données métier ; elle ne prouvait pas encore le déchiffrement d’un document représentatif.
- Audits V1, kick-off, dépendances et raccordements. Les bilans d’alors restent historiques : ils comportent des manques corrigés depuis.
- Imports France Travail/JobsPipe, programmation 00 h, 07 h, 09 h, 11 h, 13 h, 15 h, 17 h, exclusion CDI et garde-fou intersources. Aucun rattrapage ni nouvel appel fournisseur gratuit pour les tests du parseur.
- Diagnostic du parsing initialement invisible sur les fiches : prototypes et exemples limités ne suffisaient pas à généraliser son affichage.
- Diagnostic pgAdmin : confusion avec PostgreSQL/Odoo sur 5432 et utilisateur openpg. Connexion InfiMatch rétablie sur 127.0.0.1:55432 ; aucune modification de la base Odoo. Fenêtre pgAdmin laissée disponible.

## Généralisation du parsing et sept corrections V1

- Parseur version 4 stocké en JSONB, empreinte canonique, preuves textuelles et positions, versions, recalcul idempotent, API et affichage sur les offres importées.
- Améliorations métier : exigences/alternatives, primes distinctes du salaire et des horaires, indemnités transport, handicap candidat distinct des patients, médecine polyvalente, maternité, jours, permis et logiciels. Informations incertaines et passages à relire explicités.
- Export des exemples corrigé avec régénération de descriptionHash ; fiches réelles raccordées à l’API.
- Préférences de notifications, correspondance externe, recommandations personnalisées d’accueil, pagination agence au-delà de vingt profils et libellés d’informations manquantes corrigés.
- Migration et recalcul de 194 annonces après sauvegarde SQL privée ; second recalcul sans changement. Aucun nouvel appel fournisseur pour ce recalcul.
- Évaluation : 22/22 attentes ciblées après ajustement sur huit annonces ; lot indépendant supplémentaire de quatre annonces : 11/12. Limites documentées, aucune promesse de précision globale.
- Recettes navigateur desktop/mobile, préférence de notification et candidat 21. Identités simulées dans le navigateur pour ces scénarios, API/persistance testées séparément sur bases isolées.

## 14:17–14:24 — sessions et publication

- Délai d’inactivité choisi par l’utilisateur : 15 minutes. Avertissement à 14 minutes, bouton de prolongation, contrôle serveur, synchronisation entre onglets, lectures automatiques sans prolongation, durée absolue maximale huit heures.
- Tests d’expiration serveur et recette navigateur à horloge accélérée. Quota des signaux d’activité distinct de celui des connexions.
- Commit `e43cf98` à 14:17 : sept évolutions et expiration des sessions publiées sur authentification.
- Premier échec CI avant tests pendant l’initialisation PostgreSQL. Contrôle de disponibilité modifié pour attendre TCP, commit `b2b06a1` à 14:21 ; CI suivante verte.
- Vérification MongoDB avec les identifiants applicatifs Vault : ping authentifié et lecture réussis ; collection matchingruns présente, vide lors du contrôle. Aucun changement métier pendant cette vérification.
- Nettoyage du `.env` : doublon vide RPPS supprimé, toutes les valeurs effectives conservées ; cohérence avec Vault vérifiée. Secrets exclus de Git.

## 14:55–15:21 — nouveaux commits distants récupérés ensuite

- `f0439a6` puis `41e7057` : preuve contextualisée d’intérim JobsPipe, retrait des annonces explicitement fermées/expirées/non conformes et amélioration des journaux d’import.
- `af0720d` à 15:21 : premières commandes de purge/clôture et contrôles de restauration représentative.
- Les tâches France Travail et JobsPipe de 15 h ont toutes deux renvoyé le code de réussite 0 lors du contrôle ultérieur.
- Les commits frontend `f2f66ec` et `8eaf517` étaient également présents à distance. L’utilisateur les a explicitement refusés : ils n’ont pas été appliqués au frontend local.

## 16:15–16:24 — annulations frontend et sécurisation de la conservation

- Annulation des effets de `8eaf517` par `2a40b33` et de `f2f66ec` par `0d356bb`, à 16:15. Le dossier frontend publié retrouve exactement sa version précédente ; aucun changement du frontend local.
- Purge corrigée : événements référencés par reminder_window conservés, fichiers supprimés uniquement après commit et vérification sous verrou ; rollback sans perte de fichier.
- Clôture complétée : coordonnées, profil, expérience, disponibilités, préférences, favoris, notifications, sessions, Google, accès organisation et historiques MongoDB. Historique métier conservé explicitement ; pas de promesse d’anonymisation totale.
- Sauvegarde de recette privée avec base SQL fictive neuve, mission, affectation et confirmation PDF ; composants MongoDB/Vault/n8n issus d’une sauvegarde historique vérifiée.
- Restauration représentative réussie à 16:18 : 2 comptes fictifs, 1 mission, 1 affectation, 1 PDF déchiffré ; Vault et trois workflows restaurés. Correctif du script pour une installation vierge et comparaison avec l’instantané plutôt que la base locale courante.
- Campagne finale : 159 tests backend réussis, PostgreSQL/MongoDB/n8n isolés ; couverture 81,16 % lignes et 80,45 % branches. Simulation de purge locale : aucun élément à supprimer, aucune purge réelle déclenchée.
- Backend seulement synchronisé vers le projet local après sauvegarde des sources précédentes ; API et worker redémarrés, santé contrôlée. Commit `6fdc77c` à 16:24 ; push authentification et CI verte.

## 16:32 — sauvegarde sur main et bilan consolidé

- Main ne contenait que le commit initial. Intégration sans conflit de la version validée et publication du bilan consolidé, commit `abdc5c5` à 16:32. CI main backend/frontend verte.
- Vérification des raccordements déjà réalisés : recherche avancée, FINESS, calendrier, explications, préférences et pagination. Les anciens manques ont été retirés du bilan actuel.
- Sources locales comparées au dépôt : frontend identique ; seuls des sauts de ligne finaux diffèrent sur quelques scripts backend. Secrets et archives de bases conservés hors Git.

## Lot actuel — en cours, non encore publié

Demande : finaliser conservation/demandes de clôture/planification/sauvegardes, Google sur l’origine utilisée, fraîcheur des annonces et contrats OpenAPI. Vercel viendra ensuite.

- Ajout en cours d’une migration et d’API privées de demande de clôture : demande, consultation et annulation ; validation opérateur avant traitement. Registre d’effacement privé prévu pour empêcher une restauration de réintroduire les comptes clôturés.
- Ajout en cours d’une maintenance de fraîcheur : expiration connue ou non-observation pendant trente jours ; absence dans un import partiel jamais assimilée à fermeture fournisseur.
- Complément OpenAPI en cours : schémas de réponses, variantes Google, profils, matching, organisations, référentiels, téléchargements et en-têtes de sécurité. Compilation intermédiaire réussie ; tests complets restant à lancer.
- Préparation de durées de conservation techniques pour le POC fictif et de la maintenance quotidienne ; pas encore activée.
- Google Cloud ouvert dans Edge, connexion impossible signalée par l’utilisateur. À sa demande, Google Cloud ouvert dans Firefox. Connexion utilisateur et vérification des origines encore en attente ; aucune connexion Google réelle réputée validée.

## Règle de suivi

Ajouter une entrée à chaque étape significative : changement, test et résultat, migration/activation, commit/push, correction annulée ou obstacle. Indiquer les preuves ou commits et mettre à jour le statut du lot courant avant de terminer. Ne pas remplacer les preuves d’échec par une affirmation de réussite ; noter la correction et le nouveau résultat.

## Sauvegarde demandee sur Backend

- Sauvegarde du backend, scripts et documentation sur la branche existante `Backend` de `Ziwazou/infiMatch`, en conservant son historique. Aucun fichier frontend ajoute a cette sauvegarde.
- Le lot conservation, fraicheur et OpenAPI reste en cours : compilation reussie mais la derniere campagne isolee a termine en echec dans la commande coverage. Les preuves de cet echec sont conservees ; validation et activation restent a terminer.
- Google : connexion Firefox et verification des origines toujours en attente. Vercel non commence.
