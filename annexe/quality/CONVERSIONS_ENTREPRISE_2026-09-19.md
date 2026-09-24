# Conversions entreprise — lot 14

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

19 septembre 2026. Fonctionnalité locale, testée, non publiée. Aucune migration et aucun nouveau tracking navigateur.

## Périmètre livré

Le tableau de bord des agences et établissements propose une organisation active et une période de 366 jours maximum. `GET /api/v1/dashboards/conversions?organizationId=UUID&from=AAAA-MM-JJ&to=AAAA-MM-JJ` interprète les deux bornes comme des jours inclus en UTC. Les dates inexistantes, antérieures à 2000, futures, inversées et les périodes trop larges sont refusées.

La session existante est obligatoire. Le service vérifie de nouveau que le compte est actif, de famille entreprise, non réservé à l’administration et membre actif de l’organisation demandée. Une autre organisation ne donne pas accès aux données. Une agence liée à un établissement ne récupère pas toutes ses missions par cette simple liaison : les missions doivent porter l’identifiant de l’organisation dans `agency_id` ou `establishment_id`.

## Définitions affichées

| Indicateur | Cohorte / dénominateur | Numérateur ou calcul |
|---|---|---|
| Pourvoi | Missions dont `first_published_at` connu tombe dans la période | Missions ayant actuellement au moins une affectation ACTIVE ou COMPLETED ; une seule fois par mission |
| Sélection | Candidatures dont la soumission initiale est attestée par `APPLICATION_SUBMITTED` avec `previousStatus: null`, dans la période | Candidatures ayant produit une affectation, même annulée ensuite ; une seule fois par candidature |
| Annulation mission | Même cohorte de publication que le pourvoi | Missions actuellement CANCELLED |
| Annulation affectation | Affectations créées dans la période selon `assignment.created_at` | Affectations actuellement CANCELLED |
| Délai moyen de pourvoi | Missions de la cohorte publiée avec délai non négatif connu | Temps entre publication et première affectation encore ACTIVE ou COMPLETED ; nombre de missions mesurées affiché |

Chaque taux affiche numérateur, dénominateur et pourcentage. Un dénominateur nul affiche **Non calculable**, jamais un faux 0 %. L’absence de délai mesurable produit également Non calculable.

Ce sont les **résultats actuels de cohortes datées**, pas une photographie historique à la fin de la période. Ainsi une affectation annulée peut cesser de contribuer au pourvoi tout en restant une candidature ayant abouti. Les candidatures réitérées avec le même identifiant ne sont pas de nouvelles personnes distinctes ni une nouvelle cohorte initiale.

## Exclusions et limites historiques

- Offres externes exclues : seules les tables métier internes sont interrogées.
- Missions fictives : uniquement les UUID explicitement présents dans `mutedDemoMissionIds`, issus du reçu conservé. Aucun rapprochement sur nom, titre, description ou établissement. Il n’existe pas de marqueur source confirmé pour reconnaître tous les autres jeux fictifs ; ils ne peuvent pas être automatiquement exclus avec certitude.
- Anciennes missions sans date de première publication : exclues des cohortes de publication. La création de mission n’est pas utilisée comme date de publication de remplacement.
- La table application ne possède pas de `created_at`. Les dossiers sans preuve d’une soumission initiale dans l’audit sont exclus de la cohorte candidature ; `updated_at` n’est jamais recyclé en fausse date de création.
- Les nombres d’historiques non datables et de missions fictives exclues portent sur toute l’organisation, toutes dates confondues, ce qui est précisé à l’écran. Impossible de les attribuer à une période si leur date manque.
- Les anciennes traces peuvent manquer après migration ou rétention : les cohortes ne sont pas garanties complètes. Une annulation temporaire puis réouverture d’une mission n’est pas comptée comme annulation actuelle.
- Aucun taux de consultation, de visite ou de candidature par visite n’est créé : ces événements ne sont pas collectés.

## Validation réelle

- **2 tests unitaires** : taux avec zéro / fractions connues, dates réelles et limites.
- **6 intégrations PostgreSQL/PostGIS isolées réussies**, migrations réelles et contraintes conservées : droits entre deux organisations, membre désactivé, compte infirmier/administration refusé ; période vide ; cohortes connues ; annulation et réaffectation ; dénominateurs distincts ; exclusion du reçu fictif ; données non datables ; frontières UTC ; resoumission ; délai négatif exclu.
- Exemple SQL : 2 missions pourvues / 4 publiées = 50 % ; 3 candidatures converties / 4 = 75 % ; 1 mission annulée / 4 = 25 % ; 1 affectation annulée / 3 = 33,33 % ; délai moyen 36 heures pour 2 missions.
- **6 contrôles navigateur simulés** : agence et établissement aux largeurs 320, 768 et 1 440 pixels ; cohorte vide, fractions connues, application de la période, définitions et absence de débordement. Aucune requête réelle à une base ou un fournisseur, aucune erreur de fixture.
- Compilation des tests backend et typage frontend réussis. Les premiers échecs concernaient des fixtures ne respectant pas le trigger différé FILLED/ACTIVE ; elles ont été corrigées sans désactiver les protections SQL.

Preuves : `E:\Interimatch\audits\2026-09-19-conversions\integration.txt`, `browser.json`, `dashboard-AGENCY.png`, `dashboard-ESTABLISHMENT.png`. Runner SQL jetable et recette navigateur conservés dans ce répertoire. Port 55433 et conteneur de test libérés après passage.

Pas de test de charge ou d’affirmation de représentativité statistique. Après déploiement, vérifier une organisation réelle autorisée et l’affichage honnête des cohortes vides ou historiques incomplets. Aucun push ni déploiement n’a été réalisé par ce sous-lot.