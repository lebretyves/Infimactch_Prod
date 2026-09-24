# Audit des notifications, relances et emails — 24 septembre 2026

## Verdict

Les relances de missions non pourvues sont actives dans l’application. Le contrôle programmé a réellement été exécuté en production. Elles ne sont pas envoyées par email (fonction absente) et aucune destination Discord d’organisation n’est configurée pour les recevoir.

Audit en lecture seule : aucun message envoyé, aucune relance forcée, aucune préférence ou configuration modifiée. Les tests ont utilisé des services isolés et des API simulées. Les horodatages ci-dessous sont en heure de Paris (UTC+2).

## Périmètre et preuves

- Lecture agrégée de la base de production le 24/09 à 07:51, code backend, export n8n du 23/09, journaux d’exécution et tests.
- Déploiements GitHub Production les plus récents consultés : backend et frontend associés à `53c09bd6faf0afff4cbb03f39ba9de3dd02e1bc2`. Cela identifie le déploiement enregistré, sans attester chaque variable d’environnement courante.
- Code testé : branche documentaire issue de ce commit ; sources backend des notifications identiques à Epitech main `856ff02ab53a24940b4be24c18c0a71ac5f48f24` lors de la comparaison. Epitech contient des modifications frontend supplémentaires, notamment ouverture initiale du panneau d’activité, non incluses dans les deux scénarios frontend exécutés ici.
- L’interface n8n Cloud n’a pas été relue aujourd’hui : les traces backend prouvent les passages effectifs, mais ne recensent pas les erreurs éventuelles intervenues avant l’appel au backend.

## Relances programmées

| Contrôle | Résultat |
|---|---|
| Dernier passage vérifié | 24/09 à 04:00:57, terminé |
| Cadence observée | Toutes les 4 heures ; passages précédents à 00 h, 20 h, 16 h, 12 h et 08 h |
| Volume sur 7 jours | 87 passages de l’action reminders enregistrés comme terminés |
| Notifications de rappel présentes | 3 au total, dont 2 sur les dernières 24 h |
| Dernier rappel créé | 23/09 à 16:00:57 |
| Missions avec rappels autorisés | 5, dont 2 avec début futur |
| Missions éligibles à l’instant de lecture | 0 ; les 2 futures attendaient le délai de 24 h depuis leur dernier rappel |
| Anciennes missions OPEN sans rappel | 2 986, dont 2 600 futures : exclusion prévue par la migration |

Conditions cumulatives : mission ouverte, début futur, rappels autorisés, première publication depuis au moins 24 h, dernier rappel depuis au moins 24 h, moins de 3 rappels déjà effectués, mission hors démonstrations exclues. Limites : 25 missions par lot, plafond horaire global de 100 destinataires et 100 missions. Les destinataires sont les membres actifs des agences/établissements concernés, pas les candidats infirmiers.

La migration désactive intentionnellement les rappels sur les anciennes missions ; le défaut est activé pour les nouvelles. Avec un passage toutes les 4 h, le délai réel nominal est de 24 à 28 h après publication ou dernier rappel, sous réserve des plafonds et de disponibilité des services.

Il n’existe pas de relance email des missions non pourvues, ni de rappel programmé J-1/H-2 avant prise de poste identifié dans ce code. Le worker local traite les files d’envoi, mais ne déclenche pas lui-même le calcul des rappels : celui-ci dépend de n8n.

## Canaux et événements

| Événement | Application / Discord | Email |
|---|---|---|
| Mission compatible | Application ; Discord personnel si critères et préférences satisfaits | Non |
| Mission non pourvue | Application ; Discord d’organisation si configuré | Non |
| Publication et modification de besoin/mission | Application ; Discord selon destination et événements sélectionnés | Non |
| Candidature envoyée, présélectionnée, refusée, retirée | Application ; Discord selon préférences et rôle | Non |
| Affectation confirmée | Application ; Discord ; document généré | Oui, confirmation avec PDF |
| Annulation | Application ; Discord selon contexte | Oui lorsqu’un dossier d’affectation annulée existe |
| Mission pourvue ou terminée | Application ; Discord selon destinataire | Non |
| Bienvenue, résultat RPPS, association Discord, clôture du compte | Application ; Discord personnel selon événement | Pas d’email métier identifié |
| Récupération d’accès | Parcours dédié | Oui, lien valable 30 minutes |

Les préférences Discord ne désactivent pas les emails transactionnels. L’import d’offres externes ne constitue pas une campagne email ou une relance automatique des candidats.

### Discord en production

- 3 associations Discord et 3 destinations personnelles activées ; aucune destination d’organisation.
- 31 livraisons au statut SENT, dont 17 candidatures envoyées, 4 confirmations, 2 présélections, 2 refus, 2 retraits, 1 annulation, 1 modification, 1 mission pourvue et 1 résultat RPPS.
- Dernier envoi enregistré : 23/09 à 20:43.
- Aucun rappel Discord enregistré. Aucune livraison PENDING, SENDING, FAILED ou UNCERTAIN au moment du contrôle.
- Les contrôles de compte actif, appartenance à l’organisation, préférences, version de mission et admissibilité sont revérifiés avant envoi. Les envois ambigus ne sont pas rejoués aveuglément.

