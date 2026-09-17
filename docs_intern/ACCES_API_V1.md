# Accès API — état au 14 septembre 2026
Cette vérification est documentaire. Aucun jeton ni clé propre au projet n’a été trouvé ou utilisé ; aucun appel authentifié ni import produit n’est déclaré réussi. Le dossier contient des documents, pas d’application ou de configuration de secrets. Ne pas envoyer de secrets dans les notes ou messages.

| Source | Vérifié | Reste à réaliser |
|---|---|---|
| France Travail | Fiche officielle accessible, recherche/détail/référentiels décrits, demande d’accès proposée | Accès développeur du projet, authentification, appel borné, réponse, conditions et pagination |
| Annuaire Santé | Guide officiel accessible, compte Gravitee, application et souscription nécessaires à une clé ESANTE-API-KEY | Fournir la clé dans le gestionnaire de secrets local, appel exact RPPS, lecture d’une réponse exploitable |
| FINESS | Fiche ANS accessible, JSON compressé, structures géographiques/juridiques et licence décrits | Téléchargement choisi, validation du schéma, normalisation et usage dans l’interface |

Sources consultées :
- [France Travail](https://www.data.gouv.fr/dataservices/api-offres-demploi)
- [Clé ANS](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/getting-started/get-api-key.html)
- [FINESS](https://www.data.gouv.fr/datasets/finess-structures-1)

Procédure de preuve : enregistrer le nom de l’opération, date, version, statut HTTP, schéma et nombre de résultats, sans token ni coordonnées personnelles inutiles. Pour RPPS, distinguer appel réel autorisé et fixtures fictives ; aucun numéro de personne réelle ne doit être assigné à un faux compte de démonstration comme preuve d’identité.

Un refus d’authentification n’est pas une preuve de contrôle RPPS. Timeout, quota, clé invalide et réponse invalide produisent PENDING avec motif technique. Une absence de résultat ne vaut NOT_FOUND qu’après une recherche exacte valide.

Les conditions juridiques complètes des fournisseurs et les quotas propres à l’abonnement restent à vérifier lors de la souscription. Aucun compte externe créé, aucune souscription ni condition contractuelle acceptée au nom de l’équipe pendant cette passe.
