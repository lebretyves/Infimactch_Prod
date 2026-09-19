# Notifications du lot fictif historique

Décision utilisateur du 19 septembre 2026 : inhiber les notifications automatiques des missions fictives déjà injectées, en conservant le fonctionnement normal des nouvelles missions.

Le fichier `backend/src/notifications/muted-demo-missions.json` contient les 3 092 identifiants du reçu de production du 18 septembre à 07:32:29 UTC, avec son empreinte de dataset. Aucun nom, titre, établissement ou date de mission ne sert de filtre. Il ne contient ni identifiants de comptes ni secrets.

Les alertes MATCH, REMINDER et MISSION_PUBLISHED de ces missions sont inhibées : sélection SQL avant pagination des rappels, génération de matching après modification du profil, distribution vers n8n, traitement direct du webhook et envoi Discord d'une ancienne notification encore en attente. Le lot ne consomme donc plus les créneaux de dispatch n8n réservés aux nouvelles missions. Les anciens événements restent dans l'historique ; le filtre les rend inéligibles au dispatch.

Les missions restent visibles, leur score est calculable et les candidatures, affectations, confirmations, annulations, PDF et emails transactionnels conservent leur comportement. Les notifications internes déjà créées ne sont pas effacées et les messages déjà envoyés ne peuvent pas être rappelés.

Une nouvelle mission avec un nouvel identifiant reste notifiée, même avec le même titre et la même description. Rejouer exactement le précédent import avec les mêmes clés d'idempotence réutilise les anciennes missions : ce n'est pas un nouveau lot et elles restent inhibées. Ne pas ajouter automatiquement de nouveaux identifiants à ce fichier.

Aucune migration SQL n'est nécessaire : le correctif est compatible avec le schéma actuel, même si Neon est inaccessible au moment du déploiement. Il prendra effet quand l'API pourra de nouveau accéder à la base. Il ne rembourse pas les quotas déjà consommés.

Validation : six tests d'intégration sur PostGIS isolé (dont 26 missions inhibées pour dépasser la taille d'un lot de rappels, une nouvelle mission et une livraison Discord simulée), puis onze tests existants sur les notifications, confirmations, annulations et PDF/emails. Aucun message réel envoyé pendant ces tests.
