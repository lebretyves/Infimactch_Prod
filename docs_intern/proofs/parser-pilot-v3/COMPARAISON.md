# Parseur V3 : classement et informations manquantes

Essai local, lecture seule, aucun appel API ni LLM. 24 annonces historiques (dont CDI desactives, conserves comme cas de regression) + 12 nouvelles annonces France Travail. Pas de nouveau lot JobsPipe hors du corpus disponible.

Sur 40 points cibles relus : 9 retrouves par V2, 40 par V3. Ce lot a servi a ajuster les regles : ce n est pas un benchmark aveugle, ni une garantie de precision globale.

26 tests de regression du prototype passes. Aucun raccordement de V3 au catalogue ou matching.

Changements : services et gestes supplementaires ; handicap candidat distinct des patients ; transport sanitaire distinct des frais ; experience souhaitee distincte du service ; acomptes, taux et indemnites ; nombre de jours/pause ; alerte temps plein/partiel ; dates a completer.

Limites : alternatives encore parfois en texte, composantes de salaire a reconcilier, portee des exigences et negations complexes a revoir, localisation textuelle fine et jours nommes non entierement structures. Les textes coupes ne peuvent etre reconstitues.

Chaque passage numerique ou sensible rejoint une file de relecture meme si une partie est extraite. Cette file est heuristique et ne garantit pas la detection de toutes les omissions.

## Infirmier D.E (H/F)

ID : 3da4000c-d76c-400b-ae73-b2cbd2097199

Les deux taux 10% sont conserves ensemble : attribution IFM/CP a verifier. Avantages agence distincts du poste.

Alertes : aucune automatique

| Champ attendu | Avant | Apres |
|---|---|---|
| acompte  | non | oui |
| taux_avantages  | non | oui |
| service EHPAD | oui | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "EHPAD" | MENTION_A_CONFIRMER | Infirmier en EHPAD |
| service | "EHPAD" | MENTION_A_CONFIRMER | Vitalis Médical Pau recrute pour l'un de ses clients à Billère Vitalis Médical Pau accompagne l'un de ses clients dans le recrutement d'un infirmier H/F pour un EHPAD situé à Billère, engagé dans une démarche de qualité et de prévention |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Vos missions: Assurer les soins préventifs et curatifs auprès des résidents Identifier les situations à risque et mettre en place des actions adaptées Collaborer avec les familles et les intervenants extérieurs Participer à l'amélioration continue des pratiques de soins Votre profil: Diplôme d'État d'Infirmier Sens de l'observation et capacité d'analyse Engagement dans une démarche de qualité Pourquoi choisir Vitalis Médical Pau |
| avantage | "MUTUELLE" | A_STRUCTURER | Mutuelle d'entreprise + accès au FASTT |
| api_lieu | "64 - Billère" | NON_VERIFIE | "64 - Billère" |
| api_salaire | "Horaire de 13.0 Euros à 20.0 Euros" | NON_VERIFIE | "Horaire de 13.0 Euros à 20.0 Euros" |
| acompte | {"frequency":2,"period":"semaine"} | EXPLICITE | - Acomptes 2 fois par semaine |
| taux_avantages | {"rates":[10,10],"assignment":"A_CONFIRMER_PAR_COMPOSANTE"} | EXPLICITE | Indemnités de fin de mission et congés payés (10 % + 10 %) |

## Infirmier D.e H/f En Pneumologie Soins Intensif

ID : 4953f3f9-5e24-4e49-9027-937128e95bd1

22 euros brut sans unite horaire explicite. Montant transport 3.38 sans devise explicite : ne pas inventer EUR. Distinguer maitrise requise et experience souhaitee.

Alertes : HORAIRES_API_TEXTE_A_RECONCILIER

