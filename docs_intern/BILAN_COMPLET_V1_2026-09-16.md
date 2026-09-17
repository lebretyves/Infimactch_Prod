# Bilan complet InfiMatch V1 — 16 septembre 2026

> Pour le reste à faire actuel, utiliser le [bilan consolidé main](BILAN_V1_MAIN_2026-09-16.md), qui tient compte des dernières corrections et des commits frontend annulés.
> Mise à jour postérieure : les sept évolutions parsing/frontend sont développées et testées. Voir [la livraison et ses limites](LIVRAISON_SEPT_EVOLUTIONS_V1.md). 194 annonces recalculées ; 149 tests backend isolés et 12 tests frontend réussis. Les statuts antérieurs ci-dessous restent historiques pour ces points.

État local recoupé avec le kickoff original, REQUIREMENTS_V1, les audits précédents, le code et les preuves disponibles. Ce bilan ne remplace pas une recette exhaustive ni une validation juridique. Les vérifications de ce bilan n’ont consommé aucun quota fournisseur.

## Conclusion

Le socle fonctionnel existe et plusieurs corrections de sécurité ont été testées. Le projet permet une démonstration locale préparée. Il ne faut pas le présenter comme entièrement terminé, livré sur GitHub ou prêt pour un usage réel : Google reste bloqué, le parsing est une démonstration limitée, le contrôle RPPS prouve seulement l’existence du numéro, et la recette finale manque. Les livrables humains du kickoff doivent aussi être vérifiés.

## 1. Comptes, identité et organisations

Fait : comptes intérimaire et entreprise, distinction agence/établissement, inscription classique, connexion/déconnexion, mots de passe Argon2id, sessions SQL, contrôles de permissions. Profils et champs professionnels présents. Assistance FINESS raccordée ; affiliations agence–établissement par CLI. Google est intégré au code et configuré localement.

Ne va pas / reste :
- Google échoue avec origin_mismatch : origines JavaScript à enregistrer dans Google Cloud puis connexion réelle à tester. Une fenêtre Edge attend la connexion du propriétaire ; aucune modification distante confirmée.
- Aucun mail de vérification pour l’inscription classique. Ajouter statut, jetons à usage unique, confirmation/renvoi, service d’envoi et restrictions des comptes non vérifiés. Ce parcours a été proposé, pas réalisé.
- Réinitialisation du mot de passe par mail absente ; la page le dit explicitement. À décider/intégrer pour un usage réel, sans la présenter comme une obligation explicite du kickoff.
- RPPS : contrôle exact du numéro et états FOUND/NOT_FOUND/PENDING existants. Pas de comparaison nom/prénom, profession ou activité ; aucune preuve que le déclarant est le titulaire.
- RPPS_API_KEY présente et identique dans le .env privé et Vault kv/infimatch/v1/backend lors du contrôle de ce bilan. Aucun appel de validité effectué.
- Pro Santé Connect CPS/e-CPS discuté comme évolution : ni raccordement, ni identifiants dédiés, ni connexion implémentée. Le bac à sable et le passage en production nécessitent leur parcours ANS. La clé Annuaire RPPS ne remplace pas ces identifiants.
- L’e-mail vérifié ou l’identité professionnelle ne prouvent pas automatiquement le droit de représenter une entreprise. Conserver un contrôle distinct des affiliations.

## 2. Parcours métier et matching

Fait : profils IDE/IADE/IBODE, compétences/expérience/mobilité, disponibilités et indisponibilités par sous-périodes ; besoins établissement, missions agence ; catalogue, filtres et pagination ; favoris ; candidatures internes, sélection/refus et affectation humaine ; historique et calendrier. Matching déterministe avec admissibilité et explications. Comptes désactivés exclus des nouvelles propositions et actions ; affectations confirmées conservées.

Reste : recette complète infirmier/agence/établissement, trois qualifications, conflits, refus, annulations, rejeux et cloisonnement. Aligner les propositions d’accueil sur les recommandations personnalisées. Vérifier navigation agence au-delà des vingt premiers candidats. Raccorder au frontend les préférences de notification et la correspondance externe détaillée : leurs API backend existent déjà. Tester favoris et liens d’annonces inactives/expirées.

