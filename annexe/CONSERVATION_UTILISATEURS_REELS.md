# Conservation des données — démonstration et éventuelle exploitation réelle

État au 21 septembre 2026. La politique pédagogique ci-dessous est décidée ; son échéance est septembre 2027 et son exécution reste à organiser. Ce document ne certifie pas une conformité globale et ne déclenche aucune suppression.

## Décisions retenues

- Projet de démonstration Epitech, sans activité réelle, avec données métier fictives selon la confirmation du porteur.
- Conservation des comptes et données de démonstration jusqu’à la fin de l’année scolaire, puis suppression. Les preuves conservées pour le rendu doivent être anonymisées. **Échéance confirmée : septembre 2027**. L’intervention reste à organiser à cette échéance ; aucune tâche de purge n’est annoncée comme déjà active.
- Dans le scénario, InfiMatch assure la mise en relation ; les agences emploient et paient. Le RIB reste facultatif avant et après première mission. La suggestion après première affectation ne bloque aucune action et ne transmet pas automatiquement le document aux agences.
- Domicile et GPS facultatifs ; la zone de travail est distincte du domicile et sert à la recherche et aux alertes. Les fonctions facultatives gardent leur choix propre.
- Les annonces et référentiels publics importés sont des sources externes réelles, distinctes des scénarios fictifs. Les coordonnées des membres et les journaux techniques ne deviennent pas anonymes du seul fait du caractère pédagogique du projet.

## Responsabilité et contact

Le porteur a répondu « Epitech » puis confirmé le cadre de démonstration. Aucun contact institutionnel n’a été fourni ; ne pas en inventer ni présenter une prise en charge formelle par l’établissement comme documentée. L’identité juridique et le rôle effectif du responsable restent à clarifier pour clôturer complètement ce point. Le contact de projet déjà publié est conservé : yleb.user@outlook.fr.

Le responsable effectif découle des décisions sur les finalités et moyens du traitement. Un rattachement pédagogique ou l’usage de données métier fictives ne suffit pas, à lui seul, à établir tous les rôles.

## Conservation dans le périmètre pédagogique

| Catégorie | Règle retenue ou seuil technique existant | Mise en œuvre et limite |
|---|---|---|
| Comptes, profils et justificatifs de démonstration | Fin de l’année scolaire en septembre 2027 puis suppression | Échéance fixée au mois de septembre 2027 ; documents entièrement fictifs pour les scénarios ; clôture individuelle disponible |
| RIB fictif facultatif | Même échéance ; versions remplacées candidates au nettoyage après 30 jours | Document privé du titulaire, aucun usage de paie par InfiMatch |
| Missions, candidatures, affectations et PDF fictifs | Fin de l’année scolaire en septembre 2027 puis suppression | Purge de fin de projet à préparer ; les historiques ne sont pas supprimés automatiquement aujourd’hui |
| Support de démonstration | Fin de l’année scolaire en septembre 2027 puis suppression, ou clôture individuelle effective | Conserver uniquement les preuves réellement anonymisées pour le rendu ; examiner séparément un éventuel incident réel |
| Notifications | Seuil technique existant de 90 jours | Maintenance ; copies emails/Discord à traiter séparément |
| Explications de matching | Seuil existant de 30 jours | TTL MongoDB et contrôle d’expiration à la lecture |
| Journaux d’audit | Seuil technique existant de 365 jours | La clôture pédagogique doit aussi examiner ces traces ; ne pas conserver des identifiants au seul motif qu’un plafond technique est plus long |
| Événements techniques terminés | Seuil existant de 30 jours | Liens et déduplication à préserver pendant les opérations actives |
| Documents temporaires non finalisés | Nettoyage après 24 heures, selon leur cycle | Reprise des écritures et verrouillage ; confirmations gérées séparément |
| Sauvegardes récentes | Rotation ciblant 30 jours lors de son exécution | Arrêt du poste : délai possible ; vérifier les copies récupérables lors de la clôture |
| Anciennes archives locales | Traitement distinct nécessaire | Contrôle du 23 septembre : cinq archives / 133 fichiers authentifiés et chiffrés ; aucun des cinq anciens dossiers en clair ne subsiste ; clé documentaire version 2, ancienne clé conservée pour récupération. Voir annexe/proofs/audit-final-20260923/legacy-archives.json. Leur conservation reste distincte de la rotation des sauvegardes récentes. |
| Registre d’effacement | Durée couvrant les sauvegardes récupérables | Séparé des anciennes sauvegardes ; accès restreint ; les UUID restent des données à protéger |
| Preuves du rendu | Conservation des éléments effectivement anonymisés | Retirer les identifiants, contacts, coordonnées, tokens et autres éléments réidentifiants ; un simple masquage visuel ou pseudonyme ne garantit pas l’anonymat |

