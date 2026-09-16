# Décisions V1
Référence : instructions explicites de l’utilisateur, catalogue Word courant et sujet scolaire.

| Décision | Statut | Conséquence |
|---|---|---|
| Nouvelle numérotation du Word | Confirmée | F12 automatisations, F15 import, F18 RPPS, F22 documents, F24 contrats |
| Trois automatisations | Confirmée | Match, confirmation, relance |
| Confirmation simple | Retenue dans le choix des trois | Modèle généré après affectation ; contrats complets V3 |
| RPPS via API à la saisie du profil | Confirmée | Résultat serveur lié au numéro courant |
| RPPS non retrouvé | Confirmée | Candidature/nouvelle affectation bloquées ; correction possible |
| RPPS indisponible | Confirmée | En attente et reprise ; aucune validation implicite |
| Validation manuelle RPPS par agence | Écartée | Ne pas la réintroduire comme exigence |
| Attestation sur l’honneur | V2 confirmée | Pas de formulaire V1 |
| Références professionnelles | Hors V1, V2 envisagée | Contenu/méthode à définir ultérieurement |
| Affectation finale agence | Conservée F19 | Distincte du contrôle RPPS |
| Synchronisation et corrections techniques | Autorisées | Annulation atomique, verrouillage, TLS, reprise et critères de fin |

Correspondance ancienne numérotation PDF → Word actuel :
F08 candidatures → F07 ; F09 disponibilités → F08 ; F10 historique → F09 ; F12 préparation → F10 ; F13 imprévus → F11 ; F14 notifications → F12 ; F16 aide → F13 ; F17 CSV → F14 ; F17 API → F15 ; F18 matching → F16 ; F20 vérification → F18 ; F24 organisations → F21 ; F25 documents → F22 ; F26 signature → F23 ; F27 contrats → F24 ; F28 heures → F25 ; F29 paie → F26.
F17 création, F19 suivi agence et F20 usage public sont explicités dans le Word actuel.

Choix techniques de consolidation, sans nouvelle fonctionnalité : annulation simultanée mission/affectation ; republication explicite avec nouvel accord ; contrôles concurrents coopératifs ; TLS entre services ; notes initiales créées si absentes ; blocage documentaire distinct de livraison.

Le PDF historique et les anciens méga prompts ne sont pas réécrits. Leur présence ne modifie pas la priorité du Word et des décisions ci-dessus.

Derniere contrainte confirmee : 4 personnes, 11 jours, rendu fixe. Le planning est adapte a cette contrainte ; aucun report de date ni retrait de V1 presume.
