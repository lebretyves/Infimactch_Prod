# Reprise backend V1
Date : 14 septembre 2026.

## État réel
Dossier documentaire uniquement : aucun package.json ni dépôt Git à la racine, aucun code applicatif détecté lors de cette passe. Aucun test applicatif ni coverage exécuté. Aucun accès fournisseur authentifié prouvé.

## Décisions
Nouvelle numérotation Word. F12 : trois workflows. F18 : API RPPS, NOT_FOUND bloquant et PENDING si indisponible ; aucune validation manuelle ajoutée. Attestation F02 V2 ; références hors V1, V2 envisagée. Voir DECISIONS_V1.md.

## Modifications
Prompt, architecture et catalogue Word local synchronisés. Les anciens contenus sont sauvegardés par empreinte dans docs/archives. Le fichier Downloads et les PDF historiques n’ont pas été modifiés.
Annulation/republication précisées, verrous coopératifs, TLS entre services, création initiale de la note et distinction blocage/terminé corrigés.
Matrice créée : 40 contrôles scolaires, 18 contrôles de sécurité et 17 lignes fonctionnelles (F04/F16 groupés). Les statuts d’application restent non exécutés.
Estimation initiale : 348–528 heures-personnes ; contrainte confirmée de 4 personnes sur 11 jours, date fixe ; capacité quotidienne non précisée. Aucun temps réellement passé inventé.

## Vérifications
Voir VERIFICATION_DOCUMENTAIRE.md et SOURCES_SHA256.json. La vérification est documentaire et structurelle ; aucun rendu visuel Word ni test logiciel.
Un premier contrôle de matrice a échoué car les tables SEC ont deux colonnes ; extraction corrigée puis comptage réussi. Une commande trop longue a été divisée en écritures bornées. Aucun de ces incidents n’est présenté comme un échec applicatif.

## Dépendances
Clés et accès projet France Travail/ANS nécessaires, à configurer via des secrets locaux et non dans les notes. Disponibilités et compétences réelles de l’équipe, hébergement cible, champs RIB obligatoires/représentation, modèle de confirmation et règles de conservation à préciser.
Les références professionnelles ne bloquent pas la V1 puisqu’elles sont reportées.

## Prochaine action
Cadrer la capacité réelle et les accès puis initialiser le dépôt applicatif. Lire le prompt synchronisé, implémenter les lots et remplir la matrice avec preuves. Créer une note initiale si elle manque dans un autre dépôt ; ne pas attendre un fichier inexistant.

Planning quatre responsables cree dans PLANNING_4_PERSONNES_11_JOURS.md ; remplace l’hypothese anterieure de cinq personnes.


## Réalisation InfiMatch en cours

Le code est dans `E:/Interimatch/InfiMatch`. Pour reprendre le développement, lire [InfiMatch/docs/REPRISE_BACKEND_V1.md](../InfiMatch/docs/REPRISE_BACKEND_V1.md) puis son README et son historique Git. La présente note conserve le cadrage documentaire antérieur ; elle ne remplace pas l'état du nouveau dépôt. Le périmètre cible est 100 % de la V1, sans déclaration de conformité intégrale à ce stade.