## 3. France Travail, JobsPipe et doublons

Fait : import des deux sources, normalisation, provenance et URL source ; upsert par fournisseur/identifiant. Exclusion des CDI ajoutée : sept annonces désactivées lors du nettoyage précédent. Programmation quotidienne à 00 h, 07 h, 09 h, 11 h, 13 h, 15 h, 17 h (Paris), sans lancement à 18 h, sans relance ni rattrapage automatique.

Dernier contrôle des tâches : le lancement JobsPipe du 16 septembre à 11 h a réussi, dix reçues, quatre acceptées et six rejetées CDI. France Travail à 11 h a renvoyé le code 1 ; son journal contient seulement START. Cause non établie, diagnostic à faire, sans supposer une clé invalide ni un quota épuisé. La journalisation d’échec doit être rendue exploitable.

Garde-fou intersources ajouté : verrou transactionnel partagé par les imports, reconnaissance par URL source ou contenu exact contextualisé, priorité France Travail, copie inactive avec trace de référence sans supprimer les lignes originales. Audit SQL : 194 annonces dont 184 France Travail et dix JobsPipe, 187 actives, aucun doublon confirmé. Une comparaison exploratoire des descriptions n’a pas établi d’autre doublon ; les annonces reformulées peuvent échapper aux règles strictes.

Reste : preuve positive d’intérim JobsPipe, car le mot dans la présentation du recruteur peut suffire actuellement ; désactivation d’anciennes offres réimportées fermées/expirées/non conformes ; stratégie de fraîcheur et disparition fiable. Un lot limité à dix résultats ne permet pas de supprimer les offres absentes. Surveiller quotas et dernière réussite. Les tâches dépendent du PC, de la session Windows et des services locaux.

## 4. Parsing et affichage

Fait : prototype métier sans LLM, preuves textuelles, distinction souhaité/exigé/conditionnel/inconnu, salaire et horaires, diplômes/services/compétences, détection de certaines contradictions. Trente-six annonces examinées sur deux lots, vingt-six tests expérimentaux passés. Les mesures ciblées ne sont pas un taux de précision global.

Trois exemples relus sont affichables localement sur /apercu-annonces et dans les fiches correspondantes si le hash de description correspond. La fiche montre les informations structurées, salaire/horaires et texte original repliable. Évaluation indépendante de cette démonstration : desktop/tablette/mobile, clavier, aucun débordement et aucune violation axe détectée sur les écrans testés. Cela ne certifie pas tout le site.

Ne va pas / reste : parsing non raccordé à l’import/API/stockage pour toutes les annonces. Définir schéma versionné, migration, recalcul idempotent, preuves, unités et états inconnus ; puis raccordement frontend et filtres/matching seulement pour les données fiables. Améliorer contexte des diplômes/services, primes, roulements et localisation. Tester omissions ET faux positifs sur un nouveau corpus indépendant. Le précédent lot complémentaire a servi à ajuster les règles.

Défauts de démonstration repérés : exporteur create-parser-preview.mjs ne régénère pas descriptionHash utilisé par le frontend ; sa réexécution peut masquer les exemples. Libellé « Aucune compétence supplémentaire indiquée » trop affirmatif quand rien n’est structuré ; dates non précisées à présenter proprement. Corriger ces points avant la démonstration. Aucun contenu absent d’une source tronquée ne peut être reconstitué comme un fait.

## 5. Documents, sécurité et exploitation

Fait : documents fictifs contrôlés et chiffrés, autorisations de lecture ; quota corrigé et PDF de confirmation exemptés ; verrouillage commun enregistrement/nettoyage ; comptes désactivés et révocation ; droits minimaux PostgreSQL/Mongo distincts du migrateur ; migrations sécurité appliquées après sauvegarde/tests ; Vault TLS, AppRoles et secrets ; HTTPS local Caddy https://localhost:8443 ; scripts de sauvegarde/restauration SQL, Mongo, documents, Vault et n8n.

