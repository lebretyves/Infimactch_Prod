# InfiMatch — Rectificatif du catalogue des fonctionnalités V1
Date : 15 septembre 2026
Référence : nouvelle numérotation du catalogue Word archivé dans annexe/references.
Décision utilisateur : appliquer les améliorations proposées après les essais France Travail IDE / IADE / IBODE.
Ce document complète les fonctions existantes ; il ne renumérote pas le catalogue et ne modifie pas le fichier source archivé.

## Termes à employer
Mission interne : mission créée dans InfiMatch par un utilisateur entreprise autorisé. Le backend gère les candidatures, le contrôle d'admissibilité, le score et l'affectation décidée par l'agence.
Annonce externe : offre publiée sur France Travail ou par un de ses partenaires, récupérée via l'API et affichée par InfiMatch. Postuler redirige vers l'annonce d'origine. La récupération ne crée pas une mission interne ni une affectation.
Une annonce externe peut proposer une mission d'intérim ; « externe » désigne sa provenance, pas son contrat.

## F04 — Filtrage hiérarchique (texte complémentaire V1)
Pour les missions internes, conserver les règles de qualification, compétences, expérience, disponibilité, mobilité et RPPS du prompt validé. Un score ne compense jamais un prérequis bloquant.
Pour les annonces externes, indiquer les critères déclarés par le fournisseur et ceux restant à vérifier. La qualification déduite de l'intitulé n'est pas une vérification du diplôme. Aucune disponibilité ni admissibilité complète n'est présumée.
IDE, IADE et IBODE restent distincts. Un intitulé IBO ou mentionnant seulement le bloc opératoire n'établit pas à lui seul une exigence IBODE.
Les règles d'accès aux missions IDE pour les professionnels possédant ce diplôme restent celles du profil ; aucune équivalence IADE/IBODE n'est ajoutée.

## F05 — Recherche (texte complémentaire V1)
La recherche distingue missions internes et annonces externes. Les annonces externes sont filtrées selon leur qualification classée. Une qualification non confirmée reste visible dans la liste publique générale mais n'est pas incluse comme correspondance qualifiée.
Les filtres stricts sur les dates, horaires, rayon, établissement et critères métier ne sont pas satisfaits par une information inconnue : les annonces externes concernées sont exclues, selon le comportement conservateur existant.
La collecte France Travail croise les mots-clés infirmier, IDE, IADE et IBODE. Le dédoublonnage utilise l'identifiant fournisseur.
L'option CLI --department permet de cibler un département, avec contrôle local du code commune. Ce paramètre de collecte n'est pas un nouveau filtre géographique du formulaire frontend.
Ne pas présenter une recherche par mot-clé comme une vérification de qualification.

## F15 — Publier les offres via l'API (texte complémentaire V1)
Acquérir les annonces France Travail de type MIS, nettoyer les textes et conserver la provenance, l'identifiant, la date de collecte et le lien d'origine.
Reconnaître IDE même si le titre ne contient pas le mot infirmier. Classer prudemment les titres de bloc et signaler les qualifications non confirmées.
Conserver les informations structurées disponibles : commune, code postal, coordonnées fournisseur, expérience, compétences, formation, temps de travail et libellé de contrat.
Les coordonnées fournisseur ne prouvent pas l'adresse exacte du poste. Aucune conversion automatique d'un centre de commune en lieu de travail.
Signaler les incohérences potentielles du contrat, de l'expérience et du lieu, sans remplacer silencieusement une valeur. Les contrôles sont heuristiques et ne détectent pas toutes les contradictions.
Un import rejoué actualise les mêmes identifiants sans doublon. Un appel fournisseur en échec interrompt la collecte avant l'import.
La collecte est bornée à 1–150 résultats par mot-clé : au maximum 600 avant dédoublonnage. Ce n'est pas une synchronisation exhaustive ; le retrait automatique des offres disparues reste à compléter.