| Champ attendu | Avant | Apres |
|---|---|---|
| service PNEUMOLOGIE | non | oui |
| service SOINS_INTENSIFS | non | oui |
| competence VENTILATION_MECANIQUE | non | oui |
| alternance JOUR_NUIT | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Surveiller l'état clinique des patients, adapter les soins et anticiper les complications |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Horaires : Jour et/ou nuit selon planning |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Diplôme d'État d'infirmier(ère) et inscription à l'Ordre des Infirmiers |
| certification | "ORDRE_INFIRMIER" | MENTION_A_CONFIRMER | Diplôme d'État d'infirmier(ère) et inscription à l'Ordre des Infirmiers |
| experience_domaine | "REANIMATION" | SOUHAITE | - Expérience en soins intensifs, réanimation ou pneumologie fortement souhaitée |
| experience_non_chiffree | "- Expérience en soins intensifs, réanimation ou pneumologie fortement souhaitée" | SOUHAITE | - Expérience en soins intensifs, réanimation ou pneumologie fortement souhaitée |
| remuneration_texte | "Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| avantage | "PRIMES" | A_STRUCTURER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |
| service | "PNEUMOLOGIE" | MENTION_A_CONFIRMER | Infirmier D.e H/f En Pneumologie Soins Intensif |
| service | "SOINS_INTENSIFS" | MENTION_A_CONFIRMER | Infirmier D.e H/f En Pneumologie Soins Intensif |
| service | "PNEUMOLOGIE" | MENTION_A_CONFIRMER | Notre agence d'intérim TAGA MEDICAL, spécialisée dans le secteur médical,recherche pour le compte de l'un de ses clients situé dans le 15eme arrondissement, un(e) Infirmier(ère) diplômé(e) d'État pour intégrer l'unité de soins intensifs pneumologiques d'un hôpital reconnu |
| service | "SOINS_INTENSIFS" | MENTION_A_CONFIRMER | Notre agence d'intérim TAGA MEDICAL, spécialisée dans le secteur médical,recherche pour le compte de l'un de ses clients situé dans le 15eme arrondissement, un(e) Infirmier(ère) diplômé(e) d'État pour intégrer l'unité de soins intensifs pneumologiques d'un hôpital reconnu |
| competence | "VENTILATION_MECANIQUE" | MENTION_A_CONFIRMER | Participer à la mise en œuvre et au suivi des protocoles de ventilation mécanique et autres traitements spécifiques |
| alternance | "JOUR_NUIT" | EXPLICITE | Horaires : Jour et/ou nuit selon planning |
| experience_domaine | "PNEUMOLOGIE" | SOUHAITE | Expérience en soins intensifs, réanimation ou pneumologie fortement souhaitée. |
| experience_domaine | "SOINS_INTENSIFS" | SOUHAITE | Expérience en soins intensifs, réanimation ou pneumologie fortement souhaitée. |
| competence | "VENTILATION_MECANIQUE" | EXIGENCE_TEXTE | Maîtrise des techniques de ventilation mécanique et des soins critiques. |
| taux_avantages | {"rates":[10,10],"assignment":"A_CONFIRMER_PAR_COMPOSANTE"} | EXPLICITE | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |

## Infirmier en EHPAD à Pontacq - Vitalis Médical Pau recrute pour l'un de ses clients (H/F)

ID : 17c6c4be-4b00-4940-87ec-6dcfc47dc887

Pansements/injections ajoutes ; experience geriatrie souhaitee, pas duree imposee.

Alertes : aucune automatique

| Champ attendu | Avant | Apres |
|---|---|---|
| competence PANSEMENTS | non | oui |
| competence INJECTIONS | non | oui |
| experience_domaine GERIATRIE | oui | oui |
| acompte  | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "EHPAD" | MENTION_A_CONFIRMER | Infirmier en EHPAD à Pontacq - Vitalis Médical Pau recrute pour l'un de ses clients (H/F) |
| service | "EHPAD" | MENTION_A_CONFIRMER | Vitalis Médical Pau, agence spécialisée dans le secteur médico-social, recherche pour l'un de ses clients un infirmier H/F pour intervenir en EHPAD à Pontacq |
| experience_domaine | "GERIATRIE" | SOUHAITE | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau |
| competence | "TRACABILITE" | SOUHAITE | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau |
| competence | "SURVEILLANCE" | SOUHAITE | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau |
| competence | "HYGIENE" | SOUHAITE | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau |
| certification | "DIPLOME_INFIRMIER" | SOUHAITE | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau |
| experience_non_chiffree | "Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau" | SOUHAITE | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité Votre profil: Diplôme d'État d'Infirmier Sens du contact, bienveillance et esprit d'équipe Expérience en gériatrie appréciée Pourquoi choisir Vitalis Médical Pau |
| avantage | "MUTUELLE" | A_STRUCTURER | Mutuelle d'entreprise + accès au FASTT |
| api_lieu | "64 - Pontacq" | NON_VERIFIE | "64 - Pontacq" |
| api_salaire | "Horaire de 13.0 Euros à 20.0 Euros" | NON_VERIFIE | "Horaire de 13.0 Euros à 20.0 Euros" |
| competence | "PANSEMENTS" | MENTION_A_CONFIRMER | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité |
| competence | "INJECTIONS" | MENTION_A_CONFIRMER | Vos missions: Réaliser les soins infirmiers auprès des résidents (pansements, injections, surveillance...) Participer aux transmissions et à la coordination des soins Contribuer à la qualité de vie des résidents en lien avec l'équipe pluridisciplinaire Veiller au respect des protocoles d'hygiène et de sécurité |
| acompte | {"frequency":2,"period":"semaine"} | EXPLICITE | - Acomptes 2 fois par semaine |
| taux_avantages | {"rates":[10,10],"assignment":"A_CONFIRMER_PAR_COMPOSANTE"} | EXPLICITE | Indemnités de fin de mission et congés payés (10 % + 10 %) |

