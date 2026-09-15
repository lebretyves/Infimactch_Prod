# Backlog V2 ? d?tailler avant d?veloppement

Les fonctionnalit?s ci-dessous proviennent du d?coupage de versions d?j? document?. Aucune estimation ni date de livraison nouvelle n?est invent?e.

| Lot | Fonction pr?vue | Travail de pr?paration / crit?re de sortie |
|---|---|---|
| V2-01 / F02 | Attestation sur l?honneur, pi?ces d?exp?rience, plusieurs CV | D?finir les informations et versions, acc?s, remplacement et conservation. Distinguer ces ?crans du contr?le r?glementaire minimal d?j? n?cessaire au sc?nario V1. |
| V2-02 / F08 | Alerte de conflit et duplication de disponibilit?s | UX explicite et duplication idempotente ; refus des chevauchements et prise en compte des nuits/fuseaux. Les contr?les serveur V1 restent actifs. |
| V2-03 / F10 | Pr?paration de mission et itin?raire | D?finir contenu, acc?s apr?s affectation, source cartographique et comportement si coordonn?es inconnues. |
| V2-04 / F14 | Import manuel CSV | Contrat de colonnes, aper?u avant import, validation par ligne, rejouabilit?, bilan et limites de volume. Ne pas confondre avec l?import API V1. |
| V2-05 / F16 | Profils proches mais diff?rents | D?finir une pr?sentation s?par?e des admissibles ; expliquer les ?carts ; aucune conversion implicite IDE/IADE/IBODE et aucun contournement des blocages. |
| V2-06 / F22 | Cat?gories et versions documentaires compl?tes | Mod?le de version, liens aux usages, contr?les d?acc?s, idempotence et conservation. |
| V2-07 / F23 | Signature ?lectronique par prestataire | Choisir le prestataire et le document concern? ; d?finir webhooks v?rifi?s, preuve, refus et annulation. Les contrats complets F24 restent V3. |
| V2-08 / F25 | Relev?s d?heures | D?finir saisie, validation, litige, correction, audit et permissions. Aucune extension implicite ? la paie. |

## ? arbitrer, non engag?

R?f?rences professionnelles : hors V1 et envisag?es en V2, mais contenu, m?thode, donn?es collect?es et droits restent ? d?finir. Recherches enregistr?es : hors V1, sans version future confirm?e.

## Hors V2 selon le d?coupage actuel

V3 : export calendrier personnel, impr?vus/absences/cong?s, centre d?aide, administration avanc?e/multisite, contrats complets, consultation des bulletins de paie. V4 : chatbot et fonctions RH compl?tes.

## Ordre de pr?paration propos?

1. Stabiliser V1 et ses interfaces.
2. D?finir versions documentaires, attestation et pi?ces ; cadrer les droits/conservation.
3. D?finir disponibilit?s, CSV et pr?paration de mission.
4. Cadrer suggestions, heures et int?gration du prestataire de signature.
5. Chiffrer les lots avec l??quipe puis choisir l?ordre de d?veloppement.
