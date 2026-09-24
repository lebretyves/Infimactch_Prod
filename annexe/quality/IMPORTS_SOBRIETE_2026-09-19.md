# Imports externes : horaires et sobriété

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

Configuration validée le 19 septembre 2026. Remplace les horaires Windows historiques et les imports n8n toutes les 30 minutes / à 04:15.

- France Travail : 07:00 et 15:00, Europe/Paris (été/hiver automatique).
- JobsPipe : 07:00, Europe/Paris. Le quota fournisseur épuisé conserve la suspension jusqu'au mois suivant, sans appel à son API.
- Le workflow n8n de 30 minutes garde la file d'événements et les rappels, mais aucun import. Les missions internes restent événementielles.
- Les tâches Windows `InfiMatch-FranceTravail-Import` et `InfiMatch-JobsPipe-Import` sont à désactiver lors de l'installation. Leurs anciens installateurs refusent maintenant de recréer un double planning.

## Collecte et limites

Une exécution traite un fournisseur. Les pages sont sauvegardées transactionnellement et reprises dans la même exécution n8n seulement si l'API renvoie IN_PROGRESS. Limites : 12 pages et environ 70 secondes par lot backend ; 20 lots maximum dans n8n ; deux reprises supplémentaires après RETRY_REQUIRED, espacées de cinq minutes ; une reprise HTTP en cas d'échec réseau. Un lot peut donc faire plusieurs appels fournisseur. Un quota épuisé, une source désactivée ou déjà à jour arrête la boucle. Le checkpoint reste conservé si la limite est atteinte ; la collecte continue au prochain créneau, sans redémarrer ses pages.

France Travail : collecte complète le matin pour voir aussi les modifications des anciennes offres ; l'après-midi, nouveautés créées depuis le début de la collecte du matin, avec dix minutes de recouvrement. Les modifications d'une ancienne offre peuvent donc attendre le lendemain matin. Si la collecte du matin manque, l'après-midi fait une collecte complète. Une collecte inachevée conserve ses pages, même entre deux créneaux. L'absence dans un import partiel ne prouve jamais la fermeture.

JobsPipe : conserve la découverte incrémentale quotidienne, la réconciliation mensuelle et la vérification des anciennes offres par lots à échéance de sept jours. Un contrôle ponctuel ne garantit pas de vérifier toutes les offres exactement chaque septième jour. Un changement de clé sur le même compte ne remet pas son quota à zéro.

Parsing : réutilisation du résultat si contenu et version du parseur sont identiques, avant de lancer le parseur. Les dates de fraîcheur restent actualisées ; les offres modifiées et les nouvelles versions du parseur sont analysées. Pas de réparation géographique sur un import à zéro annonce acceptée. Aucun calcul carbone n'est revendiqué.

## Vérification et installation

- Tests unitaires backend, créneaux Paris et changements été/hiver inclus.
- Tests PostgreSQL isolés : import/reprise, rollback, fermeture préservée, dédoublonnage, réutilisation et invalidation du parsing.
- `node --test scripts/n8n/offer-schedules.test.mjs` : horaires, routes distinctes, limites, retrait des imports du workflow de rappels.
- Déployer d'abord le backend incluant `POST /internal/automation/jobs/refresh-offers/:provider`.
- `node scripts/vault/configure-offer-refresh.mjs` prépare les exports sans changer n8n ; `--apply` publie seulement les trois workflows concernés avec leur credential existant.
- Les erreurs de publication sont explicites : vérifier que la version active correspond à la version enregistrée.