## F16 — Matching déterministe (texte complémentaire V1)
Le score complet reste réservé aux missions internes suffisamment renseignées et aux profils admissibles.
Formule conservée : 45 % compétences souhaitées, 25 % proximité relative au rayon de mobilité, 20 % préférence horaire, 10 % expérience pertinente plafonnée à 24 mois. La disponibilité complète est un prérequis.
Les annonces externes exposent une correspondance par critères, avec score nul au sens JSON (null), et non une note de zéro sur cent.
Statuts : information déclarée par le fournisseur, information inconnue, information à vérifier.
Un score de 100/100 en simulation mesure l'adéquation aux règles, pas une probabilité de recrutement.
Aucune affectation automatique et aucun contournement RPPS n'est introduit.

## F20 — Exploitation visible des données publiques (texte complémentaire V1)
Afficher pour chaque annonce externe : source, lien d'origine, métier classé ou à confirmer, lieu annoncé, critères disponibles et alertes qualité.
Les listes, la recherche et la fiche détaillée utilisent la même présentation de correspondance. Le bouton de candidature redirige vers la source.
Le frontend doit traduire les états techniques en libellés compréhensibles et montrer les champs restant à vérifier, sans inventer de pourcentage.
Exemple avant/après réel : les titres contenant uniquement IDE sont maintenant reconnus. Sur le lot Paris testé, 120 offres sont classées IDE contre 118 avec l'ancien classement ; plusieurs titres de bloc auparavant classés IBODE restent désormais à confirmer.

## Flux à intégrer au catalogue
France Travail / partenaires
        |
        v
Collecte de 4 recherches bornées
        |
        v
Dédoublonnage + nettoyage + classement prudent
        |
        v
Conservation des informations + alertes qualité
        |
        v
Annonce externe InfiMatch : critères disponibles, pas de score complet
        |
        v
Candidature sur le site d'origine

Mission interne complète + profil
        |
        v
Contrôles bloquants : qualification, RPPS, compétences,
expérience, disponibilité, conflits, horaires, mobilité
        |
        v
Si admissible : score expliqué
        |
        v
Candidature et décision humaine de l'agence

## Recette effectuée
- Typage et compilation réussis.
- 62 tests réussis, dont vérification des critères sur recherche, liste publique et fiche détaillée.
- Couverture des lignes : 77,94 % ; branches : 82,62 %. Ce résultat ne prouve pas une conformité intégrale.
- Acquisition réelle Paris : 134 identifiants distincts ; persistance puis rejeu sans doublons.
- Classement après correction : 120 IDE, 7 IADE, 1 IBODE, 6 non confirmées.
- Alertes potentielles, pouvant se cumuler : 17 contrat, 14 expérience, 1 lieu. Les 6 qualifications non confirmées concernent les annonces de bloc ambiguës.
- HTTP testé avec le backend compilé corrigé et les données importées.
- Preuves : annexe/proofs/france-travail-rectification.json et annexe/proofs/verification.json.

## Limites et périmètre
Le frontend reste à intégrer par l'équipe : la présentation décrite est exposée par le backend, pas encore validée dans un écran.
Les informations manquantes ne sont ni inventées ni assimilées à une incompatibilité personnelle définitive.
Les règles F18 RPPS restent inchangées : absence confirmée bloquante, indisponibilité du fournisseur en attente.
Attestation sur l'honneur et références professionnelles ne sont pas réintroduites en V1.
Ce rectificatif ne transforme pas les annonces externes en contrats, missions internes ou candidatures suivies par InfiMatch.


COMPLEMENT F04 / F05 / F16 / F20 ? COMPARAISON PARTIELLE
Les annonces externes sont maintenant comparees au profil connecte sur les donnees interpretables. La recherche reste stricte par defaut ; une option explicite permet de voir les annonces incompletes, avec les filtres non verifies signales. Les informations absentes du profil et celles absentes de l annonce sont distinguees. Aucun score complet ni disponibilite supposee. Voir EXPLICATION_MATCHING_DONNEES_MANQUANTES.md et OFFRES_EXTERNES_V1.md. Ces precisions completent les regles d exclusion par defaut ci-dessus.