### Emails en production

- 8 confirmations et 2 annulations au statut SENT : le fournisseur a accepté leur envoi.
- Les 10 restent NOT_REPORTED pour la livraison. Aucun événement de livraison/bounce n’est enregistré dans la table de suivi.
- Aucun email métier en attente, en échec ou incertain dans la file observée.
- Récupération d’accès : 3 demandes ACCEPTED et 1 UNCERTAIN historique du 21/09. Ce dernier statut ne prouve ni un échec ni une réception et ne fait pas l’objet d’une réexpédition automatique.
- Après autorisation explicite, consultation SMTP2GO en lecture seule : les recherches des 10 messages ont renvoyé HTTP 400. Une vérification ciblée a confirmé `E_ApiResponseCodes.ENDPOINT_PERMISSION_DENIED` pour l’historique et la consultation des webhooks. La clé actuelle ne permet pas cet audit fournisseur. Aucun droit n’a été modifié.
- La présence d’une clé SMTP et du secret webhook dans Vault est confirmée, sans publication de leurs valeurs. Cela ne prouve pas que le webhook est correctement déclaré chez le fournisseur.

Le code possède un callback de livraison authentifié, dédupliqué et corrélé au message/destinataire. Sa couverture par les tests ne remplace pas la preuve de son raccordement en production. Une livraison au serveur destinataire ne prouverait pas à elle seule la lecture humaine.

## Réserves et actions recommandées

1. **Suivi email incomplet en production** : consulter SMTP2GO avec un accès autorisé à l’historique et aux webhooks ; vérifier URL, authentification et événements configurés. Ne pas conclure que les emails sont perdus ou que le webhook est absent sur la seule absence de retours.
2. **Relances externes non actives pour les organisations** : configurer une destination d’organisation et l’événement REMINDER si ce canal est souhaité. Le canal personnel d’un infirmier ne remplace pas cette destination.
3. **Relance email absente du périmètre implémenté** : développer explicitement cette fonction si elle est attendue ; ce n’est pas un simple interrupteur actuellement désactivé.
4. **Délai de traitement potentiel** : le workflow périodique lance dispatch avant reminders, sans dispatch après création des rappels. Un message nouvellement mis en file peut attendre le prochain cycle de 4 h ou une action utilisateur. Les lots de ce parcours sont limités à 1 événement, 3 emails et 5 notifications ; vérifier le dimensionnement avant montée en charge. Aucun engorgement effectif observé ici.
5. **Libellé n8n trompeur** : le nœud mentionne 30 minutes alors que sa configuration est de 4 heures. Aligner son nom avec sa cadence.
6. **Texte d’annulation dégradé** : `backend/src/automation/automation.module.ts:37` contient littéralement « a ?t? annul?e » pour un destinataire infirmier. Corriger les accents.

L’unique événement de publication resté en attente appartient à une mission de démonstration explicitement neutralisée ; il n’est pas compté comme panne du traitement. Aucun événement épuisant les cinq tentatives n’a été observé.

## Tests et limites du résultat

- **76/76 tests unitaires ciblés réussis** : rappels, permissions, format Discord, dispatch, emails, retours de livraison et récupération d’accès.
- **81/81 tests d’intégration réussis**, répartis dans 9 suites : notifications (5), emails métier (6), livraison (5), récupération (8), garde-fous mission (8), parcours (32), suppression des alertes de démo (6), purge démo (6), support (5).
- **2 scénarios automatisés d’interface réussis** : lecture automatique des notifications et liens directs ; panneaux agence/établissement, clavier, état de formulaire, erreurs/reprises et responsive. API simulées, aucun message réel.
- Validation isolée PASS : PostgreSQL, MongoDB, n8n local, migrations, OpenAPI et régressions de sécurité. Services temporaires nettoyés après exécution.

Total : **157/157 tests backend ciblés réussis**, plus les deux scénarios frontend. Ce taux de réussite de 100 % n’est pas un taux de couverture du code ; aucun nouveau pourcentage global de coverage n’est revendiqué. Il ne certifie pas la livraison réelle des emails.

## Sources dans le dépôt

- `backend/src/automation/reminders.ts` : critères et quotas.
- `backend/src/database/mission-guardrails.ts` : activation des nouvelles missions et exclusion de l’historique.
- `backend/src/automation/automation.module.ts` : événements et destinataires.
- `backend/src/automation/mission-mail.ts` et `backend/src/auth/recovery-mail.ts` : envois email.
- `backend/src/automation/email-delivery.ts` : suivi de livraison.
- `backend/src/notifications/notifications.module.ts`, `catalog.ts`, `discord-client.ts` : préférences, événements et transport.
- `backend/src/database/notification-center.ts` : mise en file des destinations.
- `docs/n8n/published-20260923/` : exports n8n examinés.
- `frontend/scripts/test-notification-read.mjs` et `test-establishment-notification-panels.mjs` : scénarios frontend.

Preuves de cette exécution : `preuves-tests.json` à côté de ce rapport. Journaux détaillés locaux : `E:/Interimatch/audits/notifications-20260924/`. Les identifiants de messages, données personnelles et secrets ne sont pas recopiés dans le rapport.