Ces chiffres techniques ne sont pas tous des prescriptions de la CNIL. La décision de fin d’année est un choix du projet, distinct d’une durée légale universelle. La suppression finale devra couvrir les fichiers, métadonnées, copies utiles et traitements externes concernés ; aucune suppression déjà réalisée n’est affirmée.

## Bases, prestataires et éventuels utilisateurs réels

Les fonctions de compte/mise en relation et la sécurité avaient des bases proposées respectivement pour le service demandé et sa protection ; leur applicabilité au périmètre pédagogique et l’information des personnes restent à vérifier avec le responsable effectif. L’acceptation des CGU n’est pas un consentement général à tous les traitements.

Avant une exploitation réelle, établir séparément les durées par finalité : compte actif/inactif, suivi de candidature/vivier, justificatifs courants, historiques et pièces probatoires, support et incidents. Distinguer base active, archive restreinte et sauvegardes. Ne pas appliquer automatiquement à InfiMatch les durées RH ou de paie propres aux employeurs.

Le repère de deux ans pour certains viviers ne s’applique pas à toutes les tables. Le dernier contact doit avoir une définition vérifiable ; une mise à jour technique n’est pas nécessairement un contact. Identifier les pièces probatoires utiles, les habilitations, les éventuels gels/contentieux et les obligations applicables avant tout paramétrage.

Documenter les prestataires, régions effectives, accords et transferts. Le nom de l’hébergeur ne garantit pas un stockage en France. Le caractère fictif du scénario n’efface pas les éventuelles données personnelles des comptes ou journaux.

## Clôture et purge : état technique

`BUSINESS_HISTORY_RETENTION_DAYS` est vide par défaut. La maintenance technique exclut les historiques métier. La décision de fin d’année ne se traduit donc pas en un nombre de jours arbitraire dans cette variable.

API de demande : GET/POST/DELETE `/api/v1/me/closure-request`. La demande est authentifiée ; son traitement passe par l’opérateur habilité. Examiner les missions actives, les organisations partagées et les éventuelles obligations avant validation. Ne pas demander systématiquement une pièce d’identité supplémentaire à une personne déjà authentifiée.

La clôture supprime les sessions, associations et pièces privées concernées, désactive les affiliations et neutralise le profil/compte. Elle n’efface pas automatiquement tous les historiques de mission et leurs PDF : ne pas la présenter comme une anonymisation intégrale.

SQL et `document_erasure` sont enregistrés dans la même transaction. Les fichiers sont nettoyés après commit ; un échec reste reprenable. Les historiques MongoDB du compte sont retirés avant achèvement. Les demandes APPROVED/PROCESSING sont reprises ; les erreurs de lot ne révèlent pas le contenu privé.

Commandes existantes : `closure-requests`, `approve-closure --request UUID`, `process-closure-requests` (simulation), `process-closure-requests --apply`, `retry-document-erasures` (comptage), `retry-document-erasures --apply`. Ces commandes ne valent pas une purge générale de fin de projet et aucune n’a été lancée pour appliquer cette décision.

## Sauvegardes et restauration

Restaurer en environnement isolé, vérifier intégrité et déchiffrement, puis rejouer le registre courant d’effacement avant réouverture. Une copie ancienne du registre ne remplace pas les demandes ultérieures. Une copie chiffrée sur un second disque physique est vérifiée le 23 septembre. La restauration SQL, MongoDB et de cinq documents a réussi en isolation. La copie reste sur le même ordinateur et les clés de secours utilisent le profil Windows : une copie hors ordinateur et une récupération indépendante de ce profil restent à organiser.

Les tests de sécurité du 21 septembre prouvent les mécanismes isolés de stockage, accès et suppression ; ils ne prouvent pas la suppression future à l’échéance scolaire de septembre 2027. La clôture finale exigera sa propre preuve d’exécution sur le périmètre décidé.

## Références

- CNIL, responsable : https://www.cnil.fr/fr/definition/responsable-de-traitement
- CNIL, durées : https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- CNIL, recrutement : https://www.cnil.fr/fr/recrutement-et-donnees-personnelles-dans-les-tpepme-cinq-questions-incontournables-se-poser
- CNIL, sécurité et journaux : https://www.cnil.fr/fr/securite-tracer-les-operations
- CNIL, sauvegardes : https://www.cnil.fr/fr/securite-sauvegarder
