# Candidature et affectation : avertissements et décision humaine

Décision produit confirmée le 22 septembre 2026 — clarification du point A04 de l’audit.

## Pourquoi conserver la possibilité de poursuivre

Un blocage systématique sur la seule absence d’informations dans le profil serait trop restrictif. Le candidat doit pouvoir envoyer sa candidature malgré un profil incomplet ; l’entreprise ou l’agence doit pouvoir l’accepter ou la refuser malgré ces alertes. Les avertissements doivent correspondre aux informations réellement manquantes ou aux écarts constatés avec la mission.

Poursuivre ne transforme pas une déclaration en information vérifiée. Le statut RPPS reste inchangé : non vérifié, en attente ou non trouvé ne devient pas vérifié après acceptation. La décision humaine ne constitue pas une certification des qualifications.

## Trois traitements distincts

| Étape | Règle |
| --- | --- |
| Matching automatique interne | Conserve ses critères d’éligibilité. Le paramètre `DEMO_OPTIONAL_RPPS=true` assouplit son critère RPPS pour la démonstration ; sans ce paramètre, le matching applique son critère RPPS strict. |
| Candidature volontaire | Les informations incomplètes et les écarts de profil prévus par les règles produisent des avertissements, sans bloquer à eux seuls l’envoi. Cette possibilité ne dépend pas du mode RPPS facultatif de démonstration. |
| Examen par l’entreprise ou l’agence | L’acceptation ou le refus reste possible malgré ces avertissements. L’affectation conserve les contrôles de permissions, de dates, d’état de mission et de concurrence. |

Une candidature autorisée ne signifie donc pas que le matching automatique considère le profil comme éligible. Les offres externes France Travail / JobsPipe conservent leur correspondance partielle et leurs propres conditions ; aucun score complet n’est déduit de cette règle.

## Alertes cohérentes avec le profil et la mission

Les évaluations de candidature et d’affectation traitent comme avertissements : qualification manquante, RPPS non vérifié/en attente/non trouvé, service non préféré, compétences requises manquantes, expérience insuffisante, disponibilités incomplètes, créneau non accepté, mobilité incomplète et distance hors rayon. Le mode de démonstration peut ajouter l’avertissement RPPS facultatif.

Les horaires non confirmés constituent un avertissement à la candidature, mais restent bloquants pour l’affectation : les horaires précis doivent être définis par l’émetteur. Les conflits avec une autre affectation, les dates incompatibles et une mission non ouverte ne sont pas levés par l’acceptation d’un profil incomplet.

Les avertissements associés à la candidature et à l’affectation sont conservés dans leurs traces d’audit. Cette trace atteste la décision et les alertes enregistrées ; elle ne prouve pas une vérification externe des diplômes ou du RPPS.

## Sources et limites des preuves

- `backend/src/missions/application-assessment.ts` : avertissements de candidature.
- `backend/src/missions/assignment-assessment.ts` : avertissements d’affectation distincts de l’éligibilité du matching.
- `backend/test/unit/assignment-assessment.spec.ts` : profil incomplet et maintien des blocages d’affectation.
- `backend/test/integration/application-warnings.spec.ts` : candidature malgré les alertes, acceptation ou refus, cohérence des avertissements et traçabilité.
- `backend/test/unit/rpps-demo-policy.spec.ts` : politique RPPS du matching selon le mode de démonstration.

Cette mise à jour corrige la contradiction documentaire relevée en A04 ; elle ne modifie pas le comportement du produit. Elle ne vaut pas exécution de la recette complète sur le site publié (A03), ni clôture des autres points de l’audit.