Reste : politique de conservation effective, suppression/anonymisation, exercice des droits, prise en compte des sauvegardes ; TLS des flux interservices selon topologie ; restauration globale sur jeu représentatif avec missions et documents déchiffrables ; exercice rotation/incident. Sauvegarde hors machine, surveillance et certificats/domaine public dépendent de la cible d’exploitation. La restauration antérieure portait sur une base métier peu remplie.

## 6. Automatisations

Trois workflows n8n ont été exécutés en environnement isolé : notification de correspondance, relance de mission non pourvue, confirmation PDF après affectation humaine. Le minimum de deux scénarios du kickoff est couvert sur ces tests. Les notifications sont internes ; aucun envoi mail/SMS général n’est validé. Rejouer les workflows sur le lot final et fournir les exports cohérents.

## 7. Tests, documentation, Git et dépendances

Preuves disponibles : 113 tests unitaires backend et compilation réussis après dédoublonnage ; test PostgreSQL transactionnel annulé vérifiant priorité France Travail, provenance et réimport ; dix tests Vault après configuration Google ; vingt-six tests du parseur ; build frontend et vérification visuelle de la démonstration. Une ancienne campagne sécurité comprenait dix-sept intégrations : elle ne couvre pas les derniers changements. Coverage final à régénérer, pas de conformité globale déduite de ces nombres.

Reste : OpenAPI réponses/erreurs à compléter ; recette intégrée finale ; installation depuis clone propre ; migrations/seed/Vault/n8n rejouables ; nettoyage des fichiers de travail ; README, matrice et preuves actualisés. REQUIREMENTS_V1 contient encore des statuts antérieurs (108 tests, 14 tests parseur, absence de démonstration) et des caractères ? : ce bilan plus récent fait foi pour ces points.

Dépendances : manifests/lockfiles/installations cohérents lors de l’audit précédent ; frontend types Node 26 à aligner avec la cible Node 24. Aucune conclusion récente sur vulnérabilités ou dernières versions. Le projet Node utilise package.json/package-lock.json et npm ci, pas requirements.txt.

Git contrôlé : backend de travail sur master (284724b), frontend sur integration-api-v1, nombreux changements locaux non commités dans les deux. Dépôt de sauvegarde publication-authentification sur authentification (9a74ed2). Il ne contient pas tout le lot récent. Ne pas confondre sauvegarde existante et livraison actuelle ; préparer un lot propre et contrôler sa CI après publication. Ancien succès CI non applicable automatiquement aux changements récents.

## 8. Kickoff : éléments non techniques restant à prouver

Justification du secteur santé et étude de marché sourcée ; proposition de valeur ; cahier des charges/roadmap/chiffrage initial et preuve de cadrage J+2 ; temps humains réellement passés et écarts ; deux pratiques d’écoconception documentées ; bases accessibilité et SEO avec sitemap cohérent ; cadre des données et limites métier du POC ; réflexion achat responsable/réemploi si pertinente ; dataset/script de nettoyage ; exports n8n ; pitch, démonstration reproductible et participation de tous. Leur remise ou leur validation ne peut pas être déduite du code.

Le kickoff impose nettoyage/reformatage utile et visible, pas un LLM ni un parseur exhaustif. Google, vérification par mail et CPS ne sont pas explicitement imposés par le texte initial ; ils complètent la portée discutée. Signature, contrats complets, paie, temps travaillés et chatbot restent hors V1 selon les décisions conservées. Une confirmation PDF n’est pas un contrat signé.

## Ordre proposé

1. Résoudre accès Google et diagnostiquer l’échec programmé France Travail.
2. Fiabiliser admissibilité intérim et cycle de vie des offres.
3. Rendre le parsing reproductible puis généraliser son traitement backend/frontend.
4. Ajouter le parcours de vérification e-mail ; enrichir le RPPS avec statuts précis. Préparer PSC séparément selon accès ANS.
5. Finir raccordements UI, conservation et preuves de sécurité/restauration.
6. Recette globale, coverage, clone propre, documentation et livraison Git/CI.
7. Clore les preuves kickoff et répéter la soutenance.
