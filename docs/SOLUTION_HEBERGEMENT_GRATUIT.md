# Solution gratuite candidate pour une application autonome

Recherche du 16 septembre 2026. Proposition non encore provisionnee.

Recommandation pour la demonstration V1 : frontend Vercel, API + worker + PostgreSQL/PostGIS + MongoDB + n8n + HashiCorp Vault + documents sur une VM Oracle Always Free. Routage /api du frontend vers API HTTPS pour conserver les cookies de session. Cette variante place aussi l API hors Vercel afin de conserver le stockage documentaire partage et le chargement Vault avec moins de modifications. A faire valider explicitement.

La documentation Oracle annonce 2 OCPU ARM et 12 Go RAM (1500 OCPU-heures et 9000 Go-heures mensuels), 200 Go de volumes cumules et cinq sauvegardes de volumes. Capacite regionale non garantie ; reclamation possible des VM inactives ; aucun SLA gratuit. Ce sont les ressources Always Free, pas les credits temporaires de 30 jours. Aucun compte payant a activer automatiquement.

Verification concrete : postgis/postgis:17-3.5 ne presente que linux/amd64 dans le manifeste inspecte. Il faudra une image ARM verifiee ou une construction PostGIS compatible, puis tester restauration et extensions. Ne pas copier aveuglement les images actuelles sur A1.

La pile conserve n8n et HashiCorp Vault existants ; le service Oracle Vault n est pas leur remplacement implicite. Teams necessitera une application Microsoft et les droits du compte/tenant, sans promesse de licence Microsoft incluse.

Render gratuit : veille apres 15 minutes et absence de disque persistant, inadapte a cette pile telle quelle. Koyeb gratuit : mise en veille et ressources limitees, pas retenu pour heberger toute la pile. Vercel Hobby : usage personnel/non commercial et quotas, a verifier selon l usage reel.

Avant creation : compte Oracle, capacite Always Free dans region choisie, conditions de verification du compte, domaine HTTPS, sauvegardes independantes et choix de migration des donnees. Objectif 0 euro sous quotas ; aucune garantie de disponibilite continue gratuite.

Sources :
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://www.oracle.com/cloud/free/faq/
- https://render.com/docs/free
- https://www.koyeb.com/docs/run-and-scale/scale-to-zero
- https://vercel.com/legal/terms
- https://docs.n8n.io/integrations/builtin/credentials/microsoft/
