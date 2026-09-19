# Notifications du lot fictif historique

Décision utilisateur du 19 septembre 2026 : inhiber les notifications automatiques des missions fictives déjà injectées, en conservant le fonctionnement normal des nouvelles missions.

Le fichier `backend/src/notifications/muted-demo-missions.json` contient les 3 092 identifiants du reçu de production du 18 septembre à 07:32:29 UTC, avec son empreinte de dataset. Aucun nom, titre, établissement ou date de mission ne sert de filtre. Il ne contient ni identifiants de comptes ni secrets.

Les alertes MATCH, REMINDER et MISSION_PUBLISHED de ces missions sont inhibées : sélection SQL avant pagination des rappels, génération de matching après modification du profil, distribution vers n8n, traitement direct du webhook et envoi Discord d'une ancienne notification encore en attente. Le lot ne consomme donc plus les créneaux de dispatch n8n réservés aux nouvelles missions. Les anciens événements restent dans l'historique ; le filtre les rend inéligibles au dispatch.

Les missions restent visibles, leur score est calculable et les candidatures, affectations, confirmations, annulations, PDF et emails transactionnels conservent leur comportement. Les notifications internes déjà créées ne sont pas effacées et les messages déjà envoyés ne peuvent pas être rappelés.

Une nouvelle mission avec un nouvel identifiant reste notifiée, même avec le même titre et la même description. Rejouer exactement le précédent import avec les mêmes clés d'idempotence réutilise les anciennes missions : ce n'est pas un nouveau lot et elles restent inhibées. Ne pas ajouter automatiquement de nouveaux identifiants à ce fichier.

Aucune migration SQL n'est nécessaire : le correctif est compatible avec le schéma actuel, même si Neon est inaccessible au moment du déploiement. Il prendra effet quand l'API pourra de nouveau accéder à la base. Il ne rembourse pas les quotas déjà consommés.

Validation : six tests d'intégration sur PostGIS isolé (dont 26 missions inhibées pour dépasser la taille d'un lot de rappels, une nouvelle mission et une livraison Discord simulée), puis onze tests existants sur les notifications, confirmations, annulations et PDF/emails. Aucun message réel envoyé pendant ces tests.

## Purge des anciennes alertes

L'opérateur peut exécuter `node scripts/vault/purge-demo-alerts.mjs` pour consulter les compteurs, puis ajouter `--apply` pour la purge autorisée. Le backend doit être compilé et le coffre local accessible depuis ce checkout. Le script utilise uniquement les identifiants de la liste historique, jamais toutes les anciennes missions.

La purge travaille par transactions limitées à 500 alertes, 500 anciennes livraisons Discord et 500 événements de matching, avec un maximum de 20 lots par lancement. Elle supprime les alertes MATCH/REMINDER/MISSION_PUBLISHED et leurs livraisons associées ; elle clôture les événements de matching encore en attente et conserve leur reçu pour éviter un rejeu. Elle ne supprime ni missions ni comptes ni profils ni candidatures ni affectations ni documents. Elle préserve les notifications transactionnelles, les livraisons SENDING/UNCERTAIN et les événements dont le traitement est encore loué à un worker.

Le mode aperçu ne modifie rien. Un échec annule le lot entier. Les lignes de livraison sont verrouillées et revérifiées avant suppression pour conserver un envoi ayant commencé entre la sélection et le verrouillage. Les lots appliqués sont enregistrés dans l'audit sans recopier les messages ni données personnelles.

Six tests d'intégration PostGIS couvrent l'aperçu, le rollback, les données métier et PDF inchangés, la préservation des nouvelles missions et confirmations/annulations, la concurrence avec un envoi et la limite de lot. La suppression rend l'espace réutilisable par PostgreSQL ; elle ne garantit pas une baisse immédiate de la taille physique et ne restitue pas de quota de calcul/transfert consommé.

Tentative de production du 19 septembre 2026 : refus de connexion Neon SQLSTATE 53000 avant toute transaction. Aucun enregistrement de production supprimé. Le script reste prêt pour l'accès rétabli ou pour une copie récente validée sur Supabase.
