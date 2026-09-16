# INTERFACES.md — Inventaire des écrans · **V1**

**Application web responsive.** Plateforme d'intérim infirmier, deux rôles :
**Infirmier** et **Entreprise** (établissement de santé *ou* agence d'intérim).

Document **textuel uniquement** — le design est spécifié dans [DESIGN.md](DESIGN.md).

**Périmètre : V1 uniquement.** Tout ce qui relevait de V2/V3 dans les specs
(attestation sur l'honneur, CV multiples, alerte de conflit de calendrier,
duplication de disponibilités, export vers calendrier personnel, algorithme de
suggestions élargies) est **retiré** de cet inventaire et listé en annexe.

**Cible.** Une seule application web servant les deux rôles, responsive de 360px
à 1600px. Les descriptions ci-dessous décrivent le **contenu et le comportement**
d'un écran, indépendamment du breakpoint ; la façon dont chaque écran se réorganise
sur grand écran est traitée en §Comportement responsive, et les règles de mise en
forme dans [DESIGN.md §3.4](DESIGN.md).

**Légende** · `[INF]` infirmier · `[ENT]` entreprise · `[COM]` commun

---

## A. Commun & Authentification — F01

### A1 · Splash / Ouverture `[COM]`
Écran d'amorçage au lancement. Logo centré, vérification silencieuse du token
de session en arrière-plan.
**Sorties :** session valide → dashboard du rôle · sinon → A2.
**États :** chargement, échec réseau (« Réessayer »).

### A2 · Choix du profil `[COM]`
Porte d'entrée. Deux entrées : **Infirmier** et **Entreprise**. La sélection
« Entreprise » ouvre un second niveau : **Établissement de santé** ou **Agence
d'intérim** — cette distinction conditionne l'onboarding, les permissions et le
vocabulaire de toute l'application.
**Contenu :** logo, baseline, deux cartes de choix, lien « J'ai déjà un compte ».
**Actions :** choisir un rôle → A3, B1 ou C1.
**Note :** le rôle choisi est mémorisé localement pour le prochain lancement.

### A3 · Connexion `[COM]`
Email + mot de passe. Le rôle, déjà connu depuis A2, est rappelé en en-tête et
reste modifiable.
**Contenu :** champ email, champ mot de passe (affichage/masquage), case « Rester
connecté », lien « Mot de passe oublié », CTA « Se connecter », séparateur
« ou continuer avec », boutons OAuth.
**États :** repos, saisie, chargement, identifiants invalides (message générique —
ne jamais révéler si l'email existe), compte verrouillé après N tentatives,
compte non vérifié → A5, compte en attente de validation → B8 / C6.
**Sécurité :** limitation de tentatives, avec délai d'attente affiché à l'utilisateur.

### A4 · Mot de passe oublié `[COM]`
Saisie de l'email pour recevoir un lien de réinitialisation.
**États :** confirmation neutre et systématique (« Si un compte existe, un email
a été envoyé ») pour éviter l'énumération de comptes ; relance après temporisation.

### A5 · Vérification du compte `[COM]`
Écran d'attente après inscription ou connexion non vérifiée.
**Contenu :** rappel de l'email, saisie du code à usage unique **ou** instruction
de clic sur le lien reçu, bouton « Renvoyer » avec compteur.
**États :** code valide → suite du flow, code expiré, code erroné, email modifiable.

### A6 · Nouveau mot de passe `[COM]`
Atteint depuis A4 ou depuis les paramètres.
**Contenu :** mot de passe + confirmation, indicateur de robustesse, règles
validées au fil de la frappe.
**Actions :** valider → déconnexion de toutes les autres sessions → A3.

---

## B. Onboarding Infirmier — F02

Parcours en étapes, **barre de progression persistante**, **sauvegarde automatique
du brouillon** à chaque étape, reprise possible plus tard. Les champs obligatoires
sont marqués dès l'affichage, pas seulement à la validation.

### B1 · Création du compte `[INF]`
Email, mot de passe, confirmation. OAuth en alternative.
**Sortie :** A5 (vérification) puis B2.

### B2 · Identité et coordonnées `[INF]`
**Champs :** nom, prénom, date de naissance, téléphone, email de contact
(pré-rempli), photo de profil (facultative).
**Validation :** format téléphone FR, cohérence de l'âge.

### B3 · Localisation `[INF]`
Adresse de résidence, point d'origine des calculs de distance.
**Contenu :** recherche d'adresse avec autocomplétion, code postal, ville,
aperçu cartographique de confirmation.
**Confidentialité :** l'adresse précise n'est jamais exposée aux entreprises —
seules la ville et la distance à la mission le sont.

### B4 · Qualification `[INF]`
Cœur du profil : il alimente directement le matching (F13). Écran le plus dense
du parcours, découpé en sous-blocs repliables.
**Blocs :**
- **Qualification principale** — liste fermée : IDE, IADE (anesthésiste),
  IBODE (bloc opératoire), infirmier puériculteur/pédiatrique, IPA,
  *(liste à confirmer)*.
- **Diplômes déclarés** — intitulé, établissement, année d'obtention, RPPS/ADELI.
- **Compétences** — sélection multiple par étiquettes, avec recherche.
- **Expérience professionnelle** — entrées répétables : établissement, service,
  poste, période. Alimente le calcul d'ancienneté.
- **Expérience par service** — durée cumulée par spécialité : médecine, chirurgie,
  bloc opératoire, pédiatrie, EHPAD, médecine du travail *(liste à confirmer)*.
**Actions :** ajouter / éditer / supprimer une entrée, réordonner.

### B5 · Mobilité `[INF]`
**Contenu :** rayon de déplacement en kilomètres (curseur + saisie), départements
ou secteurs complémentaires, moyen de transport, option « mobilité nationale ».
**Retour visuel :** nombre indicatif de missions ouvertes dans le périmètre —
donne immédiatement du sens au réglage.

### B6 · Disponibilités initiales `[INF]`
Première saisie du calendrier, version allégée de D11.
**Contenu :** jours ou plages types (semaine / week-end / nuit), date de
disponibilité la plus proche, volume horaire souhaité.
**Échappement :** « Renseigner plus tard » — le profil reste créable, mais un
rappel persistant s'affiche sur le dashboard tant que le calendrier est vide.

### B7 · Consentements RGPD et CGU `[INF]`
Dernière étape avant soumission.
**Contenu :** cases **distinctes et non pré-cochées** : CGU (obligatoire),
politique de confidentialité (obligatoire), traitement des données
professionnelles (obligatoire), communications commerciales (facultatif, séparé).
Textes consultables sans quitter l'écran (ouverture en panneau). Mention des
droits d'accès, rectification, portabilité et suppression.
**Actions :** « Créer mon profil » — actif uniquement si tous les obligatoires
sont cochés.

### B8 · Dossier soumis `[INF]`
Confirmation et attente.
**Contenu :** complétude du profil (pourcentage + éléments manquants), statut de
vérification du dossier (F14 : RPPS, références), délai indicatif, CTA secondaire
« Explorer les missions » pour ne pas laisser l'utilisateur en cul-de-sac.
**États :** en attente, en cours de vérification, complément demandé, validé, refusé.

---

## C. Onboarding Entreprise — F02 bis

Même logique de parcours par étapes, avec sauvegarde de brouillon.

### C1 · Création du compte `[ENT]`
Email professionnel, mot de passe. Rappel du sous-type choisi en A2
(établissement / agence), corrigeable.

### C2 · Identité de l'établissement `[ENT]`
**Champs :** raison sociale, nom d'usage, adresse complète (autocomplétion),
type de structure (CHU, clinique, EHPAD, agence…), SIRET, logo (facultatif).

### C3 · Numéro FINESS `[ENT]` — **obligatoire**
Champ isolé, car il conditionne la validation du compte.
**Contenu :** saisie du FINESS, contrôle de format et — si la source est
disponible — vérification contre le référentiel avec restitution du nom officiel
pour confirmation.
**États :** non vérifié, vérifié (nom officiel affiché), introuvable, divergence
avec la raison sociale déclarée → revue manuelle.

### C4 · Coordonnées du référent `[ENT]`
**Champs :** nom, prénom, fonction, email, téléphone direct.
**Extension :** plusieurs référents possibles (utile aux agences multi-sites),
au minimum un référent principal.

### C5 · Consentements RGPD et CGU `[ENT]`
Identique à B7, avec les CGU version entreprise : responsabilités de l'employeur,
traitement des données des candidats, durée de conservation.
Le signataire est nommément identifié (nom + fonction, horodatage).

### C6 · Compte soumis `[ENT]`
**Contenu :** statut du dossier (contrôle FINESS et conformité), délai indicatif,
contact support, CTA « Préparer ma première offre » en mode brouillon.

---

## D. Espace Infirmier

### D1 · Accueil / Tableau de bord `[INF]` — F03
Écran pivot, point d'entrée après connexion.
**Blocs, de haut en bas :**
- **En-tête** — salutation personnalisée, avatar, notifications (D16),
  recherche, paramètres.
- **Alertes de complétude** — bandeau conditionnel : profil ou calendrier
  incomplets, dossier en attente de vérification.
- **Suggestions de matchs** — cœur de l'écran. Missions proposées par le matching
  déterministe (F13), triées par score, avec pour chacune : établissement,
  spécialité, dates, distance, rémunération, et une **raison lisible de la
  suggestion** (« correspond à votre expérience en bloc opératoire, à 12 km »).
- **Accès rapides** — Favoris (D8), Disponibilités (D11), Candidatures (D9),
  Historique (D14).
- **Prochaine mission** — rappel de la mission confirmée à venir, si elle existe.
- **Navigation** — Accueil · Recherche · Candidatures · Calendrier · Profil.
**États :** premier lancement (profil vide, aucune suggestion → pédagogie et
incitation à compléter), aucune suggestion, chargement, hors ligne.

### D2 · Recherche de missions `[INF]` — F05
**Contenu :** barre de recherche libre (mot-clé, nom d'établissement), accès aux
filtres (D3), recherches récentes, suggestions de spécialités.
**Sortie :** D4.

### D3 · Filtres de recherche `[INF]` — F05
**Critères :**
- **Spécialité** — médecine, chirurgie, bloc opératoire, pédiatrie, EHPAD,
  médecine du travail *(autres à confirmer)*. Sélection multiple.
- **Qualification** — IDE, IADE, IBODE, infirmier pédiatrique *(autres à confirmer)*.
- **Localisation et distance** — ville ou position actuelle + rayon.
- **Dates** — période, avec option « uniquement mes disponibilités » qui croise
  automatiquement le calendrier (D11).
- **Nom d'établissement** — autocomplétion.
**Actions :** appliquer (compteur de résultats mis à jour en direct), réinitialiser.

### D4 · Résultats de recherche `[INF]` — F05
**Contenu :** filtres actifs sous forme d'étiquettes supprimables une à une,
compteur de résultats, tri (pertinence, distance, date, rémunération), liste de
cartes de mission.
**Carte de mission :** établissement + logo, intitulé et spécialité, qualification
requise, dates, distance, rémunération, indicateur de correspondance, bouton favori.
**États :** résultats, aucun résultat (avec suggestions d'élargissement : rayon,
dates), chargement progressif, erreur.

### D5 · Détail d'une mission `[INF]`
**Blocs :** en-tête (établissement, intitulé, statut), dates et horaires précis,
service et spécialité, qualification et compétences requises, rémunération et
conditions, localisation avec distance, description détaillée, informations
pratiques, date limite de candidature, encart établissement (→ D6),
missions similaires.
**Actions principales :** « Postuler » (→ D7), favori, partager.
**États :** ouverte, candidature déjà envoyée (bouton remplacé par l'état de la
candidature), pourvue, expirée, profil non éligible (qualification manquante,
avec explication).

### D6 · Fiche établissement `[INF]`
**Contenu :** identité, type de structure, adresse et carte, présentation,
services, missions ouvertes, historique des missions déjà effectuées par
l'utilisateur avec cette structure.
**Actions :** ajouter aux **établissements favoris** (F06), voir toutes les offres.

### D7 · Postuler `[INF]` — F07
**Contenu :** récapitulatif de la mission, aperçu du profil envoyé (ce que
l'entreprise verra), message de motivation facultatif, vérification des prérequis
(dossier vérifié).
**Actions :** confirmer l'envoi, annuler.
**États :** blocage si le dossier n'est pas validé (avec chemin de résolution),
confirmation d'envoi.

### D8 · Favoris `[INF]` — F06
Deux onglets.
**« Offres » :** missions mises de côté, avec indication des offres expirées ou
pourvues depuis l'ajout. Actions : postuler, retirer.
**« Établissements » :** structures suivies, avec compteur d'offres ouvertes.
**Actions communes :** ajouter, supprimer, sélection multiple pour suppression groupée.
**États :** liste vide avec incitation à explorer.

### D9 · Mes candidatures `[INF]` — F07
**Contenu :** filtres par statut — **En attente · Acceptée · Refusée · Retirée ·
Expirée**. Chaque ligne : mission, établissement, date de candidature, statut,
date de dernière mise à jour. Tri : plus récentes en premier.
**États :** aucune candidature, chargement.

### D10 · Détail d'une candidature `[INF]` — F07
**Contenu :** rappel de la mission, **frise chronologique des étapes** (envoyée →
consultée → en cours d'examen → décision), message de l'établissement le cas
échéant, documents transmis.
**Actions :** **retirer ma candidature** (confirmation explicite, irréversible),
consulter la mission.
**Si acceptée :** accès au contrat ou à la confirmation de mission générée
automatiquement (F11), avec téléchargement.

### D11 · Calendrier et disponibilités `[INF]` — F09
Onglet majeur de l'espace infirmier.
**Contenu :** calendrier mensuel (vues semaine et liste), superposition de trois
couches distinctes : **disponibilités déclarées**, **indisponibilités**,
**missions affectées**. Légende visible. Sélecteur de période en en-tête.
**Bascule « Historique »** en en-tête → D14.
**Actions :** créer un intervalle (→ D12), éditer, supprimer, naviguer entre les mois.

### D12 · Saisie d'un intervalle `[INF]` — F09
**Contenu :** type (disponible / indisponible), date de début et de fin, horaires
ou créneau (journée, nuit, matin, après-midi), note facultative.
**Actions :** enregistrer, supprimer.
**Validation :** chevauchement avec un intervalle existant du même type refusé,
avec proposition de fusion.

### D13 · Zone de mobilité `[INF]` — F09
Accessible depuis le calendrier et depuis le profil.
**Contenu :** rayon avec aperçu cartographique, secteurs ou départements
additionnels, exclusions, moyen de transport, temps de trajet maximum.
**Retour visuel :** nombre de missions ouvertes couvertes par le réglage.

### D14 · Historique des missions `[INF]` — F10
Accessible par bascule depuis le calendrier (D11).
**Contenu :** liste chronologique par statut — **Affectées · En cours · À venir ·
Annulées · Passées**. Chaque entrée : établissement, dates, service, statut,
rémunération.
**Filtres :** période, établissement, statut, spécialité.
**Actions :** consulter le détail (→ D15), retélécharger un contrat.

### D15 · Détail d'une mission effectuée `[INF]` — F10
**Contenu :** récapitulatif complet, **historique des changements d'état horodaté**
(candidature, acceptation, confirmation, réalisation, annulation avec motif),
documents associés (contrat, confirmation), heures réalisées, établissement.
**Actions :** télécharger les documents, signaler un problème, repostuler auprès
de l'établissement.

### D16 · Notifications `[INF]` — F11
**Contenu :** liste chronologique groupée par jour, distinction lu / non lu.
**Types :** nouvelle mission correspondant au profil (déclenchée par le matching),
changement de statut de candidature, contrat disponible, rappel de mission à venir,
rappel de disponibilités non renseignées.
**Actions :** marquer comme lu, tout marquer comme lu, accéder à l'élément
concerné, supprimer, accès aux préférences (D17).

### D17 · Profil et paramètres `[INF]` — F03
Écran de menu.
**En-tête :** avatar, nom, qualification, complétude du profil, statut de
vérification du dossier.
**Entrées :** Profil professionnel (D18) · Documents et justificatifs (D19) ·
Disponibilités et mobilité (D11 / D13) · Préférences de notification ·
Changement de mot de passe (A6) · Aide et contact · Déconnexion ·
Supprimer mon compte.

### D18 · Édition du profil professionnel `[INF]`
Reprise éditable de B2 à B5, en sections repliables : identité, localisation,
qualification, diplômes, compétences, expériences, expérience par service, mobilité.
**Comportement :** édition et enregistrement section par section, complétude mise
à jour en direct, avertissement lorsqu'une modification impacte le matching.

### D19 · Documents et justificatifs `[INF]` — F14
**Contenu :** liste des pièces (diplômes, carte professionnelle, pièce d'identité),
avec pour chacune : type, date d'ajout, **statut de vérification** (en attente,
vérifié, refusé avec motif), date d'expiration le cas échéant.
**Actions :** ajouter, remplacer, supprimer, prévisualiser.
**Sécurité :** **documents d'identité chiffrés au repos et en transit**, accès
journalisé — c'est ici que se matérialise l'exigence de chiffrement des données
sensibles de F01.

### D20 · Vérification du dossier `[INF]` — F14
**Contenu :** liste des contrôles avec leur état — **RPPS** (vérifié contre le
référentiel), **diplômes**, **références professionnelles**, **pièce d'identité**.
Pour chacun : statut, date, motif en cas de refus, action corrective.
**Actions :** relancer une vérification, fournir un complément, contacter le support.
**Impact :** un dossier non validé bloque la candidature — rappelé explicitement.

---

## E. Espace Entreprise

> Les sous-types **établissement** et **agence d'intérim** partagent la même
> ossature ; l'agence dispose en plus d'une dimension multi-établissements
> (offres publiées pour le compte de clients).

### E1 · Tableau de bord entreprise `[ENT]` — F03
**Blocs :**
- **Indicateurs clés** — offres ouvertes, candidatures en attente, missions à
  venir, **offres non pourvues à relancer** (F11).
- **Candidatures à traiter** — file prioritaire, avec ancienneté de la candidature
  pour éviter les délais de réponse.
- **Profils suggérés** — infirmiers disponibles correspondant aux offres ouvertes
  (F13), avec score et raison de la suggestion.
- **Missions du jour / de la semaine.**
- **Alertes** — compte non validé, FINESS en revue, offres expirant sous 48 h.
**Navigation :** Tableau de bord · Offres · Candidatures · Profils · Planning ·
Import API · Paramètres.

### E2 · Mes offres `[ENT]`
**Contenu :** filtres par statut — **Brouillon · Publiée · Pourvue · Expirée ·
Archivée** — et par service, spécialité, période. Chaque ligne : intitulé,
service, dates, nombre de candidatures, nombre de vues, statut, **origine
(manuelle ou importée par API, cf. F12)**.
**Actions :** créer, dupliquer, publier, dépublier, archiver, **relancer** une
offre non pourvue.

### E3 · Créer / éditer une offre `[ENT]`
Formulaire de publication, également utilisé pour corriger une offre importée.
**Champs :** intitulé, service, spécialité, qualification requise, compétences,
dates et horaires, nombre de postes, rémunération, description, conditions
particulières, date limite, établissement concerné (cas agence).
**Aides :** libellés normalisés proposés par autocomplétion (cohérence avec le
nettoyage F12), aperçu de l'offre telle que la verra l'infirmier, **estimation du
nombre de profils correspondants** avant publication.
**Actions :** enregistrer en brouillon, prévisualiser, publier.

### E4 · Détail d'une offre `[ENT]`
**Contenu :** contenu de l'offre, statistiques (vues, candidatures, conversion),
liste des candidatures reçues, profils suggérés non candidats, historique des
actions (publication, modification, relance).
**Actions :** modifier, dupliquer, dépublier, relancer, clôturer.

### E5 · Candidatures reçues `[ENT]` — F07
File de traitement, toutes offres confondues ou filtrée par offre.
**Contenu :** liste des candidats avec photo, nom, qualification, expérience clé,
distance, **score de correspondance** (F13), date de candidature, statut.
**Filtres et tri :** par offre, par score, par ancienneté, par statut.
**Actions rapides :** consulter le profil (→ E6), présélectionner, accepter, refuser.
**États :** aucune candidature, traitement en masse (sélection multiple).

### E6 · Profil infirmier (vue entreprise) `[ENT]`
**Contenu :** identité dans les limites autorisées — **pas d'adresse précise** —,
qualification, diplômes, compétences, expérience et expérience par service,
mobilité, disponibilités pertinentes pour l'offre, statut de vérification du
dossier (F14).
**Indicateur :** détail du score de correspondance, critère par critère.
**Actions :** accepter, refuser, contacter.
**Confidentialité :** les coordonnées complètes ne sont révélées qu'après acceptation.

### E7 · Décision sur une candidature `[ENT]` — F07
**Acceptation :** récapitulatif de la mission et du candidat, vérification des
prérequis (dossier vérifié, disponibilité), message facultatif, **génération
automatique du contrat ou de la confirmation de mission** à partir d'un template
(F11) avec prévisualisation avant envoi.
**Refus :** motif à sélectionner dans une liste fermée, message facultatif.
**Conséquence :** notification immédiate au candidat, mise à jour du statut de
l'offre si tous les postes sont pourvus.

### E8 · Recherche de profils `[ENT]` — F13
Recherche active dans le vivier d'infirmiers disponibles.
**Critères :** qualification, spécialité, compétences, localisation et distance,
disponibilité sur une période, expérience minimale, statut de vérification.
**Résultats :** cartes de profil avec score, distance et disponibilité, tri par
pertinence.
**Actions :** consulter, inviter à candidater sur une offre.

### E9 · Planning des missions `[ENT]` — F10
**Contenu :** vue mensuelle et hebdomadaire, missions par service, postes pourvus
et non pourvus, infirmiers affectés.
**Bascule « Historique » :** missions passées, annulées, en cours, à venir, avec
leur état et leur historique horodaté.
**Actions :** consulter une mission, créer une offre à partir d'un créneau non pourvu.

### E10 · Sources et import API `[ENT]` — F12
Administration de la récupération automatisée d'offres.
**Contenu :** liste des sources configurées (nom, type, dernière synchronisation,
état), planification de la fréquence, statut de la dernière exécution.
**Actions :** ajouter une source, tester la connexion, lancer une synchronisation
manuelle, activer / désactiver, supprimer.

### E11 · Journal de traitement des données `[ENT]` — F12
Restitution du **nettoyage automatisé** appliqué aux offres importées.
**Contenu :** par exécution — offres récupérées, **normalisées** (libellés de
poste ramenés au référentiel), **dédoublonnées**, **converties** (formats de
dates et de lieux), **rejetées** avec motif.
**Détail par offre :** valeur brute d'origine ↔ valeur normalisée, permettant de
comprendre et de corriger une transformation.
**Actions :** corriger manuellement une offre, forcer la publication d'une offre
rejetée, exclure un doublon, exporter le journal.
**Enjeu :** c'est l'écran qui rend la chaîne de traitement auditable — sans lui,
le nettoyage est une boîte noire.

### E12 · Notifications entreprise `[ENT]` — F11
**Types :** nouvelle candidature, candidature retirée, **offre non pourvue au-delà
du délai** (relance automatique), profil correspondant nouvellement disponible,
échec d'import API, document candidat à vérifier.
**Actions :** identiques à D16.

### E13 · Paramètres entreprise `[ENT]`
**Entrées :** informations de la structure (C2), FINESS et statut de vérification
(C3), référents et utilisateurs du compte avec rôles, **modèles de contrat et de
confirmation de mission** (templates F11), préférences de notification,
**règle de relance automatique** (délai avant relance d'une offre non pourvue, F11),
sources API (E10), changement de mot de passe, suppression du compte.

---

## Comportement responsive

Un « écran » de cet inventaire est une **vue**, pas nécessairement une page. Sur
grand écran, plusieurs vues mobiles cohabitent dans une même page — c'est le
bénéfice principal du passage au web, et cela réduit le nombre de pages à router.

### Écrans qui fusionnent à partir de `lg` (≥ 1024px)

| Vues mobiles | Deviennent | Effet |
|---|---|---|
| **D2** Recherche + **D3** Filtres + **D4** Résultats | Une page `/missions` : colonne de filtres 280px persistante à gauche, résultats à droite, recherche en en-tête | 3 vues → 1 page |
| **D4** Résultats + **D5** Détail | Liste-détail : liste 380px à gauche, mission sélectionnée à droite | Plus d'aller-retour |
| **D17** Menu Profil + **D18**–**D20** | Une page `/profil` avec navigation secondaire verticale à gauche | L'écran-menu disparaît |
| **D11** Calendrier + **D12** Saisie d'intervalle | Calendrier pleine largeur + panneau latéral du jour ; la saisie devient une boîte de dialogue | Contexte conservé |
| **E5** Candidatures + **E6** Profil candidat | Tableau à gauche, profil en panneau latéral 420px | Traitement en série sans perte de file |
| **E2** Mes offres + **E4** Détail d'offre | Tableau + panneau latéral, ou page dédiée pour l'édition | — |
| **A2** Choix du profil + **A3** Connexion | Une page `/connexion` : sélecteur segmenté Infirmier / Entreprise au-dessus du formulaire | 2 vues → 1 page |
| **E10** Sources + **E11** Journal | Une page `/import` à deux onglets | — |

**Bilan :** 53 vues → **≈ 38 pages routées** sur desktop, les mêmes 53 vues
restant distinctes sous 600px.

### Écrans dont la nature change

| Écran | Adaptation web |
|---|---|
| **B1–B8**, **C1–C6** *(assistants)* | Indicateur d'étapes vertical à gauche + formulaire à droite. Les étapes franchies redeviennent accessibles. Deux à trois champs par ligne au lieu d'un. |
| **D9** Mes candidatures, **E2**, **E5** | Passent de la **liste de cartes** au **tableau dense** triable et paginé. Sous 600px, retour aux cartes. |
| **E11** Journal de traitement | Tableau large avec colonnes *valeur brute ↔ valeur normalisée* côte à côte — impossible à lire sur mobile, où il devient une liste dépliable. |
| **E9** Planning | Vue mois pleine largeur multi-ressources (un infirmier par ligne), inenvisageable sur mobile où il reste une liste chronologique. |
| **D16**, **E12** Notifications | Popover des 10 dernières depuis la barre haute + page dédiée pour l'historique complet. |

### Exigences propres au web

Ces points n'existaient pas dans une conception mobile et sont **obligatoires** :

1. **URL signifiante et partageable** pour chaque vue — une offre, une candidature,
   un profil candidat doivent être adressables (`/missions/1842`). Les filtres de
   recherche se reflètent dans la query string afin qu'une recherche puisse être
   copiée-collée ou mise en favori du navigateur.
2. **Bouton retour du navigateur fonctionnel**, y compris à la fermeture d'un
   panneau latéral ou d'une boîte de dialogue.
3. **Rafraîchissement de page sans perte d'état** — un assistant d'inscription
   rechargé reprend à son étape.
4. **Navigation entièrement au clavier**, calendrier et tableaux compris.
5. **Deux sessions ouvertes simultanément** (deux onglets) doivent rester
   cohérentes — en particulier sur E5, où deux recruteurs peuvent traiter la même
   candidature. Prévoir la gestion du conflit d'écriture.
6. **Impression** : l'écran D15 (détail de mission) et le contrat généré doivent
   disposer d'une feuille d'impression correcte.
7. **États transverses** — chaque page porte ses propres états *vide, chargement,
   erreur, accès refusé*. Ils ne font plus l'objet d'écrans dédiés ; seuls 404,
   accès refusé et maintenance restent des pages pleines.

---

## Récapitulatif V1

| Domaine | Écrans |
|---|---|
| A · Commun & Authentification | 6 |
| B · Onboarding infirmier | 8 |
| C · Onboarding entreprise | 6 |
| D · Espace infirmier | 20 |
| E · Espace entreprise | 13 |
| **Total V1** | **53** |

Soit **≈ 38 pages routées** sur desktop après fusion (§Comportement responsive),
pour 53 vues distinctes sous 600px.

**Chemin critique** (à construire en premier) :
`A2 → A3 → B1…B8 → D1 → D2/D3/D4 → D5 → D7 → D9 → D11 → D16`
côté entreprise : `C1…C6 → E1 → E3 → E5 → E6 → E7`

**Couverture fonctionnelle**

| Spec | Écrans |
|---|---|
| F01 Connexion | A1–A6 |
| F02 Inscription infirmier | B1–B8 — **partielle, cf. Points à trancher n°1** |
| F02 bis Inscription établissement | C1–C6 |
| F03 Accueil / tableau de bord | D1, D17, E1 |
| F05 Recherche | D2, D3, D4 |
| F06 Favoris | D6, D8 |
| F07 Candidatures | D7, D9, D10, E5, E6, E7 |
| F09 Disponibilités et mobilité | B6, D11, D12, D13 |
| F10 Historique des missions | D14, D15, E9 |
| F11 Notifications | D16, E12, E13 (templates et relance) |
| F12 Publication via API | E2, E3, E10, E11 |
| F13 Matching déterministe | D1, D4, E1, E5, E6, E8 |
| F14 Vérification du dossier | D19, D20 |

---

## Annexe — Reporté hors V1

| Fonctionnalité | Version | Écran concerné |
|---|---|---|
| Attestation sur l'honneur (2 ans d'expérience) + document | V2 | nouvelle étape après B6 |
| Ajout de plusieurs CV et sélection au moment de candidater | V2 | nouvel écran + impact D7, D19, E6 |
| Alerte de conflit de calendrier | V2 | D11, D12, D7 |
| Duplication de disponibilité / indisponibilité (type agenda) | V2 | D12 |
| Export vers calendrier personnel (Google, iCal) | V3 | D11 |
| Algorithme de suggestions élargies (profils proches mais différents) | V2 | D1, E1, E8 |

---

## Annexe — Écrans retirés de l'inventaire

Supprimés sur décision, conservés ici pour mémoire :

| Écran retiré | Contenait | Conséquence |
|---|---|---|
| **B7** Coordonnées bancaires (onboarding) | Titulaire, IBAN, BIC, chiffrement, masquage après saisie | Le RIB n'est plus collecté à l'inscription |
| **D20** Coordonnées bancaires (paramètres) | Consultation et modification du RIB avec ré-authentification | Plus de gestion du RIB dans le profil |
| **F1** Back-office administrateur | Validation des comptes entreprise, des dossiers infirmiers, modération, référentiels, audit | Aucune interface interne prévue |
| **F2** Écrans d'état | Vide, chargement, erreur, 404, accès refusé, maintenance, session expirée | Traités page par page, cf. §Exigences web n°7 |
| **F3** Écrans légaux | CGU, confidentialité, mentions légales, cookies | Plus de page dédiée |
| **F4** Confidentialité et données (RGPD) | Consentements, export, suppression de compte, destinataires | Seule la suppression de compte subsiste, dans D17 |
| **F5** Sécurité et connexion | Sessions actives, comptes OAuth liés, journal des connexions | Seul le changement de mot de passe subsiste, dans D17 / A6 |

---

## Points à trancher

1. **Le RIB était dans la spec F02 V1.** Sa suppression rend la couverture de F02
   partielle : « RIB (Attention Chiffrement des données sensibles) » n'a plus
   d'écran. L'exigence de chiffrement de F01 reste démontrable via les **documents
   d'identité** (D19), mais il faudra assumer cet écart si F02 est évaluée telle
   qu'écrite. À confirmer, ou à réintroduire plus tard avec un module de paiement.

2. **Les CGU restent à cocher en B7 et C5, mais leur contenu n'a plus d'écran.**
   Deux issues possibles : afficher le texte dans un panneau ouvert depuis la case
   à cocher (suffisant, et déjà décrit dans B7), ou pointer vers une page externe
   au produit. À trancher — une case « J'accepte les CGU » sans texte consultable
   n'est pas opposable.

3. **Plus d'interface d'administration.** La validation des comptes entreprise
   (FINESS) et des dossiers infirmiers (RPPS, F14) est décrite comme un processus
   dans C6, B8, D20 et E1, mais **aucun écran ne permet de l'effectuer**. Soit ces
   contrôles sont entièrement automatiques, soit ils se font hors application
   (accès direct à la base). À clarifier, car F14 est une fonctionnalité attendue.

4. **Recherches enregistrées.** Le titre de F06 annonce « Favoris **et recherches
   enregistrées** », mais le corps de la V1 ne décrit que la sauvegarde d'offres
   et d'établissements. L'écran est donc écarté. À confirmer.

5. **Favoris côté entreprise.** F06 décrit les favoris du seul point de vue de
   l'infirmier. L'entreprise agit depuis E5 et E8. À confirmer.

6. **Création manuelle d'offre (E3).** F12 décrit l'arrivée des offres **par API**.
   E3 est une extrapolation nécessaire en pratique (corriger une offre importée,
   publier sans source externe). À confirmer, sinon E3 se réduit à un écran
   d'édition d'offre importée.

7. **F04 et F08 sont absents** de la liste de fonctionnalités fournie. Si ces
   numéros correspondent à des fonctionnalités réelles, l'inventaire est incomplet.

8. **Messagerie.** D10 et E6 supposent un contact entreprise ↔ infirmier.
   À confirmer : messagerie intégrée, ou simple révélation des coordonnées après
   acceptation (hypothèse retenue par défaut).

9. **Signature du contrat.** F11 prévoit la génération automatique d'un contrat ;
   le parcours de signature n'est pas défini. En l'état, le contrat est **généré
   et téléchargeable** (D10, E7), sans signature en ligne.

10. **Référentiels à figer.** Les listes de spécialités et de qualifications sont
    marquées « à confirmer » dans F05 — elles structurent B4, D3, E3 et l'algorithme
    F13. À arrêter avant de construire ces écrans.
