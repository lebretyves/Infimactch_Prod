# Suivi des corrections de l’audit — 23 septembre 2026

L’audit initial visait `31478e4`. Ce suivi distingue les corrections vérifiées des décisions et essais encore nécessaires. Les preuves de cette campagne sont dans [audit-final-20260923](../proofs/audit-final-20260923/).

| Réserve | Traitement | Limite restante |
|---|---|---|
| R01 Protection des branches | Configuration de protection prête : contrôles backend/frontend, revue indépendante, conversations résolues, administrateurs inclus, interdiction de suppression/force-push. | Activation distante à vérifier ; le compte n’a pas les droits administrateur Epitech. Les Actions Epitech ne démarrent pas : budget de l’organisation bloquant, confirmé par l’annotation du run 35908326280. Voir [procédure](ADMIN_PROTECTION_BRANCHES.md). |
| R02 Calculs coûteux | Quota SQL unique de 15 requêtes/minute/compte, partagé entre matching, recommandations, catalogue personnel, recherche et classement des candidats d?une mission. Sessions et instances ne contournent plus ce budget. Parcours borné à 10 000 éléments et délai contrôlé de 8 s entre lots ; requêtes des classements externes limitées à 5 s. Tests du cumul inter-routes ajoutés. | Le délai de parcours est coopératif : il n’annule pas une requête interne déjà en vol. Pas de cache métier introduit susceptible de servir une ancienne éligibilité. Charge maximale en production non mesurée. |
| R03 Vault | Accès actuels vérifiés, 18/18 contrôles réussis. | Choix explicite de l’utilisateur : maintien manuel. [Procédure et contrôle des échéances](VAULT_MAINTENANCE_MANUELLE.md) livrés ; aucune rotation ni tâche automatique ajoutée. Risque d’expiration conservé si la procédure n’est pas suivie. |
| R04 Reprise et archives | Nouvelle sauvegarde réelle chiffrée puis restauration isolée SQL/MongoDB/documents. 11 comptes, 3 097 missions et 5 documents restaurés/déchiffrés. Copie contrôlée sur un second disque physique. Les 5 anciennes archives, 133 fichiers, sont authentifiées ; leurs anciens dossiers en clair sont absents. | Le Mongo sauvegardé comprend une collection vide : cela ne teste pas le contenu d’un historique réel non vide. Copie hors ordinateur et récupération des clés hors profil Windows restent nécessaires. Jamais de remise en service automatique d’une restauration avant rapprochement avec le registre d’effacement courant. |
| R05 Heures réelles | Tableau estimé/réel préparé, calculs d’écart disponibles. | Heures à fournir par les membres ; aucune valeur inventée. |
| R06 Recette/livraison | Campagne automatisée complète relancée ; registre de recette enrichi de liens et distinction isolé/réel ; [procédure humaine guidée](../rendu/RECETTE_HUMAINE_GUIDEE.md) disponible. Manifeste de livraison à jour à la publication. | Notifications réellement reçues, OAuth réel, MFA réel et recette humaine finale ne sont pas attestés par des tests avec services simulés. |
| R07 Données personnelles | Information avant liens Google Maps et Calendar ; registre opérationnel et procédure de demandes préparés. | Identité du responsable, fondements, contrats, régions et durées finales à valider par le porteur ; [registre](REGISTRE_TRAITEMENTS_POC.md). |
| R08 Maintenance | Onze diagnostics TypeScript nettoyés ; fonction inutilisée retirée avec ses tests spécifiques ; contrôle `npm run lint` ajouté et exigé par CI ; encodage du rapport réparé. | Les gros composants restent des candidats à une extraction progressive ; leur taille seule n’est pas un défaut démontré. |
| R09 Accessibilité | Tests navigateur clavier, dialogues et affichage relancés ; contrôles admin et mobile simulé disponibles. | Session humaine avec lecteur d’écran et téléphone physique à faire. Pas de déclaration de conformité complète. |
| R10 Démonstration | Jeu FINESS explicitement synthétique, script réel de normalisation, pitch de 15 minutes et exports n8n dans le dossier de rendu. | Répétition orale et démonstration humaine à effectuer. Sources externes toujours masquées, sans réactivation implicite. |

## Supabase et DNS

Lecture SQL du 23 septembre : les droits d’écriture `spatial_ref_sys` sont encore accordés à `anon` et `authenticated`. Les calculs géographiques fonctionnent. La demande au support reste ouverte ; le compte disponible ne peut pas révoquer les droits du propriétaire Supabase. Aucun contournement ou changement du schéma PostGIS n’est effectué.

Le DNS Windows n’est pas modifié après l’annulation précédente. Le script de sauvegarde utilise ses résolveurs dans son propre processus ; la sauvegarde MongoDB réussie ne signifie pas que le DNS Windows est corrigé.

## Résultats de la campagne

- Backend unitaire : 661/661 ; couverture des lignes 95,12 %, branches 89,97 %, fonctions 82,48 %.
- Intégration globale sur `0389f4e` : 188/188 dans 29 fichiers, zéro échec et zéro test ignoré. Après ajout du classement des candidats au quota, les 6 tests concernés et les régressions SQL ont été relancés avec succès sur `423ae1e`. La CI GitHub contrôle aussi la version publiée.
- Frontend unitaire : 81/81. Contrôles navigateur, admin et SEO réussis.
- Régressions SQL : 5 contrôles réussis. Vault/sécurité : 18/18.
- `npm run lint` et les trois builds backend/frontend/admin réussis.

## Portée des preuves

Les tests unitaires, intégrations isolées, contrôles navigateur avec réponses simulées, restauration isolée et vérifications de production sont des catégories distinctes. Les résultats historiques ne sont pas additionnés aux tests de cette campagne. Aucun message réel envoyé, compte réel effacé ou offre externe réactivée pour obtenir un résultat vert.
