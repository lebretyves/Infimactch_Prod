# Missions de démonstration — contrôle du 18 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

Lot de 1 000 demandes à titres professionnels, non importées en production : 646 IDE, 203 IBODE, 151 IADE, sur 646 FINESS géographiques distincts et 101 départements. Établissements réels, scénarios et conditions inventés explicitement pour la démonstration ; aucun recrutement réel attribué aux établissements.

400 demandes (40 %) se déroulent intégralement du 18 au 27 septembre 2026 : 100 débutent le 18, 300 la semaine suivante. Aucun début antérieur au 18 septembre. 820 demandes d'une ou deux vacations, 60 demandes longues de quatre ou huit semaines ; 3 092 vacations distinctes. Validation indépendante PASS, SHA256 données C8AC69B91C6B239164BD257F659755CEB9E9E06B7FB43EBEF709181E86C2FBC0.

Sources officielles : FINESS structures et activités au 17/09/2026, nomenclatures ANS, capacités/effectifs SAE2024, sites des établissements pour populations et exceptions. Les classements initiaux top3 public/privé par département et extension Paris sont filtrés : activités, population ou adresse insuffisamment établies exclues. Pas de classement absolu2026 ni de couverture exhaustive de tous les établissements parisiens. Coordonnées manquantes conservées sur228sites ; géocodageIGNaccepté seulement au numéro/mêmecommune/score>=0,85.

Salaires : repères horaires bruts d'offres publiques d'agences, pas salaires réels des sites. Nuits réservées aux capacités hospitalières appropriées ; pédiatrie, HDJ, horaires locaux/outre-mer, congés, repos et échéances connues vérifiés. Aucun doublon de demande/vacation trouvé.

Livrables dans E:/Interimatch/livrables/missions-500 : Missions_1000_controle.pdf (93pages), .xlsx (filtresdontDémo18–27septembre), .csv, missions.json, audit-lot.md/json, sources et Dossier_1000_missions_controle.zip. Le dossier précédent des49missionshistoriques reste séparé ; celles-ci avaient un FINESS fictif000000001 et n'ont pas été rétablies.

Avant toute utilisation applicative, une demande multivacations doit être représentée par des créneaux distincts, avec organisation autorisée résolue parFINESS et statut de démonstration explicite. Le présent travail n'a créé aucun compte, aucune organisation ni annonce publique.


## Révision vérifiée après géolocalisation et contrôle d’import

Version actuelle : SHA-256 C56BAE2DCFA9DECA89BF07AB3AB1144D5BFFF126B7D48B08F5C74ABE19F9AA40. Les 1000 demandes/3092 vacations, 400 demandes18–27septembre, métiers, lieux métier, prix et horaires sont conservés. 99 sites géolocalisés supplémentaires (90 adresses,9points hospitaliers identifiés) ;129sites/180demandes/490vacations restent sans GPS. Les sources plus anciennes Atlasanté sont recoupées par FINESS et adresse actuelle, sans prétendre à un relevé GPS récent. 228critères pansements complexes SMR et63triage urgences horsIOA passent de requis à souhaités, faute de poste spécialisé décrit. Diplômes/compétences de sécurité inchangés.

Import complet PostGIS jetable :2602DRAFT, même résultat et mêmesIDs au rejeu,0doublon ;94vacationsDOM avec fuseau exact et UTC inchangés. Référentiel1moismax, droits,ambiguïtés et refusDBdistante contrôlés. 15profils fictifs régionaux donnent87vacations compatibles/52demandes ; aucunprofilréel modifié et aucuneannonce au catalogue réel.

646FINESS retrouvés danssnapshotANS17sept etAPIpublique(snapshot1sept). La résolution des organisations de production et des droits reste nonvérifiée : récupération envproduction refuséeparcontrôleautomatique enattented’accordexplicite. La lecture locale development ne constituepasunelectureproduction.

Livrables actualisés : Missions_1000_controle.pdf (94pages), Missions_1000_controle.xlsx, Audit_import_matching_corrige_2026-09-18.xlsx, Dossier_1000_missions_controle.zip, Dossier_audit_import_matching_corrige_2026-09-18.zip, AUDIT_IMPORT_MATCHING.md. L’ancienExcel audit ouvert est conservé, nepasleconfondreavecversioncorrigée.

Code reproductible : scripts/safe-demo-mission-import.cjs, scripts/test-safe-demo-mission-import.cjs et scripts/SAFE_DEMO_IMPORT.md. Donnéesvolumineusesetpreuvessource restentdanslivrableshorsdépôt. L’importeur écrit seulement enbasejetabletest, necréeaucuneorganisationréelle et nepublieaucuneannonce.