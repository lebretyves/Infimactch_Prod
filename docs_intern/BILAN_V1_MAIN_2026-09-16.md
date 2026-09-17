# Bilan V1 et kick-off — version consolidée pour main

16 septembre 2026. Ce bilan remplace les anciens statuts « reste à faire » lorsqu’ils contredisent les preuves ci-dessous. Base technique : `6fdc77c` sur authentification, CI backend/frontend réussie. Intégration dans main sans conflit. Les effets des commits frontend `f2f66ec` et `8eaf517` sont annulés ; le frontend local est conservé.

## Réalisé et vérifié

- Authentification classique, Google côté code, rôles et droits, sessions serveur ; expiration après 15 minutes d’inactivité avec avertissement à 14 minutes et limite absolue de huit heures.
- Profils IDE/IADE/IBODE, compétences, expérience, disponibilités, mobilité ; FINESS raccordé à l’inscription ; besoins établissement, missions agence, candidatures, sélection/refus, affectation humaine et PDF fictif.
- Recommandations personnalisées et explications, filtres avancés, favoris, calendrier des affectations, pagination agence au-delà de vingt profils, correspondance externe détaillée et préférences de notification raccordés.
- France Travail et JobsPipe : imports, normalisation, garde-fou de doublons, exclusion CDI, preuve contextualisée d’intérim, retrait des offres réimportées explicitement fermées/expirées/non conformes. Les deux tâches planifiées ont réussi le 16 septembre à 15 h ; prochaine exécution annoncée à 17 h. Aucun appel fournisseur supplémentaire pendant ce bilan.
- Parsing généralisé à l’import avec stockage, preuves textuelles, version, recalcul idempotent et affichage. Les 194 annonces du recalcul initial ont été traitées. Export des exemples corrigé.
- Trois workflows n8n testés : correspondance, relance de mission non pourvue, confirmation PDF. Notifications internes et préférences persistées. Worker local actif.
- PostgreSQL/MongoDB accessibles ; comptes applicatifs restreints, Vault, HTTPS local, chiffrement des documents, quota PDF et concurrence nettoyage/enregistrement corrigés.
- Purge et clôture opérateur : simulation par défaut, suppression physique après commit, protection des références de relance, effacement des données du profil et des historiques MongoDB. Aucune purge exécutée sur la base utilisateur.
- Restauration représentative réussie avec 2 comptes fictifs, 1 mission, 1 affectation, 1 PDF déchiffré ; restauration MongoDB, Vault et trois workflows n8n. Il s’agit d’un exercice contrôlé, pas d’une nouvelle sauvegarde synchronisée de production.
- 159 tests backend réussis ; couverture locale : 81,16 % lignes, 80,45 % branches. CI de la base technique verte pour backend et frontend. Le succès des tests ne vaut pas validation de tous les parcours ni certification de conformité.

