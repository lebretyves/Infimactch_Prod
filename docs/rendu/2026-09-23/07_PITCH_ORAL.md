# Trame orale — 15 minutes

Douze diapositives, dont trois minutes de démonstration. Rôles A/B/C/D à attribuer aux quatre membres. Les questions du jury peuvent interrompre le déroulé : adapter la démonstration sans supprimer les limites essentielles.

| Diapo | Début | Durée | Intervenant | Sujet |
| --- | --- | --- | --- | --- |
| 1 | 00:00 | 45 s | A | Une mission compatible, une décision claire |
| 2 | 00:45 | 60 s | A | Un besoin de coordination dans la santé |
| 3 | 01:45 | 60 s | A | Le marché existe déjà |
| 4 | 02:45 | 60 s | C | Un parcours métier complet |
| 5 | 03:45 | 180 s | C | Du besoin à la confirmation |
| 6 | 06:45 | 75 s | B | Des responsabilités séparées |
| 7 | 08:00 | 75 s | B | FINESS devient une donnée utile |
| 8 | 09:15 | 60 s | B | Des scénarios exportés et traçables |
| 9 | 10:15 | 60 s | D | Des résultats mesurés, un périmètre précis |
| 10 | 11:15 | 75 s | D | Réduire les risques et les transferts |
| 11 | 12:30 | 75 s | D | Confronter le prévu au réalisé |
| 12 | 13:45 | 75 s | D | Un POC démontrable, un pilote à valider |

## Texte et consignes par diapositive

### 1. Une mission compatible, une décision claire

Un établissement cherche un infirmier disponible. Le candidat doit comprendre la mission et savoir où en est sa candidature. Relier infirmier, établissement et agence, de la recherche à la confirmation d’affectation.

Ouvrir par une situation illustrative, sans la présenter comme un entretien réel. Annoncer le fil : problème, solution, démonstration, preuves et limites. InfiMatch ne remplace pas l’employeur.

### 2. Un besoin de coordination dans la santé

Infirmières en emploi en 2021 selon la DREES. L’étude décrit des difficultés de recrutement. Infirmiers IDE, IADE et IBODE ; établissements de santé ; agences spécialisées. Pilote local à construire.

Source : DREES, Études et Résultats 1319, décembre 2024. https://www.drees.solidarites-sante.gouv.fr/sites/default/files/2024-12/ER1319_0.pdf . Ce chiffre ne mesure ni les intérimaires ni les clients adressables. Les irritants de coordination sont des hypothèses à valider.

### 3. Le marché existe déjà

Hublo : RH et remplacements. Appel Médical : recrutement spécialisé. Staffsanté : offres et candidatures. Une recommandation compréhensible et un état de candidature explicite, jusqu’à la décision humaine.

Sources primaires : https://hublo.com/fr ; https://www.appelmedical.com/ ; https://www.staffsante.fr/ . Lecture des offres publiques au 23/09/2026, pas audit concurrent. Ne pas affirmer qu’ils n’ont pas une fonction. Abonnement B2B et accès candidat gratuit restent des hypothèses.

### 4. Un parcours métier complet

Profil, disponibilités et zone. Recherche et explications du matching. Candidature, calendrier et documents. Publication, suivi des candidatures, sélection et confirmation. L’agence conserve la décision d’affectation.

Présenter brièvement les rôles et les contrôles d’accès. Souligner que disponibilité, qualification et décision sont distinctes. Le mode RPPS facultatif est réservé à la démonstration configurée.

### 5. Du besoin à la confirmation

1. Ouvrir une mission. 2. Montrer les critères et le profil. 3. Candidater et constater l’état en attente. 4. Retrouver la candidature. 5. Confirmer dans l’environnement de test. 6. Montrer calendrier, PDF et notification.

Répéter sur l’environnement de démonstration. Ne pas notifier un utilisateur réel. Garder des onglets préparés. Si le service est indisponible : expliquer l’incident et montrer les preuves datées ainsi que le rendu Discord, sans prétendre à une exécution en direct réussie.

### 6. Des responsabilités séparées

React / TypeScript ; API NestJS. PostgreSQL / PostGIS pour les états et la géographie ; MongoDB pour les explications. n8n coordonne les appels. Les règles métier et permissions restent côté backend. Les secrets ne sont pas dans le dépôt.

Décrire le chemin d’une candidature dans l’API et la base relationnelle, puis l’événement d’automatisation. Montrer le README et expliquer les profils d’accès. Une base non relationnelle a un usage complémentaire explicite.

