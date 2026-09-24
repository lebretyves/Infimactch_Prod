# Inventaire documentaire — 24 septembre 2026

Point de depart : [etat courant](ETAT_COURANT.md). Le [registre complet CSV](INVENTAIRE_DOCUMENTAIRE.csv) recense chaque fichier documentaire, sa taille, ses lignes de texte, son empreinte et son usage. Il est regenere par `python scripts/audit-document-inventory.py`.

Le classement indique la provenance et l’usage ; il ne certifie pas automatiquement chaque affirmation. Les preuves anciennes restent datees. Les documents generes sont des rendus de leurs sources, pas des doublons a supprimer aveuglement.

| Classe | Fichiers |
| --- | ---: |
| Campagne ou procedure specialisee | 108 |
| Chiffrage prospectif | 27 |
| Configuration n8n maintenue | 13 |
| Guide technique | 44 |
| Livrable et sources de generation | 55 |
| Photographie n8n datee | 11 |
| Preuve datee | 372 |
| Rapport historique | 8 |
| Reference du sujet | 3 |
| Support historique remplace | 12 |
| Workflow prepare | 2 |

Total inventorie : **655 fichiers** (hors index lui-meme). Les onze suppressions de doubles exacts sont tracees dans le [registre de nettoyage](quality/NETTOYAGE_DOUBLONS_2026-09-24.json).
