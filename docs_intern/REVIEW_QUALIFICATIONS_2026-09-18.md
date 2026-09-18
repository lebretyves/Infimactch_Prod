# Revue des qualifications et competences — 18 septembre 2026

Verdict : REQUEST CHANGES sur cb4d530 ; corrections locales appliquees.
Confiance : elevee sur les incoherences techniques, partielle sur l'exhaustivite metier.

Le catalogue contient 73 competences distinctes : 61 suggestions IDE, 26 IADE et 15 IBODE, avec des competences communes. Les diplomes restent trois qualifications distinctes. Le filtre ne coche aucune competence automatiquement et conserve les selections anterieures.

| Priorite | Constat | Correction |
| --- | --- | --- |
| P1 | Les missions proposent ANESTHESIE, BLOC_OPERATOIRE, SMUR et STERILISATION, mais les formulaires d'experience utilisent seulement ideServices. Une experience pertinente ne peut donc pas etre renseignee normalement pour ces missions. | Liste des services historiques issue du catalogue complet dans Profil et Qualification ; memes choix dans le formulaire d'import CV. |
| P2 | Le texte « utiles ou reellement maitrisees » est identique pour candidat et entreprise. | Candidat : declarer uniquement la maitrise reelle ; entreprise : selectionner les competences attendues. |

La correspondance clinique est une suggestion editoriale, pas une autorisation d'exercice. Les suggestions d'anesthesie specialisee restent IADE, celles d'assistance chirurgicale IBODE restent IBODE. Un IDE exercant au bloc n'est pas automatiquement IBODE.

Point de perimetre non implemente : les autorisations derogatoires IDE pour certains actes au bloc ne sont pas modelisees. Ne pas presenter le catalogue comme une liste exhaustive des autorisations individuelles. Le decret 2024-954 prevoit une autorisation specifique ; aucune qualification ni autorisation n'a ete attribuee automatiquement lors de cette revue.

Sources primaires consultees :
- https://www.francecompetences.fr/recherche/rncp/39908 : activites IADE en anesthesie-reanimation, urgences et douleur.
- https://www.legifrance.gouv.fr/loda/id/JORFTEXT000045696964 : formation IBODE.
- https://emploi.fhf.fr/emploi/477629 : poste IBODE ou IDE de bloc a Carcassonne.
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050395347 : autorisations derogatoires IDE en bloc operatoire.

Controles : compilation TypeScript frontend ; tests des 73 competences, isolation des metiers/services, conservation des anciens codes, listes d'experience ; egalite stricte des catalogues backend et frontend.

Etat : corrections locales dans Infimactch-Prod-sync. Non commitees, non poussees, non deployees. Les changements de matching de la meme session sont egalement locaux. La modification preexistante de AccountNotifications.tsx n'a pas ete incluse dans cette revue.