## INFIRMIER DE EN CHIRURGIE (F/H)

ID : afd45bd3-3b88-4892-b6f5-45046a3fc4dd

Passage au bloc decrit le parcours patient ; aucune affectation au bloc deduite. Texte possiblement incomplet.

Alertes : aucune automatique

| Champ attendu | Avant | Apres |
|---|---|---|
| service CHIRURGIE | non | oui |
| competence DRAINS_REDONS | non | oui |
| competence DOULEUR | non | oui |
| contexte_parcours  | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| contexte_parcours | "BLOC" | NE_PROUVE_PAS_SERVICE_AFFECTATION | Vos missions principales,Au sein d'une équipe pluridisciplinaire dynamique, vous assurerez la prise en charge globale des patients en pré et post-opératoire :- Accueil et préparation des patients avant leur passage au bloc opératoire.- Surveillance post-interventionnelle et suivi de l'état clinique (constantes, pansements, gestion des drains et redons).- Évaluation et prise en charge de la douleur (application des protocoles d'analgésie) |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Vos missions principales,Au sein d'une équipe pluridisciplinaire dynamique, vous assurerez la prise en charge globale des patients en pré et post-opératoire :- Accueil et préparation des patients avant leur passage au bloc opératoire.- Surveillance post-interventionnelle et suivi de l'état clinique (constantes, pansements, gestion des drains et redons).- Évaluation et prise en charge de la douleur (application des protocoles d'analgésie) |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 2 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 2 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |
| service | "CHIRURGIE" | MENTION_A_CONFIRMER | INFIRMIER DE EN CHIRURGIE (F/H) |
| competence | "PANSEMENTS" | MENTION_A_CONFIRMER | Vos missions principales,Au sein d'une équipe pluridisciplinaire dynamique, vous assurerez la prise en charge globale des patients en pré et post-opératoire :- Accueil et préparation des patients avant leur passage au bloc opératoire.- Surveillance post-interventionnelle et suivi de l'état clinique (constantes, pansements, gestion des drains et redons).- Évaluation et prise en charge de la douleur (application des protocoles d'analgésie) |
| competence | "DRAINS_REDONS" | MENTION_A_CONFIRMER | Vos missions principales,Au sein d'une équipe pluridisciplinaire dynamique, vous assurerez la prise en charge globale des patients en pré et post-opératoire :- Accueil et préparation des patients avant leur passage au bloc opératoire.- Surveillance post-interventionnelle et suivi de l'état clinique (constantes, pansements, gestion des drains et redons).- Évaluation et prise en charge de la douleur (application des protocoles d'analgésie) |
| competence | "DOULEUR" | MENTION_A_CONFIRMER | Vos missions principales,Au sein d'une équipe pluridisciplinaire dynamique, vous assurerez la prise en charge globale des patients en pré et post-opératoire :- Accueil et préparation des patients avant leur passage au bloc opératoire.- Surveillance post-interventionnelle et suivi de l'état clinique (constantes, pansements, gestion des drains et redons).- Évaluation et prise en charge de la douleur (application des protocoles d'analgésie) |

## INFIRMIER (H/F)

ID : df118e03-d0ea-4266-b40a-f5cba04e2015

Condition experience cite une regle et une exception : conservee pour relecture, jamais convertie en filtre legal automatique. Horaire 12h, convention sans salaire chiffre. Frais kilometriques sans montant.

Alertes : aucune automatique

| Champ attendu | Avant | Apres |
|---|---|---|
| competence PERFUSIONS | non | oui |
| competence MEDICAMENTS | non | oui |
| condition_experience  | non | oui |
| duree_poste_heures 12 | non | oui |
| remuneration_non_chiffree true | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "SMR" | MENTION_A_CONFIRMER | NJ INTERIM, agence de recrutement spécialisée dans le domaine médical, médico-social, recherche pour un de ses clients, Clinique de soins de suite SMR/Médecine, un(e) Infirmier(e) D |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | NJ INTERIM, agence de recrutement spécialisée dans le domaine médical, médico-social, recherche pour un de ses clients, Clinique de soins de suite SMR/Médecine, un(e) Infirmier(e) D |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | E pour des missions d'intérim ponctuelles à Riom Es Montages (15) |
| competence | "PRELEVEMENTS" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| competence | "TRACABILITE" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| competence | "SURVEILLANCE" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| contrat_texte | "CDD" | EXPLICITE_A_VERIFIER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| experience_duree | {"amount":2,"unit":"ANS"} | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| horaires_detail | "Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h" | HORAIRES_A_STRUCTURER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| remuneration_texte | "Rémunération : à convenir selon convention collective + prime ségur + remboursement des frais kilométriques" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération : à convenir selon convention collective + prime ségur + remboursement des frais kilométriques |
| avantage | "PRIMES" | A_STRUCTURER | Rémunération : à convenir selon convention collective + prime ségur + remboursement des frais kilométriques |
| api_lieu | "15 - Aurillac" | NON_VERIFIE | "15 - Aurillac" |
| api_salaire | "Horaire de 13.0 Euros à 20.0 Euros - prime ségur + frais kilométriques" | NON_VERIFIE | "Horaire de 13.0 Euros à 20.0 Euros - prime ségur + frais kilométriques" |
| competence | "PANSEMENTS" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| competence | "INJECTIONS" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| competence | "PERFUSIONS" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| competence | "MEDICAMENTS" | SOUHAITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| alternance | "JOUR_NUIT" | EXPLICITE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| condition_experience | "Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h" | CONDITION_A_VERIFIER_NON_APPLIQUEE | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| duree_poste_heures | 12 | EXPLICITE_A_VERIFIER | Missions : En collaboration avec la direction des soins et l'ensemble de l'équipe soignante, vos tâches seront les suivantes : Soins de base : pansements, simples et complexes, prélèvements, prise et analyse de constantes et injections, préparation et administration de la prise de médicaments, traitements spécifiques, surveillance d'éventuels effets secondaires, Soins techniques : injections, prélèvements, perfusions, pose de dispositifs médicaux Surveiller l'état de santé des patients en prenant en compte les pathologies Préparer et administrer les traitements et suivre les prescriptions Assurer les soins de surveillance et d'urgence Veiller à la traçabilité des actes, mises à jour des dossiers médicaux et des bonnes transmissions Titulaire de DE d'infirmier, première expérience souhaitée (peu importe le service) Vous respectez la loi Valletoux pour effectuer de l'intérim (2 ans en CDD/CDI/Vacations si pas de mission d'intérim effectué avant Juillet 2024) Capacité d'adaptation, disponibilité, réactivité, écoute, empathie, sens du contact sont des points essentiels à la réussite de ce poste Horaires selon planning (possibilité de jour et de nuit) en 12h |
| remuneration_non_chiffree | true | AUCUN_MONTANT_INVENTE | Rémunération : à convenir selon convention collective + prime ségur + remboursement des frais kilométriques. |

## Infirmier d'entreprise H/F - Santé au travail - Paris 16e

ID : 227c351f-e7ac-4ae4-9929-d9b37e421007

CONTRADICTION texte temps partiel 3 jours/semaine versus pied de fiche temps plein. Pause 1h, lundi/mardi/mercredi conserves mais roulement hebdomadaire pas encore entierement structure.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT, TEMPS_PLEIN_PARTIEL_CONTRADICTOIRE

| Champ attendu | Avant | Apres |
|---|---|---|
| jours_travailles_semaine 3 | non | oui |
| pause_minutes 60 | non | oui |
| competence PREMIERS_SECOURS | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "SANTE_TRAVAIL" | MENTION_A_CONFIRMER | Infirmier d'entreprise H/F - Santé au travail - Paris 16e |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Vitalis Médical Paris Sud, agence spécialisée dans le recrutement en intérim, vacation, CDD et CDI dans les secteurs médical, paramédical et social, recrute un(e) Infirmier(ère) en entreprise pour intervenir au sein d'une structure située dans le 16e arrondissement de Paris |
| contrat_texte | "CDD" | EXPLICITE_A_VERIFIER | Vitalis Médical Paris Sud, agence spécialisée dans le recrutement en intérim, vacation, CDD et CDI dans les secteurs médical, paramédical et social, recrute un(e) Infirmier(ère) en entreprise pour intervenir au sein d'une structure située dans le 16e arrondissement de Paris |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Vitalis Médical Paris Sud, agence spécialisée dans le recrutement en intérim, vacation, CDD et CDI dans les secteurs médical, paramédical et social, recrute un(e) Infirmier(ère) en entreprise pour intervenir au sein d'une structure située dans le 16e arrondissement de Paris |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | Vitalis Médical Paris Sud, agence spécialisée dans le recrutement en intérim, vacation, CDD et CDI dans les secteurs médical, paramédical et social, recrute un(e) Infirmier(ère) en entreprise pour intervenir au sein d'une structure située dans le 16e arrondissement de Paris |
| temps_travail | "PARTIEL" | EXPLICITE | Informations complémentaires:Mission à temps partiel : 3 jours par semaine (lundi, mardi et mercredi) |
| horaires_detail | "Horaires : 9h30 à 17h00 (1 heure de pause)" | HORAIRES_A_STRUCTURER | Horaires : 9h30 à 17h00 (1 heure de pause) |
| pause | "Horaires : 9h30 à 17h00 (1 heure de pause)" | EXPLICITE | Horaires : 9h30 à 17h00 (1 heure de pause) |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | Garantir la traçabilité des soins et le suivi des dossiers |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Pré-requisDiplôme d'État d'Infirmier |
| certification | "ORDRE_INFIRMIER" | MENTION_A_CONFIRMER | Inscription à l'Ordre National des Infirmiers |
| experience_domaine | "SANTE_TRAVAIL" | SOUHAITE | Une expérience en entreprise, santé au travail est appréciée |
| experience_non_chiffree | "Une expérience en entreprise, santé au travail est appréciée" | SOUHAITE | Une expérience en entreprise, santé au travail est appréciée |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Type de contrat : Intérim |
| temps_travail | "PLEIN" | EXPLICITE | Temps de travail : Temps plein |
| remuneration_texte | "Salaire : 22 € par heure" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire : 22 € par heure |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 79 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 79 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| jours_travailles_semaine | 3 | EXPLICITE | Informations complémentaires:Mission à temps partiel : 3 jours par semaine (lundi, mardi et mercredi) |
| pause_minutes | 60 | PAIEMENT_NON_DEDUIT | Horaires : 9h30 à 17h00 (1 heure de pause) |
| competence | "PREMIERS_SECOURS" | MENTION_A_CONFIRMER | Assurer la prise en charge des situations d'urgence et les premiers secours |

## Infirmier D.e (h/f) Reanimation Pediatrique

ID : 15a940c1-a68d-4f8c-ab95-9d319050d5f4

Prime nuit/ferie distincte horaire de mission. Indemnite 3.39 EUR/jour travaille reperee. Age exact des enfants absent.

Alertes : HORAIRES_API_TEXTE_A_RECONCILIER

| Champ attendu | Avant | Apres |
|---|---|---|
| service REANIMATION | oui | oui |
| population ENFANTS | oui | oui |
| montant_avantage  | non | oui |
| taux_avantages  | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "REANIMATION" | MENTION_A_CONFIRMER | Infirmier D.e (h/f) Reanimation Pediatrique |
| specialite | "PEDIATRIE" | MENTION_A_CONFIRMER | Infirmier D.e (h/f) Reanimation Pediatrique |
| service | "REANIMATION" | MENTION_A_CONFIRMER | TAGA Médical recherche activement, pour un établissement de santé reconnu situé à Paris 19e, un(e) Infirmier(ère) en Réanimation Pédiatrique |
| specialite | "PEDIATRIE" | MENTION_A_CONFIRMER | TAGA Médical recherche activement, pour un établissement de santé reconnu situé à Paris 19e, un(e) Infirmier(ère) en Réanimation Pédiatrique |
| population | "ENFANTS" | MENTION_A_CONFIRMER | Vous avez à cœur de mettre vos compétences au service d'enfants en situation critique, au sein d'une équipe experte, engagée et bienveillante |
| service | "REANIMATION" | MENTION_A_CONFIRMER | Assurer la prise en charge globale d'enfants en réanimation pédiatrique |
| specialite | "PEDIATRIE" | MENTION_A_CONFIRMER | Assurer la prise en charge globale d'enfants en réanimation pédiatrique |
| population | "ENFANTS" | MENTION_A_CONFIRMER | Assurer la prise en charge globale d'enfants en réanimation pédiatrique |
| service | "REANIMATION" | MENTION_A_CONFIRMER | Réaliser des soins infirmiers techniques spécifiques à la réanimation |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Surveiller étroitement l'état clinique des patients et anticiper les situations d'urgence |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | Appliquer rigoureusement les protocoles de soins, d'hygiène et de sécurité Ce que nous vous proposons : |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Missions de jour et/ou de nuit, selon vos disponibilités |
| horaire_type | "JOUR" | MENTION_A_CONFIRMER | Missions de jour et/ou de nuit, selon vos disponibilités |
| experience_non_chiffree | "Rémunération attractive selon profil et expérience" | MENTION_A_CONFIRMER | Rémunération attractive selon profil et expérience |
| specialite | "PEDIATRIE" | MENTION_A_CONFIRMER | Établissement hautement spécialisé, reconnu pour son expertise pédiatrique |
| experience_domaine | "REANIMATION" | SOUHAITE | Une expérience en pédiatrie et/ou réanimation est appréciée |
| specialite | "PEDIATRIE" | SOUHAITE | Une expérience en pédiatrie et/ou réanimation est appréciée |
| experience_non_chiffree | "Une expérience en pédiatrie et/ou réanimation est appréciée" | SOUHAITE | Une expérience en pédiatrie et/ou réanimation est appréciée |
| experience_non_chiffree | "Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé)" | MENTION_A_CONFIRMER | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| majoration_horaire | "NUIT" | NE_PROUVE_PAS_HORAIRE_POSTE | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| remuneration_texte | "Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé)" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| avantage | "PRIMES" | A_STRUCTURER | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |
| alternance | "JOUR_NUIT" | EXPLICITE | Missions de jour et/ou de nuit, selon vos disponibilités |
| remuneration_non_chiffree | true | AUCUN_MONTANT_INVENTE | Rémunération attractive selon profil et expérience |
| remuneration_non_chiffree | true | AUCUN_MONTANT_INVENTE | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| taux_avantages | {"rates":[10,10],"assignment":"A_CONFIRMER_PAR_COMPOSANTE"} | EXPLICITE | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |
| montant_avantage | {"amount":3.39,"currency":"EUR","period":"jour travaille"} | RATTACHEMENT_A_CONFIRMER | Salaire :selon expérience + 10% de congés payés +10% de prime de précarité, Prime de nuit et jour férié, indemnité de transport en commun (3.39 euros par jour travaillé) |

## INFIRMIER DE (F/H) EPILEPSIE ET NEUROPHYSIOLOGIE

ID : 983659cd-3987-4e8f-b952-e793bca4d6bd

EEG standard/sieste/Holter repere via EEG ; sous-types et materiel restent a structurer. Description coupee.

Alertes : aucune automatique

| Champ attendu | Avant | Apres |
|---|---|---|
| service NEUROPHYSIOLOGIE | non | oui |
| competence EEG | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| specialite | "UROLOGIE" | MENTION_A_CONFIRMER | Au sein d'un établissement hospitalier, vous contribuez à des diagnostics neurologiques fiables et à l'accompagnement attentif des personnes soignées |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 2 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 2 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| service | "NEUROPHYSIOLOGIE" | MENTION_A_CONFIRMER | INFIRMIER DE (F/H) EPILEPSIE ET NEUROPHYSIOLOGIE |
| competence | "EEG" | MENTION_A_CONFIRMER | Vous réalisez les électroencéphalogrammes standards, de sieste et Holter selon les protocoles établis |

## Infirmier / Infirmière en soins généraux (IDE) (H/F)

ID : 3b477dd7-4c68-49e4-bd74-dbeddcf7ff0b

Date a completer explicitement signalee. 1.48 Md EUR de chiffre affaires ignore comme salaire. Vacation en texte peut contredire MIS normalise.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT, DATES_FOURNISSEUR_A_COMPLETER

| Champ attendu | Avant | Apres |
|---|---|---|
| service CHIRURGIE | non | oui |
| dates_incompletes true | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| qualification_titre | "IDE" | EXPLICITE | Infirmier / Infirmière en soins généraux (IDE) (H/F) |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | ACTUAL MÉDICAL (Actual group) Spécialiste du recrutement, de la vacation et de l'intérim dans le médical, le paramédical et le médico-social, ACTUAL MÉDICAL s'appuie sur la force du 6e acteur de l'emploi en France (1,48 Md€ de CA, 600 agences, 32 000 entreprises clientes et +300 000 personnes accompagnées par an) |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | ACTUAL MÉDICAL (Actual group) Spécialiste du recrutement, de la vacation et de l'intérim dans le médical, le paramédical et le médico-social, ACTUAL MÉDICAL s'appuie sur la force du 6e acteur de l'emploi en France (1,48 Md€ de CA, 600 agences, 32 000 entreprises clientes et +300 000 personnes accompagnées par an) |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Assurer les soins et la surveillance pré et postopératoire des patients selon les procédures et prescriptions |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | Type de contrat : Vacation |
| horaires_detail | "Horaires : 7h00" | HORAIRES_A_STRUCTURER | Horaires : 7h00 |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Vous êtes titulaire d'un diplôme d'état d'infirmier(ère) et vous justifiez d'une première expérience significative sur un poste similaire |
| experience_non_chiffree | "Vous êtes titulaire d'un diplôme d'état d'infirmier(ère) et vous justifiez d'une première expérience significative sur un poste similaire" | EXIGENCE_TEXTE | Vous êtes titulaire d'un diplôme d'état d'infirmier(ère) et vous justifiez d'une première expérience significative sur un poste similaire |
| certification | "ORDRE_INFIRMIER" | MENTION_A_CONFIRMER | Vous êtes inscrit(e) à l'Ordre National des Infirmiers |
| api_lieu | "75 - PARIS" | NON_VERIFIE | "75 - PARIS" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_salaire | "Horaire de 19.0 Euros à 21.04 Euros" | NON_VERIFIE | "Horaire de 19.0 Euros à 21.04 Euros" |
| api_horaires | "Temps partiel - 12H/semaine Travail en journée..." | NON_VERIFIE | "Temps partiel - 12H/semaine Travail en journée..." |
| api_competences | [{"code":"107715","label":"Réaliser des soins infirmiers","requirement":"S"}] | NON_VERIFIE | [{"code":"107715","label":"Réaliser des soins infirmiers","requirement":"S"}] |
| api_coordonnees | {"latitude":48.877495,"longitude":2.317589} | NON_VERIFIE | {"latitude":48.877495,"longitude":2.317589} |
| service | "CHIRURGIE" | MENTION_A_CONFIRMER | L'agence Actual Médical de Paris 8ème recrute pour l'un de ses clients, une structure hospitalière dans le 13ème arrondissement , des infirmiers en chirurgie générale (H/F) |
| competence | "PANSEMENTS" | MENTION_A_CONFIRMER | Réaliser des soins techniques et des pansements Les conditions du poste : |
| dates_incompletes | true | INCONNU | Dates de mission : à compléter précisément |
| service | "CHIRURGIE" | MENTION_A_CONFIRMER | Service : Chirurgie générale |

## Infirmier D.e H/f En Nephrologie

ID : 6d39460a-c677-4c85-856e-d3c25602fbfd

Nephrologie du poste distincte experience souhaitee en hemodialyse. 22 euros brut sans periode fiable.

Alertes : HORAIRES_API_TEXTE_A_RECONCILIER

| Champ attendu | Avant | Apres |
|---|---|---|
| service NEPHROLOGIE | non | oui |
| experience_domaine DIALYSE | oui | oui |
| alternance JOUR_NUIT | oui | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Surveiller l'état clinique des patients et participer à l'évaluation de leur évolution |
| competence | "EDUCATION_THERAPEUTIQUE" | MENTION_A_CONFIRMER | Accompagner les patients dans leur parcours de soins et leur éducation thérapeutique |
| service | "DIALYSE" | MENTION_A_CONFIRMER | Participer à la préparation, à la surveillance et au suivi des séances de dialyse selon l'organisation du service |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Participer à la préparation, à la surveillance et au suivi des séances de dialyse selon l'organisation du service |
| alternance | "JOUR_NUIT" | EXPLICITE | Horaire : jour/nuit Profil du candidat : |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Horaire : jour/nuit Profil du candidat : |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Diplôme d'État d'Infirmier(ère) exigé |
| certification | "ORDRE_INFIRMIER" | MENTION_A_CONFIRMER | - Inscription à l'Ordre National des Infirmiers |
| experience_domaine | "DIALYSE" | SOUHAITE | - Une expérience en néphrologie, hémodialyse ou médecine spécialisée est appréciée |
| experience_non_chiffree | "- Une expérience en néphrologie, hémodialyse ou médecine spécialisée est appréciée" | SOUHAITE | - Une expérience en néphrologie, hémodialyse ou médecine spécialisée est appréciée |
| remuneration_texte | "Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| avantage | "PRIMES" | A_STRUCTURER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |
| service | "NEPHROLOGIE" | MENTION_A_CONFIRMER | Infirmier D.e H/f En Nephrologie |
| service | "NEPHROLOGIE" | MENTION_A_CONFIRMER | Notre agence d'intérim spécialisée dans le secteur médical recherche, pour le compte de l'un de ses clients, un(e) Infirmier(ère) Diplômé(e) d'État pour intervenir au sein d'un service de néphrologie d'un établissement hospitalier de référence |
| alternance | "JOUR_NUIT" | EXPLICITE | Horaire : jour/nuit |
| experience_domaine | "NEPHROLOGIE" | SOUHAITE | Une expérience en néphrologie, hémodialyse ou médecine spécialisée est appréciée. |
| taux_avantages | {"rates":[10,10],"assignment":"A_CONFIRMER_PAR_COMPOSANTE"} | EXPLICITE | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |

## Infirmier D.e H/f En Smr Oncologique

ID : 7d59e76f-f509-4fbc-9b30-f89a3762dd0c

Salaire selon profil/reprise anciennete sans montant : aucune estimation. Soins de support en texte restent a enrichir dans referentiel.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Champ attendu | Avant | Apres |
|---|---|---|
| service SMR | oui | oui |
| service ONCOLOGIE | oui | oui |
| remuneration_non_chiffree true | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "SMR" | MENTION_A_CONFIRMER | Infirmier D.e H/f En Smr Oncologique |
| service | "ONCOLOGIE" | MENTION_A_CONFIRMER | Infirmier D.e H/f En Smr Oncologique |
| service | "SMR" | MENTION_A_CONFIRMER | Dans le cadre de missions en vacations pour l'un de nos établissements partenaires situé à Paris, TAGA MEDICAL recherche des Infirmier(e)s Diplômé(e)s d'État pour un service de SMR oncologique |
| service | "ONCOLOGIE" | MENTION_A_CONFIRMER | Dans le cadre de missions en vacations pour l'un de nos établissements partenaires situé à Paris, TAGA MEDICAL recherche des Infirmier(e)s Diplômé(e)s d'État pour un service de SMR oncologique |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | Dans le cadre de missions en vacations pour l'un de nos établissements partenaires situé à Paris, TAGA MEDICAL recherche des Infirmier(e)s Diplômé(e)s d'État pour un service de SMR oncologique |
| service | "SMR" | MENTION_A_CONFIRMER | Vous intégrerez une équipe pluridisciplinaire engagée dans l'accompagnement des patients en phase de réadaptation après un cancer |
| service | "SMR" | MENTION_A_CONFIRMER | Vos missions : Réaliser les soins infirmiers et de support Assurer le suivi clinique des patients Participer au projet thérapeutique personnalisé Accompagner les patients dans leur réadaptation Travailler en lien avec l'équipe pluridisciplinaire Profil du candidat : Diplôme d'État d'Infirmier Intérêt pour les soins de support et la réadaptation Qualités relationnelles et sens de l'écoute Adaptabilité L'entreprise : Notre client est un établissement privé spécialisé dans la réadaptation oncologique |
| service | "ONCOLOGIE" | MENTION_A_CONFIRMER | Vos missions : Réaliser les soins infirmiers et de support Assurer le suivi clinique des patients Participer au projet thérapeutique personnalisé Accompagner les patients dans leur réadaptation Travailler en lien avec l'équipe pluridisciplinaire Profil du candidat : Diplôme d'État d'Infirmier Intérêt pour les soins de support et la réadaptation Qualités relationnelles et sens de l'écoute Adaptabilité L'entreprise : Notre client est un établissement privé spécialisé dans la réadaptation oncologique |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Vos missions : Réaliser les soins infirmiers et de support Assurer le suivi clinique des patients Participer au projet thérapeutique personnalisé Accompagner les patients dans leur réadaptation Travailler en lien avec l'équipe pluridisciplinaire Profil du candidat : Diplôme d'État d'Infirmier Intérêt pour les soins de support et la réadaptation Qualités relationnelles et sens de l'écoute Adaptabilité L'entreprise : Notre client est un établissement privé spécialisé dans la réadaptation oncologique |
| service | "SMR" | MENTION_A_CONFIRMER | Il propose un accompagnement global des patients, associant soins médicaux, activités de réadaptation et suivi psychologique |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |
| remuneration_non_chiffree | true | AUCUN_MONTANT_INVENTE | Salaire :Salaire attractif selon profil + reprise d'ancienneté |

## Infirmier diplome d'etat (H/F)

ID : aae29249-d71e-4521-b445-5f36266aa3a5

Handicap concerne accessibilite des candidatures, pas population soignee. Domicile explicite ; mobilite/permis non precises.

Alertes : aucune automatique

| Champ attendu | Avant | Apres |
|---|---|---|
| mode_exercice DOMICILE | non | oui |
| population PERSONNES_AGEES | oui | oui |
| accessibilite_candidature  | non | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| population | "PERSONNES_AGEES" | MENTION_A_CONFIRMER | Le poste : PROMAN FREJUS recherche pour l'un de ses clients à domicile, un infirmier H/F afin d'effectuer des interventions régulières auprès de personnes âgées |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | prendre en charge la surveillance de l'état du patient (effets secondaires ou complications liés au traitement) |
| accessibilite_candidature | "HANDICAP" | NE_DECRIT_PAS_LES_PATIENTS | Tous nos postes sont ouverts aux personnes en situation de handicap |
| api_lieu | "83 - Saint-Raphaël" | NON_VERIFIE | "83 - Saint-Raphaël" |
| api_salaire | "Horaire de 13.5 Euros" | NON_VERIFIE | "Horaire de 13.5 Euros" |
| mode_exercice | "DOMICILE" | MENTION_A_CONFIRMER | Le poste : PROMAN FREJUS recherche pour l'un de ses clients à domicile, un infirmier H/F afin d'effectuer des interventions régulières auprès de personnes âgées |
