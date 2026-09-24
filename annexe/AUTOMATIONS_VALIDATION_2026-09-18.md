# Vérification des automatisations InfiMatch — 18 septembre 2026

Les trois scénarios ont réussi sur les services de production après correction du générateur PDF.

| Scénario | Résultat observé | Exécution n8n |
|---|---|---|
| Mission compatible | 1 notification MATCH pour la mission à environ 0,54 km ; 0 pour la mission hors rayon | 325 et 326 |
| Confirmation d'affectation | Nouvelle affectation fictive, workflow READY, notification CONFIRMATION, PDF téléchargé par HTTP 200 depuis le compte entreprise | 402 |
| Mission non pourvue | 25 notifications REMINDER créées pour le compte entreprise de démonstration, après le délai configuré de 60 minutes | 338 |

## Portée des preuves

Les événements authentiques de publication et d'affectation ont été envoyés individuellement aux webhooks n8n actifs de production avec le mécanisme normal de dispatch ciblé. Cela prouve les traitements et leurs résultats, **pas le rattrapage de la file générale**. La relance utilise des missions de démonstration déjà publiées et restées non pourvues au-delà du délai réel : aucune date de création n'a été falsifiée.

Le premier parcours a utilisé les API authentifiées des comptes autorisés. Après expiration de la session intérimaire, le nouveau parcours de confirmation a invoqué les mêmes services métier de la version de production via l'accès opérateur autorisé ; il n'a pas fabriqué de session ni inséré directement une candidature ou une affectation. La génération finale a bien été faite par le backend appelé par n8n, puis le PDF téléchargé par l'API authentifiée du compte entreprise.

## Correction PDF

Échec initial confirmé sur le serveur : MODULE_NOT_FOUND pendant la génération PDF, concernant une police standard. Correction : conserver explicitement Helvetica dans le traçage des dépendances et déclarer les imports des polices aux deux racines du monorepo. Un journal technique limité au type et au stade de l'erreur a été ajouté ; aucun contenu de document ou secret n'est journalisé.

Déploiement corrigé vérifié : dpl_8Z6iEw26PaxskfEf2gLfP5cVcN6r. La première tentative limitée à la table d'import était insuffisante ; elle a été retirée avant le correctif complet. L'échec initial est conservé séparément.

## Périmètre et disponibilité

Le compte de test dispose d’un rayon de mobilité. Une divergence entre la ville personnelle et le centre de mobilité a été identifiée ; le centre enregistré a été conservé. Les disponibilités initiales étaient toutes passées. Un créneau temporaire le 21 septembre 2026 de 8 h à 10 h a été ajouté pour les tests, puis retiré.

## Nettoyage

Les trois missions fictives créées ont été annulées. Aucune affectation de démonstration n'est restée active. Les disponibilités initiales ont été restaurées. Les notifications et PDF de preuve sont conservés ; le PDF est une confirmation fictive, pas un contrat signé.

## Limites restantes

- Le retard de la file générale n'est pas corrigé par cette validation : le traitement programmé de petits lots peut retarder les alertes.
- Confirmer le centre de mobilité souhaité et renseigner de vraies disponibilités futures pour recevoir des missions utiles.
- L'historique détaillé n8n n'a pas été activé : le contrôle automatique a refusé d'élargir la conservation de données potentiellement sensibles. Les preuves utilisent les traces techniques existantes, les réponses des workflows et les résultats métier. Les exports n'incluent pas les secrets ; les credentials doivent être reconnectés lors d'un import.

## Fichiers

- etat-workflows.json et workflow-*.json : état actif observé et exports.
- n8n-*.png : captures des workflows.
- execution-matches.json, execution-confirmation.json, execution-reminders.json : événements, résultats et références n8n.
- notification-matching.png, notification-relance-entreprise.png, notification-confirmation-entreprise.png : captures dans l'application.
- confirmation-mission.pdf, telechargement-pdf.json, verification-contenu-pdf.txt : document téléchargé, contrôle HTTP, empreinte et contenu extrait.
- scenario.json, execution-cleanup.json : scénario et annulations.
