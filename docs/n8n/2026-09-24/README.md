# Relances multicanales — cadence économique pour la soutenance

Décision du 24 septembre 2026 : conserver un passage toutes les **4 heures** pour préserver les crédits n8n Cloud avant la soutenance du 25 septembre.

- Export préparé : `relances-multicanales.json`, inactif, sans credential exporté.
- Un seul planificateur : 6 passages/jour, **180 exécutions sur 30 jours** (186 sur 31 jours), hors autres workflows, relais Discord et reprises.
- La cadence de production observée pendant l’audit était déjà de 4 heures. La proposition de 15 minutes n’a pas été activée.
- À la mise en service du nouveau workflow, remplacer le planificateur existant : ne pas activer deux planificateurs en parallèle.
- Missions non pourvues : seuil de 24 heures, trois rappels maximum ; passage normalement entre 24 et 28 heures, hors retard des services ou plafonds.
- Missions confirmées : contrôle du seuil J-1 ; H-2 uniquement si un passage tombe dans les deux dernières heures avant la mission. **Le rappel H-2 n’est pas garanti à cette cadence.** Aucune notification tardive après le début.
- Le code et l’export des nouvelles fonctionnalités sont préparés localement ; ce document ne constitue pas une preuve de déploiement.

Le dossier PDF et le schéma n8n dans `docs/rendu/2026-09-24/` reprennent cette décision.