### 7. FINESS devient une donnée utile

Identifiants et zéros conservés ; textes nettoyés ; doublons rejetés ; coordonnées ambiguës laissées vides. Recherche d’établissements dans les parcours entreprise. Script avant/après livré, fonction identique à celle du backend.

Source ANS, https://www.data.gouv.fr/datasets/finess-structures-1 ; Licence Ouverte 2.0. Montrer demonstration-finess-resultat.json. La fixture pédagogique est synthétique ; le téléchargement réel est disponible via npm run finess:import. Ne pas confondre cet exemple et un extrait réellement téléchargé.

### 8. Des scénarios exportés et traçables

Matching → notification. Affectation confirmée → génération documentaire. Les rappels assurent une reprise. JSON avec provenance et versions ; credentials à réassocier. Les exports Cloud et les modèles de recette sont distingués.

Montrer un JSON et son manifeste. Expliquer qu’un statut actif n’est pas une preuve de réception. Le nœud de reprise porte un ancien nom « 30 minutes » mais son paramètre vaut quatre heures. Les tests isolés ne sont pas des exécutions Cloud.

### 9. Des résultats mesurés, un périmètre précis

Tests unitaires réussis. Couverture : 95,11 % des lignes, 89,98 % des branches, 82,41 % des fonctions. 11 intégrations notifications réussies. Régressions SQL réussies. Frontend : 81/81 dans la campagne antérieure.

Preuves : docs/proofs/discord-notifications-20260923/ . Distinguer réussite des tests et couverture. Les résultats frontend sont antérieurs, non relancés pour le changement Discord. Ce n’est pas une certification de sécurité ou une garantie sans bugs.

### 10. Réduire les risques et les transferts

Droits par rôle, chiffrement, MFA et secrets dans Vault. Navigation clavier, structure sémantique et corrections ciblées. Requêtes de matching regroupées ; scan compact des offres puis chargement des seuls détails retenus.

Références : docs/quality/OPTIMISATION_MATCHING_2026-09-20.md et CORRECTIONS_AUDIT_2026-09-23.md. Le gain de volume JSON mesuré sur un cas n’est pas une mesure de CO2 ni une facture réseau. Ne pas revendiquer de conformité globale RGAA/RGESN. Les PDF ne sont pas des contrats complets signés.

### 11. Confronter le prévu au réalisé

348 à 528 heures-personnes. 438 h est le centre calculé, pas une nouvelle estimation validée à J+2. Le relevé humain est vide. Le classeur calcule les écarts après saisie des heures et justificatifs.

Ne pas présenter les durées d’agent comme du travail humain. Quatre personnes, onze jours, six heures productives hypothétiques donnent 264 h : l’écart doit être expliqué par le réel, pas masqué. La validation du CDC à J+2 reste à joindre.

### 12. Un POC démontrable, un pilote à valider

Code, README, roadmap, exports n8n, script FINESS, étude sourcée, classeur et support oral. Renseigner les temps. Tester le besoin sur le terrain. Suivre PostGIS avec Supabase et le DNS local. Préparer un pilote limité.

Conclure sur la proposition de valeur, puis ouvrir les questions. Les entretiens et partenariats ne sont pas acquis. Supabase/PostGIS attend le support ; DNS local inchangé. Le coffre local a été réparé. Montrer que les réserves sont connues et suivies.

## Préparer la démo

Avant le passage : comptes fictifs, mission future, rôles distincts et onglets prêts. Répéter recherche → candidature → décision → document. Utiliser des destinataires de test pour les notifications. Conserver une copie du PDF et des preuves pour un scénario de secours.

En cas de panne : dire ce qui ne fonctionne pas, montrer les sorties datées disponibles et expliquer ce qui reste non vérifié. Ne pas déclarer réussi un envoi que le jury n’a pas vu.

## Questions probables

- Pourquoi MongoDB ? Usage complémentaire pour les explications du matching, sans déplacer les transactions métier.
- Pourquoi n8n ? Orchestration observable ; les contrôles métier restent dans le backend.
- Que mesure 95,11 % ? La couverture des lignes backend par les tests unitaires, pas une conformité globale.
- Avez-vous des clients ? Aucun engagement commercial attesté dans ce rendu ; le pilote est proposé.
- Combien de temps réellement passé ? Le relevé humain doit être renseigné ; ne pas substituer une estimation.
