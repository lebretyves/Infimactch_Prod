# Inventaire des anciennes missions fictives — 17 septembre 2026

À la demande de l’utilisateur, un agent indépendant a recherché le lot d’annonces et le PDF évoqués dans l’historique. Deux sauvegardes antérieures au nettoyage contiennent 49 identifiants de mission distincts (5 et 44). Toutes les missions sont rattachées au FINESS de test `000000001` : aucun rattachement à un vrai FINESS n’est confirmé dans ce lot.

Le rapport `docs/NETTOYAGE_TESTS_2026-09-16.md` documente leur suppression le 16 septembre. Le diagnostic du 17 septembre consigné dans `docs/history/IMPLEMENTATION.md` précise qu’aucun nouveau lot fictif FINESS ni PDF de missions n’avait été généré. Aucun PDF antérieur correspondant n’a été retrouvé. La production actuelle n’a pas été interrogée dans cet inventaire.

Un nouveau PDF documentaire de 7 pages a été créé : `Inventaire_49_missions_fictives_2026-09-17.pdf`. Il contient les 49 identifiants, intitulés, qualifications, services, dates, établissements fictifs, FINESS de test, anciens statuts et sources. Contrôle automatique : les 49 identifiants complets sont présents dans le texte extrait. Les deux premières pages ont été rendues et vérifiées visuellement. Aucune mission n’a été créée ni restaurée ; aucun compte, contact privé ou secret n’est inclus.

Sources locales consultées :
- `backups/nettoyage-tests-1789511364777/database-fixtures.json` (16 septembre 00:29 Europe/Paris)
- `backups/nettoyage-tests-1789511635783/database-fixtures.json` (16 septembre 00:33 Europe/Paris)
- `InfiMatch/docs/NETTOYAGE_TESTS_2026-09-16.md`
- `InfiMatch/docs/history/IMPLEMENTATION.md`, diagnostic du 17 septembre
- `InfiMatch/backend/src/demo/seed.ts`
- `infiMatch-front-end/scripts/capture-catalogue.mjs`

Ne pas présenter les anciens statuts OPEN/DRAFT/FILLED/COMPLETED comme un état actuel en production. Ne pas présenter cet inventaire comme le lot demandé avec de vrais FINESS.
