# Garde-fous des missions — 19 septembre 2026

## Candidatures et affectation
Une affectation confirmée ferme, dans la même transaction, les autres candidatures SUBMITTED/SELECTED du même intérimaire dont les périodes se chevauchent. Statut UNAVAILABLE, motif OTHER_ASSIGNMENT_CONFIRMED, date de fermeture et événement d’audit avec référence interne de l’affectation. Les créneaux adjacents restent possibles. L’annulation ne réactive aucune candidature ; une nouvelle candidature explicite efface le motif courant tout en conservant l’audit.

Le verrou du profil sérialise les actions concurrentes. Aucun verrou supplémentaire n’est pris sur les autres missions. Le contrôle SQL empêchant les doubles affectations reste actif. Les disponibilités simplement non renseignées restent des avertissements lors d’une confirmation.

## Dates
Création, modification et publication d’une mission : les dates couvertes ne doivent pas dépasser le jour local d’aujourd’hui plus deux années calendaires. Même contrôle pour les besoins d’établissement et dans les formulaires. La borne de fin exclusive peut être le minuit suivant le dernier jour autorisé. Les missions existantes hors limite ne sont pas supprimées.

## Relances
Toutes les missions présentes lors de la migration, brouillons compris, reçoivent reminders_enabled=false. Une modification, republication ou nouvelle version ne réactive pas leurs relances. Seules les nouvelles missions ont ce drapeau actif par défaut ; les UUID historiques explicitement neutralisés restent exclus.

La première publication est horodatée par un trigger SQL. Premier rappel après 24 h, délai réel minimal de 24 h entre rappels, trois rappels maximum pour toute la vie de la mission, toutes versions confondues. Seules les missions OPEN non commencées sont traitées.

Les relances créent des notifications InfiMatch pour les membres actifs de l’agence et de l’établissement. Elles ne sont pas des alertes de matching aux intérimaires et n’exigent pas qu’un profil compatible existe. Les emails de confirmation/annulation sont indépendants.

Un verrou transactionnel partagé et l’historique des envois imposent au maximum 100 missions et 100 notifications destinataires sur une heure glissante, même avec des appels n8n répétés/concurrents. Chaque lot sélectionne au maximum 25 missions. Si le groupe de destinataires d’une mission dépasse le budget restant, la mission attend sans envoi partiel. Les appels doivent continuer lors des prochains passages planifiés. Un groupe de plus de 100 destinataires nécessite une stratégie de résumé avant de pouvoir être relancé.

## Contrôles
266 tests unitaires backend et 8 tests PostgreSQL/PostGIS isolés : migration de 1 002 missions sans relance, délai après publication, délai glissant, plafond total indépendant des versions, budget partagé, annulation/début de mission, appels concurrents, affectations concurrentes, historique et nouvelle candidature, rejets de dates par les services API. Nouvelle publication : alerte matching conservée, désactivation des notifications et mobilité respectées. Test frontend dédié aux fuseaux et années bissextiles.

## Diagnostic n8n distinct
Vue Insights consultée le 19 septembre : 720 exécutions, dont 492 matching, 125 reprise/rappels, 80 Discord, 13 confirmations, 4 rappels dédiés, 3 annulations et 3 actualisations quotidiennes. 51 échecs au total, dont 41 reprise/rappels. La dernière erreur conservée (718) est une réponse HTTP 500 au contrôle de santé de l’API, avant les traitements. Les succès ne sont pas conservés en détail ; l’absence d’une entrée récente dans la liste des erreurs ne prouve donc pas l’arrêt des workflows. Le compte déclare le plan Trial. Aucun changement d’abonnement ni de fréquence globale de n8n dans ce correctif.
