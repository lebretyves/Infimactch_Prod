# Conservation, cloture et restauration ? preparation pour utilisateurs reels

Statut : mecanismes techniques prepares ; politique a faire valider par le responsable du traitement avant exploitation reelle. Aucune purge automatique activee pendant ce lot. Ce document ne certifie pas la conformite du service.


## Décisions confirmées le 20 septembre 2026

InfiMatch assure uniquement la mise en relation. Les agences sont employeurs et paient les intérimaires. Les obligations propres à la paie ne s’appliquent donc pas automatiquement à tous les documents détenus par InfiMatch.

Le RIB est facultatif avant et après la première mission. L’invitation après première affectation est conservée (`suggested`), sans obligation (`required: false`) ni blocage de candidature ou de mission. Le dépôt reste volontaire dans l’espace personnel. Cette fonction ne transmet pas automatiquement le RIB aux agences ; l’accès applicatif est limité au titulaire. Toute collecte pour le compte d’une agence nécessiterait de définir cette finalité et les rôles correspondants.

Le domicile et le GPS sont facultatifs à l’inscription. La zone de travail, enregistrée séparément, sert aux recherches et alertes. Les CGU restent à accepter ; l’information sur les données remplace le consentement global obligatoire. Les fonctions facultatives restent indépendantes.

Epitech n’a pas confirmé être responsable du traitement (confirmation du porteur du projet). Epitech reste mentionné comme rattachement pédagogique. L’identité juridique du responsable effectif est donc encore à établir ; aucune responsabilité n’est attribuée arbitrairement à l’établissement.

### Conservation par finalité

| Catégorie | Cadre CNIL et application | État / limite |
|---|---|---|
| Compte actif | Données nécessaires au service demandé | Clôture disponible ; ne pas appliquer la durée d’une candidature à toutes les données du compte |
| Vivier de candidats non retenus | Repère CNIL : jusqu’à 2 ans après le dernier contact, avec information et base légale appropriée | Pas de dernier contact de vivier fiable identifié ; ne pas utiliser une mise à jour technique comme contact ni improviser une purge générale |
| Preuves de recrutement | Référentiel RH 2026 : archivage probatoire distinct, notamment 5 ans à partir du poste pourvu pour actions en discrimination | Définir les seules pièces nécessaires et les habilitations ; ne pas prolonger le matching actif à ce titre |
| Diplômes / justificatifs | Pièces nécessaires aux qualifications recherchées ; accès restreint, versions inutiles à écarter | Effacement des pièces privées lors de clôture validée ; préciser durée propre aux pièces actives |
| RIB volontaire | Document personnel facultatif, aucun usage de paie par InfiMatch | Suggestion après première mission ; versions remplacées 30 jours ; effacement à clôture validée |
| Journaux de sécurité | Recommandation générale CNIL : 6 à 12 mois, exceptions documentées | Seuil technique existant 365 jours ; mesures spécifiques à définir pour les preuves d’incidents |
| Notifications / explications | Durées opérationnelles distinctes des archives légales | Seuils existants 90 / 30 jours, non présentés comme des obligations CNIL |
| Support | Temps nécessaire à la demande puis preuves justifiées | Suppression à clôture ; durée hors clôture à définir, pas de chiffre universel CNIL |
| Sauvegardes | Rotation, accès restreint, respect de l’effacement à restauration | Cible 30 jours mais minimum deux copies : ne pas annoncer une limite absolue si sauvegardes interrompues |

### Bases et responsabilités

- Fonctions de compte et mise en relation demandées : exécution du service contractuel ou mesures précontractuelles appropriées, uniquement les données nécessaires.
- Sécurité : intérêt légitime de protection des comptes ; analyse de nécessité et mise en balance à documenter.
- Fonctions facultatives : choix propre à chaque fonction ; CGU et consentement ne se confondent pas.
- Agences : responsabilités propres pour recrutement, emploi et rémunération, selon leurs décisions effectives.
- Prestataires : contrats, sous-traitants ultérieurs, régions réelles et transferts à documenter. Le nom d’un hébergeur ne garantit pas une résidence française des données.

Restent à établir : responsable juridique, dernier contact de vivier et information correspondante, accès aux archives, pièces probatoires, gels de litige, durée du support et procédure complète de restauration. Aucune purge destructive de données réelles n’a été exécutée. Les adaptations de collecte ne valent pas validation globale de la politique.

Sources consultées le 20 septembre 2026 :
- https://www.cnil.fr/fr/recrutement-et-donnees-personnelles-dans-les-tpepme-cinq-questions-incontournables-se-poser
- https://www.cnil.fr/sites/default/files/2026-04/referentiel_durees_de_conservation_gestion_des_ressources_humaines.pdf
- https://www.cnil.fr/fr/securite-tracer-les-operations
- https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role

## Principes et decisions

Distinguer base active, archivage restreint et sauvegardes. Justifier chaque duree par sa finalite et, le cas echeant, les obligations applicables a la plateforme, aux agences ou aux employeurs. La plateforme n est pas automatiquement l employeur. Une confirmation PDF de POC n est pas un bulletin de paie ni un contrat signe.

| Donnees | Traitement propose | Decision encore necessaire |
|---|---|---|
| Compte et profil | Conserves pendant le service ; demande de cloture authentifiee, examen operateur, desactivation et effacement des champs directs | Definition de l inactivite, information des personnes, responsable et canal de contact |
| Candidatures / vivier | Distinguer suivi d une candidature et conservation pour opportunites futures | Applicabilite du referentiel recrutement, base juridique, dernier contact et information/accord ; ne pas appliquer deux ans a toutes les tables |
| Missions / affectations / confirmations | Historiques conserves jusqu a politique explicite ; acces limite aux personnes habilitees | Obligations des parties, contentieux et gel de suppression, archive restreinte et terme de conservation |
| RIB et justificatifs | Effacement des pieces privees du compte lors de cloture selon decision operateur ; anciennes pieces bancaires candidates a nettoyage apres 30 jours | Besoin reel de collecte et duree justifiee ; ne pas stocker de donnees inutiles |
| Notifications | Reglage technique actuel : 90 jours | Valider pour notifications internes ; Discord et les emails ont leurs propres copies |
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
