# InfiMatch ? pr?paration V2

Statut : dossier de pr?paration ; aucune fonctionnalit? V2 d?velopp?e ni livr?e par sa cr?ation.

## Point de d?part

La V2 prolonge le backend NestJS existant, ses bases PostgreSQL/PostGIS et MongoDB, ses ?v?nements et ses r?gles d?autorisation. Le code m?tier reste dans `backend/`. Ce dossier contient le cadrage et la recette future ; il ne contient pas de copie divergente du backend ni de secrets.

- [P?rim?tre et backlog](BACKLOG.md)
- [?volution d?architecture](ARCHITECTURE.md)
- [Crit?res de recette](RECETTE.md)
- [?tat et conditions de d?marrage](PASSATION.md)

Sources : `docs/DECISIONS_V1.md`, tableau de versions du prompt archiv? `docs/references/Interimatch_Sante_Mega_Prompt_Backend_V1.md`, d?cisions de conversation. L?ajout de Vault est un travail V1 autoris? le 15 septembre 2026.

L?objectif de conformit? de la V1 ne change pas. HTTPS de livraison, contr?le d?exp?rience pr?alable applicable, droits minimaux, idempotence documentaire et restauration compl?te ne deviennent pas des t?ches V2 parce que ce dossier existe.
