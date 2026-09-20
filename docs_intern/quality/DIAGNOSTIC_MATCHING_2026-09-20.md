# Diagnostic local du matching — 20 septembre 2026

## Décision
Le coût N+1 est confirmé. Une optimisation ciblée des distances et conflits par lots est justifiée à 1 000 éléments ; aucun changement métier ni optimisation appliqué pendant ce diagnostic. Pas de nouvel index conseillé sans mesure complémentaire.

## Protocole
Commande : `node scripts/bench/run-matching.mjs` depuis le dépôt (Docker requis). Bases PostgreSQL/PostGIS et MongoDB jetables, distinctes de production, ports 55433/57018. Aucun secret production ni appel fournisseur. Le lanceur refuse un PostgreSQL de test déjà en cours. Nettoyage des seuls conteneurs de diagnostic en fin de campagne.
Deux populations : 100 puis 1 000 profils visibles et autant de missions ouvertes ; 20 % de profils RPPS non trouvés, 10 % avec affectation active sur une mission remplie supplémentaire, 20 % des missions ouvertes hors rayon du profil consulté. Pas de données réelles. Les effectifs admissibles attendus (80 % des missions, 70 % des candidats) sont assertés.
Deux parcours réels de MatchingService, page de 20 : `forNurse` et `forMission`. Historique MongoDB activé pour le parcours intérimaire. Après échauffement : trois appels séquentiels puis une vague de cinq simultanés. Préparation/migrations exclues. Comparaison des résultats complets (hors identifiants d’historique) à chaque appel, deux pages disjointes de 20 contrôlées.

## Temps du service et requêtes SQL
| Éléments | Parcours | Simultanéité | Médiane (ms) | Maximum (ms) | Instructions SQL par appel | Distances | Conflits |
|---:|---|---:|---:|---:|---:|---:|---:|
| 100 | Intérimaire → missions | 1 | 194.8 | 204.7 | 184 | 120 | 1 |
| 100 | Intérimaire → missions | 5 | 277.2 | 282.1 | 184 | 120 | 1 |
| 100 | Mission → candidats | 1 | 160.1 | 164.8 | 206 | 100 | 100 |
| 100 | Mission → candidats | 5 | 210.3 | 210.7 | 206 | 100 | 100 |
| 1000 | Intérimaire → missions | 1 | 1050.2 | 1090.8 | 1093 | 1020 | 1 |
| 1000 | Intérimaire → missions | 5 | 1150.5 | 1158.6 | 1093 | 1020 | 1 |
| 1000 | Mission → candidats | 1 | 1493.9 | 1517.0 | 2015 | 1000 | 1000 |
| 1000 | Mission → candidats | 5 | 2158.4 | 2165.5 | 2015 | 1000 | 1000 |

Le compteur SQL inclut BEGIN/COMMIT : 40 par appel intérimaire (20 historiques), 2 par appel recruteur. Ce sont des temps de service local, pas des temps HTTP navigateur ni des mesures de production. Trois observations séquentielles et cinq concurrentes ne suffisent pas à estimer un p95 fiable.

## Ressources et index
À 1 000 candidats, cinq appels simultanés : environ 1 789 ms CPU PostgreSQL cumulées sur 2 166 ms écoulées (~83 % d’un cœur), mémoire du conteneur ~191 Mio, pic RSS Node ~286 Mio. La mémoire est celle du processus/conteneur entier, inclut caches et historique des scénarios ; ce n’est pas une consommation par requête ni une mesure de fuite mémoire. Les statistiques cgroup incluent l’activité de fond ; leur lecture encadre la vague.
À 1 000 éléments, EXPLAIN ANALYZE BUFFERS : requête de conflits ~0,035 ms pour 100 affectations ; lot candidats ~0,085 ms ; lot missions ~0,051 ms. Les lots utilisent les index profile_pkey/account_active_idx et mission_pkey. PostgreSQL choisit un parcours séquentiel sur les 100 affectations, malgré assignment_nurse_idx et l’index GiST partiel existants : cela ne prouve pas un index manquant. Les plans mesurés sont dans results.json.

## Interprétation
- Côté recruteur, le problème principal mesuré est la répétition : 1 000 recherches de conflits et 1 000 calculs SQL de distance pour afficher 20 candidats.
- Côté intérimaire, 1 000 distances sont calculées pour parcourir les missions, puis 20 recalculées lors de la sauvegarde des explications ; les conflits sont déjà chargés une seule fois.
- Les temps montent d’environ 0,16–0,20 s à 1,05–1,49 s entre 100 et 1 000 éléments. À cinq appels simultanés, le parcours recruteur atteint ~2,16 s par appel.
- Prochaine optimisation à évaluer : charger distances/conflits par lot de 100 et réutiliser la distance du classement pour les 20 explications, sans modifier critères, pondérations ou classement. Comparer exactement les résultats métier et les mesures à cette référence.

## Limites et preuves
Machine : Windows, Ryzen AI 7 350, 16 processeurs logiques, ~31 Gio RAM ; Docker/PostgreSQL 17.5, Node 24.14.0 ; pool PostgreSQL 12 connexions. MongoDB écrit réellement les historiques, mais sa consommation CPU n’est pas instrumentée séparément.
Cette campagne ne couvre ni 10 000 éléments, ni un trafic durable, ni la latence Vercel/Supabase, ni l’HTTP/authentification, ni les fournisseurs externes. Aucun gain financier ou carbone n’est déduit de ces chiffres. Aucun avant/après d’optimisation n’est annoncé.
Preuve détaillée : `../proofs/matching-diagnostic/results.json`. Les scripts mesurent uniquement le service existant et ajoutent des données fictives dans la base de test.