Preuves : [tests isolés](proofs/v1-hardening/result.json), [couverture](proofs/v1-hardening/coverage.txt), [restauration](proofs/v1-hardening/restore.json), [recette des sept évolutions](LIVRAISON_SEPT_EVOLUTIONS_V1.md), [conservation et limites](RECUPERATION_BACKEND_RETENTION_2026-09-16.md), [CI de référence](https://github.com/Ziwazou/infiMatch/actions/runs/35108272756).

## Restant pour finaliser la V1

| Priorité | Sujet | Travail restant et critère de fin |
| --- | --- | --- |
| P1 | Recette complète | Rejouer le parcours infirmier/agence/établissement et IDE/IADE/IBODE depuis le navigateur : besoin, mission, candidature, affectation, PDF, annulation, conflits, erreurs et isolation des organisations. Conserver des preuves par scénario. |
| P1 | Installation reproductible | Tester l’installation complète sur une machine ou un environnement vierge : configuration privée, Vault, migrations, services, worker, n8n, données fictives et rattachements. La CI valide npm et les bases isolées, pas toute l’installation d’exploitation. |
| P1 | Exploitation des notifications | Vérifier la réception visible, les préférences désactivées, les relances et le redémarrage sans doublon dans l’environnement retenu. Prévoir démarrage automatique/surveillance du worker et de n8n. Les trois fonctions existent déjà. |
| P1 | Conservation et droits | Valider les durées retenues, documenter le canal de demande et l’opérateur, choisir la planification de purge, traiter la conservation des historiques métier, organisations partagées et sauvegardes. Prévoir la réapplication des clôtures après restauration. Ne pas présenter la clôture actuelle comme une anonymisation intégrale. |
| P1 si option maintenue | Google | Confirmer les origines autorisées dans Google Cloud et une connexion réelle sur l’adresse de livraison. Le précédent origin_mismatch ne peut pas être déclaré résolu par les seuls tests de jetons. |
| P2 | Cycle de vie des offres | Définir le vieillissement des annonces sans expiration et le retrait fiable des offres disparues. Une absence dans un lot partiel ne suffit pas. Tester favoris et liens vers une annonce devenue inactive. |
| P2 | Contrat API | Compléter schémas de réponses/erreurs OpenAPI, notamment authentification, profils, matching, correspondance et tableaux de bord ; tester leur cohérence avec les réponses servies. |
| P2 | Surveillance des imports | Conserver dernière réussite, compteurs et diagnostic d’échec/429 ; alerter sans réessai automatique. Documenter la dépendance au PC Windows et aux services. La journalisation et les derniers lancements sont maintenant corrigés/réussis. |
| P2 | Documentation | Mettre à jour les matrices et anciens bilans contradictoires ; corriger les encodages dégradés, distinguer preuves historiques et actuelles, préparer un parcours de démonstration clair. |

## Améliorations utiles, distinctes des fonctions déjà livrées

- **Parseur** : élargir le corpus indépendant, surtout JobsPipe ; traiter les variantes de « traitements médicamenteux », unités salariales, matériel, localisation, primes et contraintes complexes. Dernier lot indépendant : 11 attentes ciblées retrouvées sur 12 ; ce n’est pas un taux de précision global. Mesurer aussi les faux positifs. Les textes tronqués ne doivent pas être complétés comme des faits.
- **Doublons reformulés** : les règles strictes n’identifient pas nécessairement deux annonces réécrites. Ajouter une comparaison prudente et une possibilité de relecture, sans fusion arbitraire.
- **Correspondance externe** : exploiter davantage de champs fiables et distinguer information absente, exigence et simple mention ; ne pas injecter automatiquement les extractions incertaines dans l’admissibilité.
- **Qualité du front conservé** : finir la recette mobile/tablette/clavier/focus/contrastes sur tous les parcours, réduire le bundle principal supérieur à 500 kB. Les filtres, FINESS et le calendrier ne sont plus à reconstruire. Aucune nouvelle refonte graphique demandée ni appliquée.
- **Dépendances** : vérifier régulièrement les alertes et aligner les types Node avec le runtime retenu. Aucun audit récent des vulnérabilités n’est déduit du simple succès de npm ci.

## Avant ouverture publique

- Fixer hébergement et domaine, certificat public, topologie et protection des flux PostgreSQL/Mongo/n8n ; le HTTPS local est opérationnel.
- Mettre en place sauvegardes hors machine, accès et rotation des secrets, suivi des certificats, exercice incident et restauration depuis une sauvegarde complète récente de l’environnement final.
- Aligner mentions et pratiques effectives, limites des données fictives et du PDF de confirmation ; choisir et documenter la conservation des pièces et historiques métier.
- Vérifier SEO, indexation et sitemap avec le vrai domaine. Les fichiers existent mais mentionnent actuellement `infimatch.fr` : ne pas supposer que c’est le domaine final.

## Options produit à arbitrer

- Vérification d’adresse e-mail, mot de passe oublié et modification autonome de l’e-mail/mot de passe : encore absents ; non imposés explicitement par le kick-off.
- RPPS : numéro retrouvé ne prouve pas identité, activité actuelle ou tous les diplômes. Enrichissement de ces vérifications à définir. CPS/e-CPS via Pro Santé Connect non implémenté.
- Preuve d’appartenance à une entreprise et gestion des affiliations : distinctes de l’existence FINESS/SIRET ; liens actuellement opérés par CLI.
- Slack ou Discord : canal conseillé par le kick-off, facultatif par rapport aux notifications internes existantes. E-mail et SMS ne sont pas obligatoires. Aucun envoi externe activé ici.
- Signature, contrats complets, paie, temps travaillés et chatbot restent hors périmètre V1 retenu. Le PDF généré est une confirmation fictive.

## Livrables kick-off restant à finaliser ou à prouver

Le [texte source](proofs/kickoff-source-extracted.txt) exige au moins deux automatisations : trois sont réalisées. Il exige également une utilisation visible de données nettoyées : le parsing et le catalogue la fournissent.

Restent à préparer ou valider par l’équipe : étude de marché sourcée et proposition de valeur ; cahier des charges/roadmap/chiffrage initial et preuve du cadrage J+2 ; temps humains réels et écarts (le CSV TEMPS_REELS présent n’est pas renseigné) ; deux pratiques d’écoconception documentées ; critères d’accessibilité appliqués ; cadre et limites métier du POC ; réflexion achat responsable/réemploi si pertinente ; exports n8n et script/dataset de nettoyage cohérents ; support de pitch, répétition et participation de chaque membre. La présence de documents ne prouve pas leur remise ni leur validation.

## Ordre conseillé

1. Recette complète et installation vierge.
2. Notifications en exploitation, conservation/droits et Google si conservé.
3. Fraîcheur des offres, contrats API et surveillance.
4. Qualité du parseur, accessibilité/performance et documentation.
5. Dossier kick-off et démonstration ; ouverture publique seulement après préparation de l’exploitation.

Les sources et preuves sont sauvegardées dans Git. Les secrets, `.env`, données personnelles et archives de bases restent privés et exclus de main.
