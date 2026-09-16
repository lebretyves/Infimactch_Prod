# Planification France Travail

Tache Windows : InfiMatch-FranceTravail-Import.
Tous les jours : 00h, 07h, 09h, 11h, 13h, 15h, 17h, heure Paris (fuseau Windows Romance Standard Time).
Commande : node scripts/vault/run.mjs cli import-offers --limit 10.
Chaque execution effectue une authentification puis 4 recherches, chacune limitee a 10 offres : infirmier, IDE, IADE, IBODE. Jusqu'a 40 offres avant dedoublonnage ; 28 recherches par jour, hors authentification.
Meme regles que JobsPipe : aucun rattrapage, aucune relance automatique, instances simultanees ignorees, limite de 5 minutes.
PC eveille, session Windows ouverte, Docker, PostgreSQL et Vault disponibles.
Journaux : data/security/france-travail/YYYY-MM.log.
Installation : scripts/security/install-france-travail-schedule.ps1.
La creation de la tache ne lance pas d'import fournisseur immediat.
