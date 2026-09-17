# Conservation, cloture et restauration ? preparation pour utilisateurs reels

Statut : mecanismes techniques prepares ; politique a faire valider par le responsable du traitement avant exploitation reelle. Aucune purge automatique activee pendant ce lot. Ce document ne certifie pas la conformite du service.

## Principes et decisions

Distinguer base active, archivage restreint et sauvegardes. Justifier chaque duree par sa finalite et, le cas echeant, les obligations applicables a la plateforme, aux agences ou aux employeurs. La plateforme n est pas automatiquement l employeur. Une confirmation PDF de POC n est pas un bulletin de paie ni un contrat signe.

| Donnees | Traitement propose | Decision encore necessaire |
|---|---|---|
| Compte et profil | Conserves pendant le service ; demande de cloture authentifiee, examen operateur, desactivation et effacement des champs directs | Definition de l inactivite, information des personnes, responsable et canal de contact |
| Candidatures / vivier | Distinguer suivi d une candidature et conservation pour opportunites futures | Applicabilite du referentiel recrutement, base juridique, dernier contact et information/accord ; ne pas appliquer deux ans a toutes les tables |
| Missions / affectations / confirmations | Historiques conserves jusqu a politique explicite ; acces limite aux personnes habilitees | Obligations des parties, contentieux et gel de suppression, archive restreinte et terme de conservation |
| RIB et justificatifs | Effacement des pieces privees du compte lors de cloture selon decision operateur ; anciennes pieces bancaires candidates a nettoyage apres 30 jours | Besoin reel de collecte et duree justifiee ; ne pas stocker de donnees inutiles |
| Notifications | Reglage technique actuel : 90 jours | Valider pour notifications internes ; Teams possede une conservation distincte |
| Audit | Reglage technique actuel : 365 jours ; details personnels retires lors de cloture | Besoin de securite/preuve, droits d acces, risque de perte de preuves et exceptions |
| Matching MongoDB | Reglage technique actuel : 30 jours | Valider besoin d explication et traitement des demandes en cours |
| Fichiers STAGING | Nettoyage apres 24 h, sauf confirmations gerees par leur cycle | Reprise des ecritures et verrouillage ; valeur technique a documenter |
| Sauvegardes | Rotation technique proposee : 30 jours, garder au moins deux sauvegardes completes | Valider frequence et duree ; minimum de deux copies peut prolonger la conservation si backups arretes, alerter et ne pas promettre une borne stricte de 30 jours |
| Registre d effacement | Conservation separee pour rejouer les effacements apres restauration | Duree couvrant les sauvegardes recuperables, UUID toujours donnee personnelle, acces restreint |

## Garde-fou historique metier

BUSINESS_HISTORY_RETENTION_DAYS est vide par defaut : aucune suppression automatique de mission/affectation historique. La valeur 365 du POC n est plus une valeur implicite. Une valeur entiere positive ne doit etre renseignee qu apres validation de la politique et traitement des gels/contentieux. Ne pas activer cette purge pour de vrais historiques avant ces validations.

## Cloture

API authentifiee GET/POST/DELETE /api/v1/me/closure-request. Demande puis approbation explicite via CLI ; approbation journalisee. La CLI est reservee a l operateur autorise, pas au navigateur.

Avant approbation : verifier la demande, les missions en cours, les organisations partagees, les obligations de conservation et les eventuels gels. Ne pas demander systematiquement une piece d identite supplementaire a un utilisateur deja authentifie.

La fermeture supprime les sessions, l association Google, les favoris, notifications et pieces privees concernees, desactive les affiliations et remplace les donnees du profil/compte. Elle ne supprime pas automatiquement les historiques de mission ni leurs PDF et ne doit pas etre presentee comme une anonymisation integrale.

L effacement SQL et la file document_erasure sont commits ensemble. Si le disque est indisponible ensuite, la file conserve les identifiants necessaires a la reprise. Une demande ne passe COMPLETED qu apres nettoyage de ses fichiers et de MongoDB. Un echec reste APPROVED pour reprise et ne bloque pas les autres demandes. Les messages d erreur de lot contiennent un code controle, pas des donnees privees.

Commandes : closure-requests ; approve-closure --request UUID ; process-closure-requests (simulation) ; process-closure-requests --apply (execution autorisee) ; retry-document-erasures (comptage) ; retry-document-erasures --apply (execution des effacements deja commits).

## Restauration

Sauvegardes SQL/MongoDB/documents/Vault/n8n et registre privacy. Le registre courant doit etre conserve independamment des sauvegardes anciennes. Restaurer hors ligne, appliquer migrations, verifier integrite et dechiffrement puis rejouer le registre courant avant toute reouverture. Le registre archive avec une sauvegarde ancienne ne remplace pas les demandes posterieures.

Le test --verify-erasure-replay choisit un compte dans la base restauree et ajoute son UUID a un registre de recette prive ; il verifie ensuite le compte desactive et l adresse neutralisee. Il ne modifie ni le compte source ni le registre courant. Les journaux de recette sont isoles dans data/security.

## Avant ouverture reelle

Nommer le responsable et l operateur ; valider le tableau et les textes utilisateur ; ajouter un moyen visible de demander la cloture ; definir suivi et reponse des demandes ; gerer les exceptions/contentieux ; etablir les droits sur archives et sauvegardes ; configurer une copie hors machine ; tester le parcours complet avec les dernieres migrations. Les envois Teams doivent rester minimaux et soumis aux regles de conservation du tenant Microsoft.

## Sources consultees

- CNIL, durees : https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- CNIL, recrutement : https://www.cnil.fr/fr/recrutement-et-donnees-personnelles-dans-les-tpepme-cinq-questions-incontournables-se-poser
- CNIL, referentiel RH : https://cnil.fr/fr/referentiel-durees-conservation-donnees-rh
- CNIL, sauvegardes : https://cnil.fr/fr/securite-sauvegarder
