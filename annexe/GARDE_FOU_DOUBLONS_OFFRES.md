# Garde-fou doublons intersources — 16 septembre 2026

Contrôle SQL local : 194 offres (184 France Travail, 10 JobsPipe), 187 actives. Aucun doublon confirmé par les règles strictes ; aucune annonce désactivée. Résultat horodaté : proofs/offer-deduplication/audit.json.

Le backend applique désormais offer-deduplication.ts après chaque import réel des deux fournisseurs, dans la même transaction. Un verrou PostgreSQL commun sérialise les imports concurrents. France Travail est conservé en priorité lorsque la même offre est reconnue dans les deux sources. Les lignes originales et favoris restent conservés ; la copie est inactive, avec identifiant de référence et motif dans sa provenance et dans import_run.

Preuves admises : même lien de détail France Travail ; même URL externe (paramètres de suivi retirés) avec titre, localisation et qualification identiques ; ou description longue strictement identique après normalisation des espaces/casse, avec titre, localisation et qualification identiques. Une simple ressemblance métier ne provoque aucune suppression. Les reformulations peuvent échapper à ces règles prudentes ; aucun score flou ne fusionne automatiquement des postes.

Validation : 113 tests unitaires réussis, compilation réussie, test SQL réel intégralement annulé vérifiant import JobsPipe avant France Travail, priorité, provenance et réimport sans réapparition du doublon. Aucun appel aux API fournisseurs.

Audit reproductible : node --use-system-ca scripts/experiments/audit-offer-duplicates.mjs ; ajouter --apply pour masquer les doublons confirmés. Une copie privée avant traitement est conservée sous data/offer-deduplication. Le mode dry-run de l’import fournisseur ne simule pas la déduplication SQL ; utiliser le script d’audit pour les lignes déjà présentes.
