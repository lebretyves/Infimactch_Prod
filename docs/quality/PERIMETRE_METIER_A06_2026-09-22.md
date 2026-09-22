# Périmètre métier et responsabilités — démonstration

Décision validée par le porteur le 22 septembre 2026, point A06 de l’audit.

## Répartition retenue

| Acteur | Rôle dans le scénario de démonstration |
| --- | --- |
| InfiMatch | Mise en relation, présentation des missions, candidatures, suivi des décisions, agenda et confirmation PDF. |
| Agence employeuse | Vérification des justificatifs, préparation du contrat, rémunération et prise en charge des obligations employeur. |
| Établissement d’accueil | Expression du besoin de remplacement, définition des horaires et des conditions d’accueil. |

Le PDF InfiMatch est une confirmation d’affectation dans l’application, pas un contrat de travail signé. La paie, la signature électronique et la rédaction d’un contrat complet ne font pas partie du périmètre validé.

## Contrôles logiciels et vérifications humaines

| Sujet | Informations nécessaires | Contrôle logiciel ou étape humaine | Preuve et limite |
| --- | --- | --- | --- |
| Accès aux missions de l’organisation | Compte, rôle et affiliation | Contrôles d’accès serveur | Une habilitation applicative ne prouve pas à elle seule un mandat professionnel réel. |
| Dates et affectations | Dates, horaires définis par l’émetteur et affectations existantes | Contrôles de cohérence et de conflits ; horaires confirmés avant affectation | `backend/test/unit/assignment-assessment.spec.ts` ; ne prouve pas le respect de toutes les règles contractuelles. |
| Profil et justificatifs | Qualifications déclarées, compétences, état RPPS et pièces disponibles | Alertes de l’application, puis examen humain par l’agence dans le scénario | La candidature et son acceptation restent possibles malgré les alertes ; aucune vérification fictive. Voir la politique A04. |
| Besoin et accueil | Poste, lieu, créneau et conditions de mission | Informations définies par l’établissement d’accueil, transmises via le parcours retenu | La publication d’une mission ne constitue pas une validation juridique du motif de recours. |
| Contrat et obligations employeur | Motif, durée, éventuels renouvellements et mentions adaptées au cas | Étape humaine portée par l’agence employeuse, hors du périmètre de contractualisation d’InfiMatch | Aucune règle universelle de durée ni conformité contractuelle automatique revendiquée. |
| Rémunération | Conditions convenues et éléments nécessaires à la paie | Traitement par l’agence employeuse | L’application ne réalise pas la paie ; le RIB reste facultatif. |
| Confirmation de l’affectation | Mission, candidat et décision autorisée | Suivi, agenda et confirmation PDF dans InfiMatch | Le PDF atteste la confirmation applicative ; il ne remplace pas le contrat signé. |

## Articulation avec les autres décisions

La [politique de candidature et d’affectation](POLITIQUE_CANDIDATURE_AFFECTATION_2026-09-22.md) reste applicable : un profil incomplet produit des alertes cohérentes avec les informations manquantes et les écarts à la mission, sans blocage systématique. Les contrôles d’accès et les conflits d’affectation restent maintenus.

## Statut du point A06

Le périmètre et la répartition des responsabilités sont validés pour la démonstration pédagogique. Ce document décrit une décision produit ; il ne constitue ni une analyse exhaustive des obligations applicables, ni une preuve de conformité pour une activité réelle. La validation du cadre applicable, des mandats et des procédures de l’agence reste à réaliser avant un usage réel. La recette publiée du parcours complet (A03) conserve son statut propre.
