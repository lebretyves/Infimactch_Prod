# Comparaison texte / extraction - prototype V2

24 annonces : 14 France Travail et 10 JobsPipe.

89/89 points de controle textuels retrouves. Ce chiffre mesure la presence de preuves choisies manuellement, PAS une exactitude semantique ni une exhaustivite globale.

Aucune modification des annonces, aucun appel fournisseur, aucun LLM. Corpus local complet conserve dans data/parser-pilot/corpus.json.
Attention : les champs compares sont la provenance deja stockee. Pour JobsPipe, MIS provient de notre normalisation existante, pas d une preuve de contrat fournie par JobsPipe.
Reste : normaliser horaires et fourchettes salariales, lier les alternatives et conditions aux seuls champs concernes, separer missions/experience/presentation, verifier sur un lot independant. Des passages sont retrouves mais pas encore ranges en valeurs finales. Aucune garantie de zero omission.

## FRANCE_TRAVAIL - Infirmier Spécialisé en Hémodialyse (H/F)

Identifiant : 0025de76-1999-47d2-a303-135e828a502d

**Relecture :** Description degradee : placeholder repete. 24 EUR/heure dans le texte et 3528 EUR/mois dans API : conserver les deux sans conversion.

Alertes : DESCRIPTION_DEGRADEE

| Controle | Retrouve |
|---|---|
| service : DIALYSE | oui |
| duree_mission : 10 | oui |
| remuneration_texte : 24 euros/heure | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "DIALYSE" | MENTION_A_CONFIRMER | Infirmier Spécialisé en Hémodialyse (H/F) |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Merci La proposition de notre client pour ce poste est la suivante Contrat: Intérim |
| duree_mission | {"amount":10,"unit":"jours"} | EXPLICITE | Durée: 10/jours |
| remuneration_texte | "Salaire: 24 euros/heure De plus, nous offrons un ensemble complet d'avantages aux intérimaires, y compris Fast TT, pour assurer leur succès professionnel et personnel" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire: 24 euros/heure De plus, nous offrons un ensemble complet d'avantages aux intérimaires, y compris Fast TT, pour assurer leur succès professionnel et personnel |
| api_lieu | "75 - Paris 9e Arrondissement" | NON_VERIFIE | "75 - Paris 9e Arrondissement" |
| api_contrat | {"code":"MIS","label":"Intérim - 10 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 10 Jour(s)"} |
| api_experience | {"label":"1 An(s)","requirement":"E"} | NON_VERIFIE | {"label":"1 An(s)","requirement":"E"} |
| api_salaire | "Mensuel de 3528.0 Euros" | NON_VERIFIE | "Mensuel de 3528.0 Euros" |

Passages sans classement : 5. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier / Infirmière de soins généraux (H/F)

Identifiant : 023a610e-9795-4901-8c5e-6c914e294d35

**Relecture :** Contradiction : deux ans dans le texte, un an exige dans API. Navigo 50% est un avantage, pas une quotite de travail.

Alertes : EXPERIENCE_API_TEXTE_DIVERGENTE

| Controle | Retrouve |
|---|---|
| service : IME | oui |
| population : ENFANTS | oui |
| experience_duree : 2 | oui |
| avantage : TRANSPORT | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "IME" | MENTION_A_CONFIRMER | Description du poste : Quelle contribution apporterez-vous comme Infirmier de (F/H) au sein d'un établissement IME |
| service | "IME" | MENTION_A_CONFIRMER | IME PRO Vous contribuerez à une prise en charge bienveillante et sécurisée des enfants accueillis au sein d'un établissement spécialisé |
| population | "ENFANTS" | MENTION_A_CONFIRMER | IME PRO Vous contribuerez à une prise en charge bienveillante et sécurisée des enfants accueillis au sein d'un établissement spécialisé |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Évaluer les besoins de santé, réaliser les soins prescrits et assurer la surveillance clinique quotidienne |
| population | "ENFANTS" | MENTION_A_CONFIRMER | Participer aux projets personnalisés pour favoriser l'autonomie, le confort et l'inclusion de chaque enfant Découvrez cette offre alléchante Contrat: Intérim |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Participer aux projets personnalisés pour favoriser l'autonomie, le confort et l'inclusion de chaque enfant Découvrez cette offre alléchante Contrat: Intérim |
| duree_mission | {"amount":27,"unit":"jours"} | EXPLICITE | Durée: 27/jours |
| experience_non_chiffree | "Salaire: 21.57 euros/heure Remboursement 50% Navigo Rejoignez notre équipe et profitez d'avantages qui feront la différence En nous rejoignant, vous aurez accès à notre programme Fastt TT, ainsi qu'à d'autres avantages exclusifs pour une expérience intérimaire exceptionnelle" | MENTION_A_CONFIRMER | Salaire: 21.57 euros/heure Remboursement 50% Navigo Rejoignez notre équipe et profitez d'avantages qui feront la différence En nous rejoignant, vous aurez accès à notre programme Fastt TT, ainsi qu'à d'autres avantages exclusifs pour une expérience intérimaire exceptionnelle |
| remuneration_texte | "Salaire: 21.57 euros/heure Remboursement 50% Navigo Rejoignez notre équipe et profitez d'avantages qui feront la différence En nous rejoignant, vous aurez accès à notre programme Fastt TT, ainsi qu'à d'autres avantages exclusifs pour une expérience intérimaire exceptionnelle" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire: 21.57 euros/heure Remboursement 50% Navigo Rejoignez notre équipe et profitez d'avantages qui feront la différence En nous rejoignant, vous aurez accès à notre programme Fastt TT, ainsi qu'à d'autres avantages exclusifs pour une expérience intérimaire exceptionnelle |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire: 21.57 euros/heure Remboursement 50% Navigo Rejoignez notre équipe et profitez d'avantages qui feront la différence En nous rejoignant, vous aurez accès à notre programme Fastt TT, ainsi qu'à d'autres avantages exclusifs pour une expérience intérimaire exceptionnelle |
| population | "ENFANTS" | MENTION_A_CONFIRMER | Description du profil : Vous êtes infirmier ou infirmière diplômé(e), engagé(e) auprès d'enfants en situation de handicap |
| population | "HANDICAP" | MENTION_A_CONFIRMER | Description du profil : Vous êtes infirmier ou infirmière diplômé(e), engagé(e) auprès d'enfants en situation de handicap |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Vous détenez le Diplôme d'État d'Infirmier et maîtrisez les soins adaptés |
| experience_duree | {"amount":2,"unit":"ANS"} | EXIGENCE_TEXTE | Vous justifiez de deux ans d'expérience, garantissant autonomie, vigilance et réactivité |
| api_lieu | "75 - Paris 9e Arrondissement" | NON_VERIFIE | "75 - Paris 9e Arrondissement" |
| api_contrat | {"code":"MIS","label":"Intérim - 27 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 27 Jour(s)"} |
| api_experience | {"label":"1 An(s)","requirement":"E"} | NON_VERIFIE | {"label":"1 An(s)","requirement":"E"} |
| api_salaire | "Mensuel de 3087.0 Euros" | NON_VERIFIE | "Mensuel de 3087.0 Euros" |

Passages sans classement : 6. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier / Infirmière de soins généraux (H/F)

Identifiant : 0329a34c-707a-48c7-a791-893df7981c4f

**Relecture :** Dialyse : domaine experience, pas necessairement service etabli. Urgences dans maitrise de soi ne doit pas devenir un service.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| equipement : NIKISO_DBB_EXA | oui |
| experience_duree : 1 | oui |
| certification : DIPLOME_INFIRMIER | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| avantage | "PRIMES" | A_STRUCTURER | Description du poste : Vos avantages & Cadre de travail Avantages établissement : Primes, intéressement, prévoyance et CSE |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Description du profil : Ce que nous recherchons Diplôme d'État d'Infirmier (IDE) indispensable |
| experience_domaine | "DIALYSE" | EXIGENCE_TEXTE | 1 an d'expérience minimum en dialyse hospitalière |
| experience_duree | {"amount":1,"unit":"ANS"} | EXIGENCE_TEXTE | 1 an d'expérience minimum en dialyse hospitalière |
| equipement | "NIKISO_DBB_EXA" | MENTION_A_CONFIRMER | Maîtrise technique du matériel NIKISO Modèle DBB-Exa |
| api_lieu | "75 - Paris 9e Arrondissement" | NON_VERIFIE | "75 - Paris 9e Arrondissement" |
| api_contrat | {"code":"MIS","label":"Intérim - 30 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 30 Jour(s)"} |
| api_experience | {"label":"1 An(s)","requirement":"E"} | NON_VERIFIE | {"label":"1 An(s)","requirement":"E"} |
| api_salaire | "Mensuel de 2646.0 Euros" | NON_VERIFIE | "Mensuel de 2646.0 Euros" |

Passages sans classement : 4. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - INFIRMIER DIALYSE (F/H)

Identifiant : 04adeac2-2307-428a-9a17-20058aaa03b4

**Relecture :** Description coupee apres equipe plur : impossible de recuperer la suite depuis le texte stocke.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| service : DIALYSE | oui |
| competence : SURVEILLANCE | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "DIALYSE" | MENTION_A_CONFIRMER | INFIRMIER DIALYSE (F/H) |
| service | "DIALYSE" | MENTION_A_CONFIRMER | Vous assurerez la prise en charge globale des personnes dialysées au sein d'un établissement hospitalier |
| service | "DIALYSE" | MENTION_A_CONFIRMER | Vous préparerez et surveillerez les séances de dialyse selon les protocoles médicaux |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Vous préparerez et surveillerez les séances de dialyse selon les protocoles médicaux |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 10 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 10 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |

Passages sans classement : 3. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Mission intérim en laboratoire Infirmier D.E H/F : rejoignez Paris Ouest !

Identifiant : 073cae03-5cc1-4803-ac1d-12e53b2b9055

**Relecture :** Texte colle : laboratoire souhaite et ordre a jour a separer. Paris 17 present dans texte, API Paris general.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| service : LABORATOIRE | oui |
| competence : PRELEVEMENTS | oui |
| certification : ORDRE_INFIRMIER | oui |
| remuneration_texte : 18 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Mission intérim en laboratoire Infirmier D.E H/F : rejoignez Paris Ouest ! |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Mission intérim en laboratoire Infirmier D.E H/F : rejoignez Paris Ouest ! |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Vitalis Médical recherche un(e) infirmier(e) pour une mission d'intérim en laboratoire à Paris 17 |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Vitalis Médical recherche un(e) infirmier(e) pour une mission d'intérim en laboratoire à Paris 17 |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Vous serez responsable de la réalisation des prélèvements biologiques, du suivi et de la traçabilité des échantillons, dans le respect strict des protocoles |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | Vous serez responsable de la réalisation des prélèvements biologiques, du suivi et de la traçabilité des échantillons, dans le respect strict des protocoles |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Vos missionsPréparer et effectuer les prélèvements biologiquesAssurer la qualité et la sécurité des analysesAccueillir et renseigner les patientsParticiper à l'organisation et à la gestion du laboratoire |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Vos missionsPréparer et effectuer les prélèvements biologiquesAssurer la qualité et la sécurité des analysesAccueillir et renseigner les patientsParticiper à l'organisation et à la gestion du laboratoire |
| experience_domaine | "LABORATOIRE" | SOUHAITE | Pré-requisDiplôme d'État d'infirmier(e)Expérience en laboratoire souhaitéeInscription à l'ordre infirmier à jour |
| certification | "DIPLOME_INFIRMIER" | SOUHAITE | Pré-requisDiplôme d'État d'infirmier(e)Expérience en laboratoire souhaitéeInscription à l'ordre infirmier à jour |
| certification | "ORDRE_INFIRMIER" | SOUHAITE | Pré-requisDiplôme d'État d'infirmier(e)Expérience en laboratoire souhaitéeInscription à l'ordre infirmier à jour |
| experience_non_chiffree | "Pré-requisDiplôme d'État d'infirmier(e)Expérience en laboratoire souhaitéeInscription à l'ordre infirmier à jour" | SOUHAITE | Pré-requisDiplôme d'État d'infirmier(e)Expérience en laboratoire souhaitéeInscription à l'ordre infirmier à jour |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | Profil recherchéIDE autonome et rigoureux(se)Sens du relationnel et capacité à travailler en équipeConnaissance des normes d'hygiène et sécurité |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Type de contrat : Intérim |
| temps_travail | "PLEIN" | EXPLICITE | Temps de travail : Temps plein |
| remuneration_texte | "Salaire : 18 € par heure" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire : 18 € par heure |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 61 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 61 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |

Passages sans classement : 2. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier / Infirmière de soins généraux (H/F)

Identifiant : 08abdbcf-c4af-41fb-8d88-f533e2909746

**Relecture :** Placeholder fournisseur : aucune competence ne doit etre inventee.

Alertes : DESCRIPTION_DEGRADEE

| Controle | Retrouve |
|---|---|
| duree_mission : 10 | oui |
| remuneration_texte : 24 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Merci Pour ce poste, vous profitez de Contrat: Intérim |
| duree_mission | {"amount":10,"unit":"jours"} | EXPLICITE | Durée: 10/jours |
| experience_non_chiffree | "Salaire: 24 euros/heure Joignez-vous à nous pour profiter de nos avantages exclusifs, y compris Fast TT, qui vous garantissent une expérience intérimaire exceptionnelle" | MENTION_A_CONFIRMER | Salaire: 24 euros/heure Joignez-vous à nous pour profiter de nos avantages exclusifs, y compris Fast TT, qui vous garantissent une expérience intérimaire exceptionnelle |
| remuneration_texte | "Salaire: 24 euros/heure Joignez-vous à nous pour profiter de nos avantages exclusifs, y compris Fast TT, qui vous garantissent une expérience intérimaire exceptionnelle" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire: 24 euros/heure Joignez-vous à nous pour profiter de nos avantages exclusifs, y compris Fast TT, qui vous garantissent une expérience intérimaire exceptionnelle |
| api_lieu | "75 - Paris 9e Arrondissement" | NON_VERIFIE | "75 - Paris 9e Arrondissement" |
| api_contrat | {"code":"MIS","label":"Intérim - 10 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 10 Jour(s)"} |
| api_experience | {"label":"1 An(s)","requirement":"E"} | NON_VERIFIE | {"label":"1 An(s)","requirement":"E"} |
| api_salaire | "Mensuel de 3528.0 Euros" | NON_VERIFIE | "Mensuel de 3528.0 Euros" |

Passages sans classement : 9. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier D.E H/F

Identifiant : 095c9450-e76f-46e6-8556-1ba283174185

**Relecture :** Addictologie et suivi des traitements identifies ; debut/fin absents. Certaines activites restent libres.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| service : ADDICTOLOGIE | oui |
| certification : ORDRE_INFIRMIER | oui |
| temps_travail : PLEIN | oui |
| remuneration_texte : 20 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "ADDICTOLOGIE" | MENTION_A_CONFIRMER | Vitalis Médical Paris Sud recherche un(e) Infirmier(ère) Diplômé(e) d'État pour intervenir dans un établissement spécialisé en addictologie |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | Assurer la traçabilité des soins |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Pré-requisDiplôme d'État d'Infirmier |
| certification | "ORDRE_INFIRMIER" | MENTION_A_CONFIRMER | Inscription à l'Ordre National des Infirmiers |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Type de contrat : Intérim |
| temps_travail | "PLEIN" | EXPLICITE | Temps de travail : Temps plein |
| remuneration_texte | "Salaire : 20 € par heure" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire : 20 € par heure |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 88 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 88 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |

Passages sans classement : 11. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier H/f Hematologie

Identifiant : 0c3c3264-7486-4395-bc6e-1b40510bbf6f

**Relecture :** Unite des 22 euros brut absente. 10% CP, 10% precarite, 3.38 transport a separer. API journee vs texte jour ou nuit.

Alertes : HORAIRES_API_TEXTE_A_RECONCILIER

| Controle | Retrouve |
|---|---|
| service : HEMATOLOGIE | oui |
| competence : CHIMIOTHERAPIE | oui |
| alternance : JOUR_NUIT | oui |
| avantage : PRIMES | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "HEMATOLOGIE" | MENTION_A_CONFIRMER | Infirmier H/f Hematologie |
| service | "HEMATOLOGIE" | MENTION_A_CONFIRMER | TAGA MEDICAL recherche pour l'un de ses établissements partenaires un(e) Infirmier(ère) Diplômé(e) d'État pour intervenir au sein d'un service d'hématologie |
| service | "HEMATOLOGIE" | MENTION_A_CONFIRMER | Vous intégrerez une équipe pluridisciplinaire spécialisée dans la prise en charge de patients atteints de pathologies hématologiques nécessitant des soins techniques et un accompagnement personnalisé |
| competence | "CHIMIOTHERAPIE" | MENTION_A_CONFIRMER | - Administrer les traitements spécifiques, notamment les chimiothérapies selon les protocoles en vigueur |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | - Surveiller l'état clinique des patients et détecter toute complication |
| competence | "EDUCATION_THERAPEUTIQUE" | MENTION_A_CONFIRMER | - Participer à l'éducation thérapeutique et à l'accompagnement des patients et de leurs proches |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | - Assurer la traçabilité des soins et la transmission des informations à l'équipe médicale |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Missions d'intérim en jour ou nuit Profil du candidat : |
| alternance | "JOUR_NUIT" | EXPLICITE | Missions d'intérim en jour ou nuit Profil du candidat : |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Missions d'intérim en jour ou nuit Profil du candidat : |
| horaire_type | "JOUR" | MENTION_A_CONFIRMER | Missions d'intérim en jour ou nuit Profil du candidat : |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Diplôme d'État d'Infirmier(ère) obligatoire |
| certification | "ORDRE_INFIRMIER" | MENTION_A_CONFIRMER | - Inscription à l'Ordre National des Infirmiers |
| experience_domaine | "HEMATOLOGIE" | SOUHAITE | - Une expérience en hématologie, oncologie ou médecine spécialisée est appréciée |
| experience_domaine | "ONCOLOGIE" | SOUHAITE | - Une expérience en hématologie, oncologie ou médecine spécialisée est appréciée |
| experience_non_chiffree | "- Une expérience en hématologie, oncologie ou médecine spécialisée est appréciée" | SOUHAITE | - Une expérience en hématologie, oncologie ou médecine spécialisée est appréciée |
| remuneration_texte | "Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| avantage | "PRIMES" | A_STRUCTURER | Salaire :22 euros brut +10% de congés payés +10% de prime de précarité = euros brut + 3.38 prime de transport |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |

Passages sans classement : 2. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier / Infirmière de soins généraux (H/F)

Identifiant : 0f0edf77-ae55-47c4-8220-05e2b4411a85

**Relecture :** Une annee experience minimale : valeur 1 an. Urgence/complications ne prouve pas service urgences.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| service : DIALYSE | oui |
| experience_duree : 1 | oui |
| duree_mission : 10 | oui |
| remuneration_texte : 25 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "DIALYSE" | MENTION_A_CONFIRMER | Description du poste : Quelle contribution apporterez-vous en tant qu'Infirmier de (F/H) au sein de cet établissement hospitalier Au sein d'un établissement hospitalier, vous assurez la prise en charge des personnes nécessitant une dialyse |
| service | "DIALYSE" | MENTION_A_CONFIRMER | Vous réalisez les soins de dialyse conformément aux protocoles médicaux et aux règles d'hygiène |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | Vous réalisez les soins de dialyse conformément aux protocoles médicaux et aux règles d'hygiène |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Vous surveillez l'état clinique des personnes et intervenez face aux éventuelles complications |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Vous coordonnez les échanges avec l'équipe pluridisciplinaire et accompagnez les personnes tout au long du parcours de soins Tout ce que vous devez savoir sur l'offre se trouve ici Contrat: Intérim |
| duree_mission | {"amount":10,"unit":"jours"} | EXPLICITE | Durée: 10/jours |
| remuneration_texte | "Salaire: 25 euros/heure Nous sommes fiers d'offrir des avantages exceptionnels aux travailleurs temporaires, y compris Fast TT, pour leur garantir une sécurité financière et professionnelle" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire: 25 euros/heure Nous sommes fiers d'offrir des avantages exceptionnels aux travailleurs temporaires, y compris Fast TT, pour leur garantir une sécurité financière et professionnelle |
| experience_domaine | "DIALYSE" | EXIGENCE_TEXTE | Description du profil : Vous êtes infirmier-ère diplômé-e, expérimenté-e en dialyse hospitalière, rigoureux-se et attentif-ve aux patients Vous détenez le Diplôme d'État d'Infirmier et justifiez d'une année d'expérience minimale Vous maîtrisez les protocoles de dialyse et la surveillance clinique des patients Vous faites preuve de réactivité face aux situations d'urgence et aux complications Vous exercez avec empathie, rigueur et sens de la coordination pluridisciplinaire Processus de recrutement Intéressé(e) par cette offre d'emploi |
| competence | "SURVEILLANCE" | EXIGENCE_TEXTE | Description du profil : Vous êtes infirmier-ère diplômé-e, expérimenté-e en dialyse hospitalière, rigoureux-se et attentif-ve aux patients Vous détenez le Diplôme d'État d'Infirmier et justifiez d'une année d'expérience minimale Vous maîtrisez les protocoles de dialyse et la surveillance clinique des patients Vous faites preuve de réactivité face aux situations d'urgence et aux complications Vous exercez avec empathie, rigueur et sens de la coordination pluridisciplinaire Processus de recrutement Intéressé(e) par cette offre d'emploi |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Description du profil : Vous êtes infirmier-ère diplômé-e, expérimenté-e en dialyse hospitalière, rigoureux-se et attentif-ve aux patients Vous détenez le Diplôme d'État d'Infirmier et justifiez d'une année d'expérience minimale Vous maîtrisez les protocoles de dialyse et la surveillance clinique des patients Vous faites preuve de réactivité face aux situations d'urgence et aux complications Vous exercez avec empathie, rigueur et sens de la coordination pluridisciplinaire Processus de recrutement Intéressé(e) par cette offre d'emploi |
| experience_duree | {"amount":1,"unit":"ANS"} | EXIGENCE_TEXTE | Description du profil : Vous êtes infirmier-ère diplômé-e, expérimenté-e en dialyse hospitalière, rigoureux-se et attentif-ve aux patients Vous détenez le Diplôme d'État d'Infirmier et justifiez d'une année d'expérience minimale Vous maîtrisez les protocoles de dialyse et la surveillance clinique des patients Vous faites preuve de réactivité face aux situations d'urgence et aux complications Vous exercez avec empathie, rigueur et sens de la coordination pluridisciplinaire Processus de recrutement Intéressé(e) par cette offre d'emploi |
| api_lieu | "75 - Paris 9e Arrondissement" | NON_VERIFIE | "75 - Paris 9e Arrondissement" |
| api_contrat | {"code":"MIS","label":"Intérim - 10 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 10 Jour(s)"} |
| api_experience | {"label":"1 An(s)","requirement":"E"} | NON_VERIFIE | {"label":"1 An(s)","requirement":"E"} |
| api_salaire | "Mensuel de 3675.0 Euros" | NON_VERIFIE | "Mensuel de 3675.0 Euros" |

Passages sans classement : 3. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Infirmier de santé au travail (F/H)

Identifiant : 112f6dfe-eaa0-4a40-a75e-146aed733497

**Relecture :** DIUST OU licence sante travail OU AFOMETRA : alternatives, pas trois obligations. Issy-les-Moulineaux dans texte. Fin septembre sans annee explicite.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| service : SANTE_TRAVAIL | oui |
| experience_duree : 2 | oui |
| certification : DIUST | oui |
| certification : AFOMETRA | oui |
| horaires_detail : 8h30 | oui |
| remuneration_texte : 21 et 23 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "SANTE_TRAVAIL" | MENTION_A_CONFIRMER | Infirmier de santé au travail (F/H) |
| service | "SANTE_TRAVAIL" | MENTION_A_CONFIRMER | service de santé au travail interentreprises, un infirmier de santé au travail H/F, dans le cadre d'une mission d'intérim |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | service de santé au travail interentreprises, un infirmier de santé au travail H/F, dans le cadre d'une mission d'intérim |
| experience_domaine | "SANTE_TRAVAIL" | MENTION_A_CONFIRMER | Vous disposez d'une 1ère expérience en santé au travail et êtes à l'écoute d'une nouvelle opportunité professionnelle, alors cette mission est faite pour vous |
| experience_non_chiffree | "Vous disposez d'une 1ère expérience en santé au travail et êtes à l'écoute d'une nouvelle opportunité professionnelle, alors cette mission est faite pour vous" | MENTION_A_CONFIRMER | Vous disposez d'une 1ère expérience en santé au travail et êtes à l'écoute d'une nouvelle opportunité professionnelle, alors cette mission est faite pour vous |
| debut_mission | "DES_QUE_POSSIBLE" | DATE_NON_PRECISE | Vous interviendrez dans le cadre d'un remplacement maladie et aurez pour missions : -tenue de l'infirmerie -le suivi des salariés avec la réalisation des différentes visites Cette mission est à pourvoir dès que possible, jusqu'à fin septembre pour commencer |
| periode_texte | "Vous interviendrez dans le cadre d'un remplacement maladie et aurez pour missions : -tenue de l'infirmerie -le suivi des salariés avec la réalisation des différentes visites Cette mission est à pourvoir dès que possible, jusqu'à fin septembre pour commencer" | ANNEE_ET_DATES_A_CONFIRMER | Vous interviendrez dans le cadre d'un remplacement maladie et aurez pour missions : -tenue de l'infirmerie -le suivi des salariés avec la réalisation des différentes visites Cette mission est à pourvoir dès que possible, jusqu'à fin septembre pour commencer |
| horaires_detail | "Vos horaires 8h30 17h30 du lundi au jeudi, et 8h30 16h30 le vendredi" | HORAIRES_A_STRUCTURER | Vos horaires 8h30 17h30 du lundi au jeudi, et 8h30 16h30 le vendredi |
| remuneration_texte | "Pour cette mission, votre salaire sera en fonction de votre ancienneté compris entre 21 et 23€/h" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Pour cette mission, votre salaire sera en fonction de votre ancienneté compris entre 21 et 23€/h |
| experience_domaine | "SANTE_TRAVAIL" | EXIGENCE_TEXTE | Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA |
| certification | "DIUST" | EXIGENCE_TEXTE | Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA |
| certification | "AFOMETRA" | EXIGENCE_TEXTE | Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA |
| certification | "LICENCE_SANTE_TRAVAIL" | EXIGENCE_TEXTE | Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA |
| experience_duree | {"amount":2,"unit":"ANS"} | EXIGENCE_TEXTE | Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA |
| alternatives_professionnelles | "Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA" | ALTERNATIVES_PAS_CUMUL | Pour ce poste nous recherchons un infirmier ayant une expérience minimale de 2 ans en santé au travail, et étant titulaire du DIUST, ou de la licence en santé au travail ou de l'AFOMETRA |
| api_lieu | "75 - Paris 9e Arrondissement" | NON_VERIFIE | "75 - Paris 9e Arrondissement" |
| api_contrat | {"code":"MIS","label":"Intérim - 3 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 3 Mois"} |
| api_experience | {"label":"2 An(s)","requirement":"E"} | NON_VERIFIE | {"label":"2 An(s)","requirement":"E"} |
| api_salaire | "Annuel de 40000.0 Euros à 42000.0 Euros" | NON_VERIFIE | "Annuel de 40000.0 Euros à 42000.0 Euros" |

Passages sans classement : 8. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier préleveur en laboratoire H/F

Identifiant : 1c6d75c4-bfef-4838-a228-6d4d07a6e05f

**Relecture :** Mobilite multisite obligatoire. Amplitude et samedis ne sont pas un poste continu. 2221.95 brut et fourchette 2220-2400 a reconcilier.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Controle | Retrouve |
|---|---|
| contrat_texte : CDI | oui |
| mobilite : Aurence | oui |
| horaires_detail : 7h00 | oui |
| remuneration_texte : 2 400 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Infirmier préleveur en laboratoire H/F |
| contexte_recruteur | "Présentation de la société Le Groupe PIMENT et ses marques spécialisées, PIMENT, au savoir-faire reconnu dans l’aéronautique et OPTIMA, cabinet de recrutement multi-sectoriel, vous accompagnent tout au long de votre évolution professionnelle, en vous proposant des contrats en intérim, CDD, CDI et freelance dans de nombreux secteurs d’activité" | NE_PAS_CLASSER_LE_CONTRAT | Présentation de la société Le Groupe PIMENT et ses marques spécialisées, PIMENT, au savoir-faire reconnu dans l’aéronautique et OPTIMA, cabinet de recrutement multi-sectoriel, vous accompagnent tout au long de votre évolution professionnelle, en vous proposant des contrats en intérim, CDD, CDI et freelance dans de nombreux secteurs d’activité |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Description Nous recherchons un Infirmier préleveur en laboratoire H/F passionné par son métier et désireux de rejoindre une équipe dynamique dédiée à la santé |
| mobilite | "- Mobilité indispensable sur les sites d’Aurence, Couzeix et Aix sur Vienne (périphérie de Limoges)" | EXIGENCE_TEXTE | - Mobilité indispensable sur les sites d’Aurence, Couzeix et Aix sur Vienne (périphérie de Limoges) |
| horaires_detail | "- Amplitude horaire : 7h00 au plus tôt – 17h00 au plus tard du lundi au vendredi 7h00" | AMPLITUDE_PAS_DUREE_POSTE | - Amplitude horaire : 7h00 au plus tôt – 17h00 au plus tard du lundi au vendredi 7h00 |
| roulement | "12h30 au plus tard le samedi (2 à 3 samedis travaillés par mois avec un jour de repos dans la semaine)" | A_STRUCTURER | 12h30 au plus tard le samedi (2 à 3 samedis travaillés par mois avec un jour de repos dans la semaine) |
| remuneration_texte | "Rémunération à partir de 2 221,95€ brut" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération à partir de 2 221,95€ brut |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Avantage : prime de participation, mutuelle entreprise, CSE (chèque vacances, carte cadeau) En tant qu'infirmier préleveur H/F, vous serez responsable de la réalisation des prélèvements sanguins et autres analyses biologiques nécessaires au bon fonctionnement de notre laboratoire |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Avantage : prime de participation, mutuelle entreprise, CSE (chèque vacances, carte cadeau) En tant qu'infirmier préleveur H/F, vous serez responsable de la réalisation des prélèvements sanguins et autres analyses biologiques nécessaires au bon fonctionnement de notre laboratoire |
| avantage | "PRIMES" | A_STRUCTURER | Avantage : prime de participation, mutuelle entreprise, CSE (chèque vacances, carte cadeau) En tant qu'infirmier préleveur H/F, vous serez responsable de la réalisation des prélèvements sanguins et autres analyses biologiques nécessaires au bon fonctionnement de notre laboratoire |
| avantage | "MUTUELLE" | A_STRUCTURER | Avantage : prime de participation, mutuelle entreprise, CSE (chèque vacances, carte cadeau) En tant qu'infirmier préleveur H/F, vous serez responsable de la réalisation des prélèvements sanguins et autres analyses biologiques nécessaires au bon fonctionnement de notre laboratoire |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Réaliser des prélèvements sanguins et d'autres échantillons biologiques |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | - Assurer la traçabilité des prélèvements et la gestion des échantillons |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | - Assurer la traçabilité des prélèvements et la gestion des échantillons |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | - Informer et rassurer les patients sur le déroulement des prélèvements |
| roulement | "- Informer et rassurer les patients sur le déroulement des prélèvements" | A_STRUCTURER | - Informer et rassurer les patients sur le déroulement des prélèvements |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | - Participer à l'amélioration continue des pratiques au sein du laboratoire |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Diplôme d'État d'infirmier requis |
| competence | "PRELEVEMENTS" | SOUHAITE | - Expérience en prélèvements sanguins souhaitée, mais les débutants motivés sont également les bienvenus |
| experience_non_chiffree | "- Expérience en prélèvements sanguins souhaitée, mais les débutants motivés sont également les bienvenus" | SOUHAITE | - Expérience en prélèvements sanguins souhaitée, mais les débutants motivés sont également les bienvenus |
| debutant_accepte | true | EXPLICITE | - Expérience en prélèvements sanguins souhaitée, mais les débutants motivés sont également les bienvenus |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | - Rigueur, organisation et respect des normes d'hygiène et de sécurité |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Informations complémentaires Ce poste est proposé en CDI 35 Heures |
| horaires_detail | "Informations complémentaires Ce poste est proposé en CDI 35 Heures" | HORAIRES_A_STRUCTURER | Informations complémentaires Ce poste est proposé en CDI 35 Heures |
| experience_non_chiffree | "Le salaire se situe entre 2 220€ et 2 400€ par mois, en fonction de l'expérience et des compétences" | MENTION_A_CONFIRMER | Le salaire se situe entre 2 220€ et 2 400€ par mois, en fonction de l'expérience et des compétences |
| remuneration_texte | "Le salaire se situe entre 2 220€ et 2 400€ par mois, en fonction de l'expérience et des compétences" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Le salaire se situe entre 2 220€ et 2 400€ par mois, en fonction de l'expérience et des compétences |
| debut_mission | "DES_QUE_POSSIBLE" | DATE_NON_PRECISE | Vous aurez la possibilité d'entrer en fonction immédiatement, ce qui vous permettra de rejoindre rapidement notre équipe |
| api_lieu | "Limoges, Nouvelle-Aquitaine, France" | NON_VERIFIE | "Limoges, Nouvelle-Aquitaine, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |
| api_salaire | "2 400€ par mois" | NON_VERIFIE | "2 400€ par mois" |

Passages sans classement : 10. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier-e en pool h/f

Identifiant : 2ceed9ad-b0e6-49eb-b40f-fab2a81d58b4

**Relecture :** Alternance jour/nuit, poste 12h, petite/grande semaine. Contrat non etabli par presentation du cabinet.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| alternance : JOUR_NUIT | oui |
| horaires_detail : 12h | oui |
| roulement : week-ends | oui |
| remuneration_texte : 2750 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| contexte_recruteur | "Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques |
| competence | "EDUCATION_THERAPEUTIQUE" | MENTION_A_CONFIRMER | - Réaliser l'éducation thérapeutique et l'accompagnement des usagers et de leur entourage |
| horaires_detail | "Poste en 12h (7h-19h), planification du travail en \"petite / grande semaine\", avec des roulements les week-ends" | HORAIRES_A_STRUCTURER | Poste en 12h (7h-19h), planification du travail en "petite / grande semaine", avec des roulements les week-ends |
| roulement | "Poste en 12h (7h-19h), planification du travail en \"petite / grande semaine\", avec des roulements les week-ends" | A_STRUCTURER | Poste en 12h (7h-19h), planification du travail en "petite / grande semaine", avec des roulements les week-ends |
| alternance | "JOUR_NUIT" | EXPLICITE | Alternance jours / nuits (mais plus de jours que de nuits) |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Alternance jours / nuits (mais plus de jours que de nuits) |
| remuneration_texte | "Rémunération Et Avantages À partir de 2750€ bruts/ mois, + ancienneté" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération Et Avantages À partir de 2750€ bruts/ mois, + ancienneté |
| avantage | "PRIMES" | A_STRUCTURER | - Mutuelle, CSE dynamique, autres primes |
| avantage | "MUTUELLE" | A_STRUCTURER | - Mutuelle, CSE dynamique, autres primes |
| api_lieu | "Thionville, Grand Est, France" | NON_VERIFIE | "Thionville, Grand Est, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |

Passages sans classement : 15. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier de régulation médicale - Poste à 50% H/F

Identifiant : 4e435168-a3c1-43e5-8bb9-2354620d8b25

**Relecture :** 14-16 disponibilites a fournir 1.5 mois avant, weekend/feries : contrainte de planning non structuree. Cinq ans minimum et domaines idealement : niveaux differents. Anglais a ne pas rendre facultatif a cause des autres langues appreciees.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| quotite_pct : 50 | oui |
| experience_duree : 5 | oui |
| langue : ANGLAIS | oui |
| horaires_detail : 19h-7h | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "REGULATION" | MENTION_A_CONFIRMER | Infirmier de régulation médicale - Poste à 50% H/F |
| quotite_pct | 50 | EXPLICITE | Infirmier de régulation médicale - Poste à 50% H/F |
| contexte_recruteur | "Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques |
| service | "REGULATION" | MENTION_A_CONFIRMER | Rattaché(e) à Un Manager IDE, Vous Exercez Votre Activité à Temps Partiel (50%) Au Sein D’une Plateforme De Régulation Médicale Fonctionnant En Continu (24h/24 – 7j/7) Vous analysez et traitez les demandes médicales des patients, en priorisant les situations et en assurant la gestion des dossiers d’assistance (aspects médicaux, administratifs et logistiques) |
| temps_travail | "PARTIEL" | EXPLICITE | Rattaché(e) à Un Manager IDE, Vous Exercez Votre Activité à Temps Partiel (50%) Au Sein D’une Plateforme De Régulation Médicale Fonctionnant En Continu (24h/24 – 7j/7) Vous analysez et traitez les demandes médicales des patients, en priorisant les situations et en assurant la gestion des dossiers d’assistance (aspects médicaux, administratifs et logistiques) |
| quotite_pct | 50 | EXPLICITE | Rattaché(e) à Un Manager IDE, Vous Exercez Votre Activité à Temps Partiel (50%) Au Sein D’une Plateforme De Régulation Médicale Fonctionnant En Continu (24h/24 – 7j/7) Vous analysez et traitez les demandes médicales des patients, en priorisant les situations et en assurant la gestion des dossiers d’assistance (aspects médicaux, administratifs et logistiques) |
| avantage | "TRANSPORT" | A_STRUCTURER | Vous participez à l’organisation de transports médicalisés (admissions hospitalières, coordination avec les équipes de transport, échanges avec les établissements de santé) afin de mettre en œuvre les solutions les plus adaptées |
| avantage | "TRANSPORT" | A_STRUCTURER | Coordonner avec les établissements de santé et organiser les prises en charge, notamment les transports médicalisés |
| contraintes_planning | "Participer également à l’activité prévention et téléconsultation Organisation du poste : l'IDE doit donner 14 à 16 disponibilités 1.5 mois à l'avance dont 1 week-end ou 2 jours fériés" | A_STRUCTURER | Participer également à l’activité prévention et téléconsultation Organisation du poste : l'IDE doit donner 14 à 16 disponibilités 1.5 mois à l'avance dont 1 week-end ou 2 jours fériés |
| roulement | "Participer également à l’activité prévention et téléconsultation Organisation du poste : l'IDE doit donner 14 à 16 disponibilités 1.5 mois à l'avance dont 1 week-end ou 2 jours fériés" | A_STRUCTURER | Participer également à l’activité prévention et téléconsultation Organisation du poste : l'IDE doit donner 14 à 16 disponibilités 1.5 mois à l'avance dont 1 week-end ou 2 jours fériés |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Les horaires ne sont pas fixes et oscillent par équité entre : 8h-17h/ 10h-19h/ 11h-20h/ nuit 19h-7h |
| horaires_detail | "Les horaires ne sont pas fixes et oscillent par équité entre : 8h-17h/ 10h-19h/ 11h-20h/ nuit 19h-7h" | HORAIRES_A_STRUCTURER | Les horaires ne sont pas fixes et oscillent par équité entre : 8h-17h/ 10h-19h/ 11h-20h/ nuit 19h-7h |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Diplôme d’État d’infirmier |
| experience_domaine | "REANIMATION" | SOUHAITE | Expérience significative (minimum 5 ans) en milieu hospitalier, idéalement en urgences, réanimation, SAMU ou services de médecine/chirurgie |
| experience_domaine | "URGENCES" | SOUHAITE | Expérience significative (minimum 5 ans) en milieu hospitalier, idéalement en urgences, réanimation, SAMU ou services de médecine/chirurgie |
| experience_duree | {"amount":5,"unit":"ANS"} | EXIGENCE_TEXTE | Expérience significative (minimum 5 ans) en milieu hospitalier, idéalement en urgences, réanimation, SAMU ou services de médecine/chirurgie |
| langue | "ANGLAIS" | SOUHAITE | Maitrise de l’anglais conversationnel (autres langues étrangères appréciées) |
| api_lieu | "St.-Denis, Île-de-France, France" | NON_VERIFIE | "St.-Denis, Île-de-France, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |

Passages sans classement : 17. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier(e) en SMR de nuit h/f

Identifiant : 71a3522b-0618-4d42-a3d6-14f34ee2c0cd

**Relecture :** CDD long OU CDI. Horaires postes 7h designe probablement duree, pas debut a 07h. Convention FEHAP51, montant absent.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Controle | Retrouve |
|---|---|
| service : SMR | oui |
| horaire_type : NUIT | oui |
| contrat_texte : CDD | oui |
| contrat_texte : CDI | oui |
| horaires_detail : 7h | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "SMR" | MENTION_A_CONFIRMER | Infirmier(e) en SMR de nuit h/f |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Infirmier(e) en SMR de nuit h/f |
| contexte_recruteur | "Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques |
| service | "SMR" | MENTION_A_CONFIRMER | Nous recrutons, pour l'un de nos partenaires, un établissement de réadaptation privé situé sur Mulhouse, un infirmier h/f de nuit |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Nous recrutons, pour l'un de nos partenaires, un établissement de réadaptation privé situé sur Mulhouse, un infirmier h/f de nuit |
| debut_mission | "DES_QUE_POSSIBLE" | DATE_NON_PRECISE | - Prise de poste : Dès que possible |
| horaires_detail | "Horaires postés (7h)" | HORAIRES_A_STRUCTURER | Horaires postés (7h) |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Contrat CDD long ou CDI |
| contrat_texte | "CDD" | EXPLICITE_A_VERIFIER | Contrat CDD long ou CDI |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Rémunération selon la convention Fehap51 Vous êtes titulaire du diplôme d’état d’Infirmier |
| remuneration_texte | "Rémunération selon la convention Fehap51 Vous êtes titulaire du diplôme d’état d’Infirmier" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération selon la convention Fehap51 Vous êtes titulaire du diplôme d’état d’Infirmier |
| api_lieu | "Mulhouse, Grand Est, France" | NON_VERIFIE | "Mulhouse, Grand Est, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |

Passages sans classement : 3. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier(e)/ Technicien Préleveur(se) H/F - (69)

Identifiant : 76cb935f-81e8-4a0b-9f71-d8f0cb64d47a

**Relecture :** IDE OU technicien : alternative de profils a conserver. Amplitude ouverture laboratoire distincte horaires individuels. AFGSU requise a jour.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Controle | Retrouve |
|---|---|
| certification : AFGSU | oui |
| contrat_texte : CDI | oui |
| remuneration_texte : 25k | oui |
| avantage : TRANSPORT | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Le cabinet TALENTS SANTE accompagne les entreprises et les candidats au travers de prestations de Recrutement CDI / CDD & Intérim spécialisé sur les métiers liés au secteur médical, paramédical et social : Centres de Soins, Santé à Domicile, Santé au Travail, Petite Enfance, Laboratoires |
| service | "SANTE_TRAVAIL" | MENTION_A_CONFIRMER | Le cabinet TALENTS SANTE accompagne les entreprises et les candidats au travers de prestations de Recrutement CDI / CDD & Intérim spécialisé sur les métiers liés au secteur médical, paramédical et social : Centres de Soins, Santé à Domicile, Santé au Travail, Petite Enfance, Laboratoires |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Le cabinet TALENTS SANTE accompagne les entreprises et les candidats au travers de prestations de Recrutement CDI / CDD & Intérim spécialisé sur les métiers liés au secteur médical, paramédical et social : Centres de Soins, Santé à Domicile, Santé au Travail, Petite Enfance, Laboratoires |
| contrat_texte | "CDD" | EXPLICITE_A_VERIFIER | Le cabinet TALENTS SANTE accompagne les entreprises et les candidats au travers de prestations de Recrutement CDI / CDD & Intérim spécialisé sur les métiers liés au secteur médical, paramédical et social : Centres de Soins, Santé à Domicile, Santé au Travail, Petite Enfance, Laboratoires |
| contrat_texte | "INTERIM" | EXPLICITE_A_VERIFIER | Le cabinet TALENTS SANTE accompagne les entreprises et les candidats au travers de prestations de Recrutement CDI / CDD & Intérim spécialisé sur les métiers liés au secteur médical, paramédical et social : Centres de Soins, Santé à Domicile, Santé au Travail, Petite Enfance, Laboratoires |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales, un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales, un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales, un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| alternatives_professionnelles | "Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales, un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69" | ALTERNATIVES_PAS_CUMUL | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales, un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| temps_travail | "PLEIN" | EXPLICITE | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales, un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales,un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales,un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales,un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| alternatives_professionnelles | "Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales,un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69" | ALTERNATIVES_PAS_CUMUL | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales,un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| temps_travail | "PLEIN" | EXPLICITE | Nous recherchons pour l'un de nos partenaires, un Laboratoire d'analyses médicales,un(e) Infirmier(e) ou Technicien(ne) de prélèvement en CDI à temps plein, pour un poste situé à proximité du 3ᵉ arrondissement de Lyon (69 |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Assurer l'accueil des patients et leur prise en charge au laboratoire |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | - Fournir des informations de premier niveau aux patients concernant le déroulement des prélèvements, les délais et les modalités de récupération des résultats |
| roulement | "- Fournir des informations de premier niveau aux patients concernant le déroulement des prélèvements, les délais et les modalités de récupération des résultats" | A_STRUCTURER | - Fournir des informations de premier niveau aux patients concernant le déroulement des prélèvements, les délais et les modalités de récupération des résultats |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | - Effectuer les prélèvements en respectant strictement les normes d'hygiène et de sécurité |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | - Effectuer les prélèvements en respectant strictement les normes d'hygiène et de sécurité |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | - Veiller à ce que l'acte de prélèvement se déroule dans les meilleures conditions pour le patient |
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Horaires : Amplitude horaire d’ouverture du laboratoire 7 h |
| horaires_detail | "Horaires : Amplitude horaire d’ouverture du laboratoire 7 h" | AMPLITUDE_PAS_DUREE_POSTE | Horaires : Amplitude horaire d’ouverture du laboratoire 7 h |
| roulement | "18 h / 1 samedi matin/2 travaillé" | A_STRUCTURER | 18 h / 1 samedi matin/2 travaillé |
| remuneration_texte | "Rémunération comprise entre 25k et 28k bruts annuels, soit entre 2100 € et 2400 € brut mensuel" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération comprise entre 25k et 28k bruts annuels, soit entre 2100 € et 2400 € brut mensuel |
| avantage | "REPAS" | A_STRUCTURER | Titres restaurants pris à 60% |
| avantage | "TRANSPORT" | A_STRUCTURER | Abonnement transports en commun remboursé à 50% |
| avantage | "MUTUELLE" | A_STRUCTURER | Mutuelle familiale d'entreprise prise en charge à 70% |
| avantage | "PRIMES" | A_STRUCTURER | Prime de participation et plan d'épargne d'entreprise |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Mobilité interne Vous êtes diplômé(e) d'État d'Infirmier et votre AFGSU est à jour |
| certification | "AFGSU" | MENTION_A_CONFIRMER | Mobilité interne Vous êtes diplômé(e) d'État d'Infirmier et votre AFGSU est à jour |
| api_lieu | "Lyon, Auvergne-Rhône-Alpes, France" | NON_VERIFIE | "Lyon, Auvergne-Rhône-Alpes, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |

Passages sans classement : 10. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier(ère) de jour - SMR (H/F)

Identifiant : 8908373d-428e-4cec-a02f-1b5e60e99f29

**Relecture :** 36 patients service versus 18 pris en charge ; 2 IDE+4 AS distincts postes ouverts. Fourchette 31200-33600 annuel. Pause 1h30.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Controle | Retrouve |
|---|---|
| service : SMR | oui |
| horaire_type : JOUR | oui |
| pause : 1h30 | oui |
| charge_et_equipe : 18 patients | oui |
| remuneration_texte : 33 600 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "SMR" | MENTION_A_CONFIRMER | Infirmier(ère) de jour - SMR (H/F) |
| horaire_type | "JOUR" | MENTION_A_CONFIRMER | Infirmier(ère) de jour - SMR (H/F) |
| contexte_recruteur | "Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques |
| contexte_recruteur | "Notre cabinet accompagne un établissement privé de Soins Médicaux et de Réadaptation (SMR) appartenant à un groupe reconnu dans le secteur de la santé, dans le recrutement d’un(e) Infirmier(ère) de jour en CDI" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet accompagne un établissement privé de Soins Médicaux et de Réadaptation (SMR) appartenant à un groupe reconnu dans le secteur de la santé, dans le recrutement d’un(e) Infirmier(ère) de jour en CDI |
| service | "GERIATRIE" | MENTION_A_CONFIRMER | L’établissement prend principalement en charge des patients âgés, dans un environnement à la fois gériatrique et polyvalent, avec une activité comprenant de nombreux soins techniques |
| population | "PERSONNES_AGEES" | MENTION_A_CONFIRMER | L’établissement prend principalement en charge des patients âgés, dans un environnement à la fois gériatrique et polyvalent, avec une activité comprenant de nombreux soins techniques |
| charge_et_equipe | "Vos missions Au sein d’une équipe composée de 2 infirmier(ère)s et 4 aides-soignant(e)s, vous assurez la prise en charge d’environ 18 patients" | CONTEXTE_PAS_POSTES_A_POURVOIR | Vos missions Au sein d’une équipe composée de 2 infirmier(ère)s et 4 aides-soignant(e)s, vous assurez la prise en charge d’environ 18 patients |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | - Assurer la surveillance et le suivi de l’état de santé des patients |
| population | "PERSONNES_AGEES" | MENTION_A_CONFIRMER | - Participer à la prise en charge globale des patients âgés et polyvalents |
| charge_et_equipe | "Vous évoluerez au sein d'un service de 36 patients, avec la présence de 2 médecins au sein du bureau médical" | CONTEXTE_PAS_POSTES_A_POURVOIR | Vous évoluerez au sein d'un service de 36 patients, avec la présence de 2 médecins au sein du bureau médical |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Profil recherché Vous êtes titulaire du Diplôme d'État Infirmier (DEI) |
| service | "SMR" | SOUHAITE | Vous appréciez particulièrement la prise en charge des personnes âgées et souhaitez évoluer dans un environnement SMR |
| population | "PERSONNES_AGEES" | SOUHAITE | Vous appréciez particulièrement la prise en charge des personnes âgées et souhaitez évoluer dans un environnement SMR |
| experience_domaine | "SMR" | SOUHAITE | - Ayant idéalement une première expérience en gériatrie, médecine ou SMR |
| experience_domaine | "GERIATRIE" | SOUHAITE | - Ayant idéalement une première expérience en gériatrie, médecine ou SMR |
| experience_non_chiffree | "- Ayant idéalement une première expérience en gériatrie, médecine ou SMR" | SOUHAITE | - Ayant idéalement une première expérience en gériatrie, médecine ou SMR |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | CDI – Temps plein |
| temps_travail | "PLEIN" | EXPLICITE | CDI – Temps plein |
| horaire_type | "JOUR" | MENTION_A_CONFIRMER | Poste de jour |
| horaires_detail | "Horaires : 7h00 – 18h30, avec 1h30 de pause" | HORAIRES_A_STRUCTURER | Horaires : 7h00 – 18h30, avec 1h30 de pause |
| pause | "Horaires : 7h00 – 18h30, avec 1h30 de pause" | EXPLICITE | Horaires : 7h00 – 18h30, avec 1h30 de pause |
| horaires_detail | "Journées de 10 heures" | HORAIRES_A_STRUCTURER | Journées de 10 heures |
| roulement | "Roulement fixe :" | A_STRUCTURER | Roulement fixe : |
| roulement | "mardi, mercredi, samedi, dimanche, lundi" | A_STRUCTURER | mardi, mercredi, samedi, dimanche, lundi |
| remuneration_texte | "Rémunération : 31 200 à 33 600 € brut annuel, selon l'ancienneté / année de diplôme" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération : 31 200 à 33 600 € brut annuel, selon l'ancienneté / année de diplôme |
| avantage | "PRIMES" | A_STRUCTURER | Prime Ségur |
| api_lieu | "Guyancourt, Île-de-France, France" | NON_VERIFIE | "Guyancourt, Île-de-France, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |
| api_salaire | "31 200 à 33 600 €" | NON_VERIFIE | "31 200 à 33 600 €" |

Passages sans classement : 13. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier préleveur en laboratoire h/f

Identifiant : 971e454d-f267-4d02-b1cd-5c9aa1e386fb

**Relecture :** 26k : ni devise ni periodicite explicites dans ce passage, ne pas inventer annuel. Samedi 8-12 distinct amplitude semaine.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Controle | Retrouve |
|---|---|
| contrat_texte : CDI | oui |
| competence : PRELEVEMENTS | oui |
| remuneration_texte : 26k | oui |
| roulement : samedi | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| service | "LABORATOIRE" | MENTION_A_CONFIRMER | Infirmier préleveur en laboratoire h/f |
| contexte_recruteur | "Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Réaliser les prélèvements dans le respect des procédures et de la démarche qualité, |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| temps_travail | "PLEIN" | EXPLICITE | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| horaire_type | "JOUR" | MENTION_A_CONFIRMER | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| horaires_detail | "Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h)" | AMPLITUDE_PAS_DUREE_POSTE | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| roulement | "Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h)" | A_STRUCTURER | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| remuneration_texte | "Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h)" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Effectuer les compte rendu et transmissions si besoin Poste en CDI temps plein, Salaire à partir de 26k, horaires de journée amplitude 7h30-17h, et environ un samedi matin sur deux travaillé (8h-12h) |
| competence | "PRELEVEMENTS" | MENTION_A_CONFIRMER | Vous avez le diplôme d'IDE, et vous maîtrisez les bonnes pratiques de prélèvements sanguins |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Vous avez le diplôme d'IDE, et vous maîtrisez les bonnes pratiques de prélèvements sanguins |
| api_lieu | "Épernon, Centre-Val de Loire, France" | NON_VERIFIE | "Épernon, Centre-Val de Loire, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |

Passages sans classement : 5. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier(e) Conseiller(e) Clinique H/F Secteur 92 / 95

Identifiant : af7ca4ec-c76f-4b80-8f0b-4bdafcb6198f

**Relecture :** Poste de conseil commercial : pas mission de soins et interim non etabli. Package 45-47k, fixe 35-37k, variable10k, repas16 : composantes distinctes.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| remuneration_texte : 45K | oui |
| remuneration_texte : 35K | oui |
| avantage : REPAS | oui |
| certification : DU_PLAIES | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| contexte_recruteur | "Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques" | NE_PAS_CLASSER_LE_CONTRAT | Notre cabinet Talents Santé accompagne les entreprises et les candidats au travers de prestations de Recrutement et Intérim spécialisées sur les fonctions Médicales, Sanitaires et Pharmaceutiques |
| remuneration_texte | "Rémunération Et Avantages Package entre 45K€ et 47K€ annuel brut" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Rémunération Et Avantages Package entre 45K€ et 47K€ annuel brut |
| remuneration_texte | "Fixe compris entre 35K € et 37K € brut annuel, selon votre ancienneté + primes variables de 10K€ brut annuel" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Fixe compris entre 35K € et 37K € brut annuel, selon votre ancienneté + primes variables de 10K€ brut annuel |
| avantage | "PRIMES" | A_STRUCTURER | Fixe compris entre 35K € et 37K € brut annuel, selon votre ancienneté + primes variables de 10K€ brut annuel |
| avantage | "RTT" | A_STRUCTURER | Statut cadre, forfait jours avec 15 RTT |
| avantage | "REPAS" | A_STRUCTURER | VL de fonction, carte essence, PC, téléphone, 16€ de prise en charge pour les repas, mutuelle remboursée à 100%, participation aux frais d'électricité et à la box internet, CSE |
| avantage | "TRANSPORT" | A_STRUCTURER | VL de fonction, carte essence, PC, téléphone, 16€ de prise en charge pour les repas, mutuelle remboursée à 100%, participation aux frais d'électricité et à la box internet, CSE |
| avantage | "MUTUELLE" | A_STRUCTURER | VL de fonction, carte essence, PC, téléphone, 16€ de prise en charge pour les repas, mutuelle remboursée à 100%, participation aux frais d'électricité et à la box internet, CSE |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Vous êtes titulaire du diplôme d’État d'infirmier(ère) avec une première expérience réussie en service hospitalier |
| experience_non_chiffree | "Vous êtes titulaire du diplôme d’État d'infirmier(ère) avec une première expérience réussie en service hospitalier" | MENTION_A_CONFIRMER | Vous êtes titulaire du diplôme d’État d'infirmier(ère) avec une première expérience réussie en service hospitalier |
| certification | "DU_PLAIES" | SOUHAITE | Un DU en plaies et cicatrisation serait un plus |
| api_lieu | "Nanterre, Île-de-France, France" | NON_VERIFIE | "Nanterre, Île-de-France, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |
| api_salaire | "45K€" | NON_VERIFIE | "45K€" |

Passages sans classement : 16. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier de bloc opératoire (IBODE) F/H

Identifiant : b14b0433-34bd-447a-b27e-d39ef89eee0c

**Relecture :** Titre IBODE mais texte DE infirmier exige, DE bloc souhaite et debutants acceptes. Liste heterogene de competences ne definit pas service/population. CDI explicite.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT, IBODE_TITRE_MAIS_DIPLOME_SOUHAITE_DANS_TEXTE

| Controle | Retrouve |
|---|---|
| contrat_texte : CDI | oui |
| service : SSPI | oui |
| debutant_accepte : true | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| qualification_titre | "IBODE" | EXPLICITE | Infirmier de bloc opératoire (IBODE) F/H |
| service | "BLOC" | MENTION_A_CONFIRMER | Infirmier de bloc opératoire (IBODE) F/H |
| service | "BLOC" | MENTION_A_CONFIRMER | A propos de notre client Nous recrutons un Infirmier (H/F) en Contrat à Durée Indéterminée à temps plein pour le Bloc Opératoire et la Salle de réveil |
| service | "SSPI" | MENTION_A_CONFIRMER | A propos de notre client Nous recrutons un Infirmier (H/F) en Contrat à Durée Indéterminée à temps plein pour le Bloc Opératoire et la Salle de réveil |
| contrat_texte | "CDI" | EXPLICITE_A_VERIFIER | A propos de notre client Nous recrutons un Infirmier (H/F) en Contrat à Durée Indéterminée à temps plein pour le Bloc Opératoire et la Salle de réveil |
| temps_travail | "PLEIN" | EXPLICITE | A propos de notre client Nous recrutons un Infirmier (H/F) en Contrat à Durée Indéterminée à temps plein pour le Bloc Opératoire et la Salle de réveil |
| debut_mission | "DES_QUE_POSSIBLE" | DATE_NON_PRECISE | Poste à pourvoir dès que possible |
| service | "BLOC" | SOUHAITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| service | "SSPI" | SOUHAITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| competence | "TRACABILITE" | SOUHAITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| competence | "SURVEILLANCE" | SOUHAITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| competence | "HYGIENE" | SOUHAITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| certification | "DIPLOME_INFIRMIER" | SOUHAITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| alternatives_professionnelles | "DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur" | ALTERNATIVES_PAS_CUMUL | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| debutant_accepte | true | EXPLICITE | DE Infirmier exigé Mesures transitoires ou DE Infirmier de Bloc serait un plus mais débutants acceptés Descriptif du poste Missions Principales Réalisation de soins et d’activités liés à l’intervention et au geste opératoire Réalisation de soins auprès d’une personne bénéficiaire d’une intervention Mise en œuvre et contrôle de mesures d’hygiène en bloc opératoire Mise en œuvre de mesures de qualité et de sécurité en bloc opératoire Gestion d’équipement, de dispositifs médicaux et de produits en bloc opératoire Transmissions d’information, organisation, planification en bloc opératoire Accueillir et surveiller les patients en salle de surveillance post-interventionnelle (SSPI) Assurer le suivi des paramètres vitaux et l'évaluation de la douleur |
| population | "ENFANTS" | MENTION_A_CONFIRMER | Intervenir auprès d’enfants malades |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | Règles d’hygiène et d’asepsie |
| contexte_recruteur | "Capacité à gérer des situations stressantes Vaccinations prévues par le Code de Santé Publique à jour Description Société Synergie Care, réseau spécialisé dans l’emploi médical, paramédical et social vous accompagne dans l’évolution de votre carrière professionnelle : recrutement CDD-CDI, intérim médical, formation et conseil dans le secteur de la santé" | NE_PAS_CLASSER_LE_CONTRAT | Capacité à gérer des situations stressantes Vaccinations prévues par le Code de Santé Publique à jour Description Société Synergie Care, réseau spécialisé dans l’emploi médical, paramédical et social vous accompagne dans l’évolution de votre carrière professionnelle : recrutement CDD-CDI, intérim médical, formation et conseil dans le secteur de la santé |
| api_lieu | "Avranches, Normandy, France" | NON_VERIFIE | "Avranches, Normandy, France" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |

Passages sans classement : 28. Ces passages restent dans le JSON pour relecture.

## JOBSPIPE - Infirmier H/F

Identifiant : e2bc247f-21a1-4dc9-906b-1ae863a7a6b1

**Relecture :** Vacation explicite ; ne pas classer CDI a cause du recruteur. Septembre sans annee ; convention sans montant. 83 chambres pas 83 postes.

Alertes : CONTRAT_IMPORT_TEXTE_DIVERGENT

| Controle | Retrouve |
|---|---|
| contrat_texte : VACATION | oui |
| horaires_detail : 7H 19H | oui |
| periode_texte : Septembre | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| contexte_recruteur | "Que vous recherchiez des missions d'intérim ou des postes en CDD ou CDI, nous avons certainement l'offre qui correspond à vos attentes, n'hésitez pas à postuler pour rejoindre nos équipes" | NE_PAS_CLASSER_LE_CONTRAT | Que vous recherchiez des missions d'intérim ou des postes en CDD ou CDI, nous avons certainement l'offre qui correspond à vos attentes, n'hésitez pas à postuler pour rejoindre nos équipes |
| service | "EHPAD" | MENTION_A_CONFIRMER | Team Staffing Médical est à la recherche d'un Infirmier H/F pour un des missions en vacation de jour dans un EHPAD situé à LANGON pour le mois de septembre |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | Team Staffing Médical est à la recherche d'un Infirmier H/F pour un des missions en vacation de jour dans un EHPAD situé à LANGON pour le mois de septembre |
| periode_texte | "Team Staffing Médical est à la recherche d'un Infirmier H/F pour un des missions en vacation de jour dans un EHPAD situé à LANGON pour le mois de septembre" | ANNEE_ET_DATES_A_CONFIRMER | Team Staffing Médical est à la recherche d'un Infirmier H/F pour un des missions en vacation de jour dans un EHPAD situé à LANGON pour le mois de septembre |
| horaire_type | "JOUR" | MENTION_A_CONFIRMER | Team Staffing Médical est à la recherche d'un Infirmier H/F pour un des missions en vacation de jour dans un EHPAD situé à LANGON pour le mois de septembre |
| service | "EHPAD" | MENTION_A_CONFIRMER | Il s'agit d'un EHPAD composé de 83 chambres |
| charge_et_equipe | "Il s'agit d'un EHPAD composé de 83 chambres" | CONTEXTE_PAS_POSTES_A_POURVOIR | Il s'agit d'un EHPAD composé de 83 chambres |
| population | "PERSONNES_AGEES" | MENTION_A_CONFIRMER | Cette établissement fait partie du groupe Korian qui est l’un des leaders européens de l’accompagnement et des soins dédiés aux personnes âgées et aux publics fragilisés |
| service | "EHPAD" | MENTION_A_CONFIRMER | Présent en France et à l’international, le groupe gère des EHPAD, cliniques, résidences services seniors et structures spécialisées, avec une ambition forte : proposer un accompagnement humain, personnalisé et de qualité |
| contrat_texte | "VACATION" | EXPLICITE_A_VERIFIER | Contrat : Vacation |
| horaires_detail | "Horaires : 7H 19H" | HORAIRES_A_STRUCTURER | Horaires : 7H 19H |
| periode_texte | "Dates : Septembre" | ANNEE_ET_DATES_A_CONFIRMER | Dates : Septembre |
| remuneration_texte | "Salaire : Selon les conventions collectives des établissements" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire : Selon les conventions collectives des établissements |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Fournir des soins d’hygiène et de confort, réaliser des actes sur prescription médicale et assurer la surveillance de l’état clinique des patients |
| competence | "HYGIENE" | MENTION_A_CONFIRMER | Fournir des soins d’hygiène et de confort, réaliser des actes sur prescription médicale et assurer la surveillance de l’état clinique des patients |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | - Assurer les transmissions écrites via le logiciel de soins et les transmissions orales auprès de l’équipe pluridisciplinaire pour garantir le suivi de l’état de santé des patients |
| certification | "DIPLOME_INFIRMIER" | MENTION_A_CONFIRMER | Titulaire du DE infirmier, vous êtes rigoureux·se, organisé·e et doté·e d’une grande capacité d’adaptation |
| api_lieu | "33210 Langon" | NON_VERIFIE | "33210 Langon" |
| api_contrat | {"code":"MIS","label":null} | NON_VERIFIE | {"code":"MIS","label":null} |
| api_experience | {"label":null,"requirement":null} | NON_VERIFIE | {"label":null,"requirement":null} |
| api_coordonnees | {"latitude":44.55,"longitude":-0.25} | NON_VERIFIE | {"latitude":44.55,"longitude":-0.25} |

Passages sans classement : 17. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Iade H/f - Anesthesie

Identifiant : b05cb741-2b7f-45e3-be37-76f1f2b6647c

**Relecture :** IADE, diplome et RPPS ; experience bloc/SSPI/reanimation appreciee. 10 OU 12h = durees de poste ; 36 euros sans unite, CP/FM exclus.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| qualification_titre : IADE | oui |
| certification : RPPS | oui |
| horaires_detail : 10H OU 12H | oui |
| remuneration_texte : 36 | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| qualification_titre | "IADE" | EXPLICITE | Iade H/f - Anesthesie |
| certification | "DIPLOME_IADE" | MENTION_A_CONFIRMER | TAGA MEDICAL recherche pour l'un de ses établissements de santé partenaires un(e) Infirmier(ère) Anesthésiste Diplômé(e) d'État (IADE) en intérim afin de renforcer les équipes du service d'anesthésie |
| service | "BLOC" | MENTION_A_CONFIRMER | Au sein du bloc opératoire et en collaboration étroite avec les médecins anesthésistes-réanimateurs, vous assurez la prise en charge des patients avant, pendant et après les interventions chirurgicales |
| service | "REANIMATION" | MENTION_A_CONFIRMER | Vos missions : Préparer et vérifier le matériel d'anesthésie et de réanimation |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Assurer la surveillance clinique du patient durant l'intervention |
| service | "URGENCES" | MENTION_A_CONFIRMER | Participer à la prise en charge des urgences vitales |
| competence | "TRACABILITE" | MENTION_A_CONFIRMER | Veiller à la sécurité, au confort et à la traçabilité des soins |
| certification | "DIPLOME_IADE" | EXIGENCE_TEXTE | Participer à l'entretien et à la gestion des équipements du service MISSION EN 10H OU 12H Profil du candidat : Diplôme d'État d'Infirmier Anesthésiste (IADE) exigé |
| certification | "DIPLOME_INFIRMIER" | EXIGENCE_TEXTE | Participer à l'entretien et à la gestion des équipements du service MISSION EN 10H OU 12H Profil du candidat : Diplôme d'État d'Infirmier Anesthésiste (IADE) exigé |
| horaires_detail | "Participer à l'entretien et à la gestion des équipements du service MISSION EN 10H OU 12H Profil du candidat : Diplôme d'État d'Infirmier Anesthésiste (IADE) exigé" | HORAIRES_A_STRUCTURER | Participer à l'entretien et à la gestion des équipements du service MISSION EN 10H OU 12H Profil du candidat : Diplôme d'État d'Infirmier Anesthésiste (IADE) exigé |
| durees_poste_alternatives | "Participer à l'entretien et à la gestion des équipements du service MISSION EN 10H OU 12H Profil du candidat : Diplôme d'État d'Infirmier Anesthésiste (IADE) exigé" | DUREES_PAS_HEURES_DEBUT | Participer à l'entretien et à la gestion des équipements du service MISSION EN 10H OU 12H Profil du candidat : Diplôme d'État d'Infirmier Anesthésiste (IADE) exigé |
| experience_domaine | "BLOC" | SOUHAITE | Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée |
| experience_domaine | "SSPI" | SOUHAITE | Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée |
| experience_domaine | "REANIMATION" | SOUHAITE | Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée |
| certification | "RPPS" | SOUHAITE | Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée |
| certification | "ORDRE_INFIRMIER" | SOUHAITE | Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée |
| experience_non_chiffree | "Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée" | SOUHAITE | Inscription à l'Ordre National des Infirmiers en cours de validité et RPPS Expérience en bloc opératoire, SSPI ou réanimation appréciée |
| remuneration_texte | "Salaire :36 € hors CP + FM, remboursement des transports : 3.39 €" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire :36 € hors CP + FM, remboursement des transports : 3.39 € |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire :36 € hors CP + FM, remboursement des transports : 3.39 € |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |
| api_horaires | "Travail en journée" | NON_VERIFIE | "Travail en journée" |

Passages sans classement : 4. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - Ibode H/f - Chir Gynecologique (H/F)

Identifiant : 55f4ddd4-ce55-4626-b7aa-f331b36e4028

**Relecture :** IBODE gynecologie, instrumentation ; robot selon equipement donc conditionnel. 8 OU 10h et nuit a distinguer. Salaire sans unite.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| qualification_titre : IBODE | oui |
| specialite : GYNECOLOGIE | oui |
| competence : INSTRUMENTATION | oui |
| equipement : ROBOT | oui |
| horaires_detail : 08H OU 10H | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| qualification_titre | "IBODE" | EXPLICITE | Ibode H/f - Chir Gynecologique (H/F) |
| specialite | "GYNECOLOGIE" | MENTION_A_CONFIRMER | Ibode H/f - Chir Gynecologique (H/F) |
| avantage | "TRANSPORT" | A_STRUCTURER | TAGA MEDICAL recherche pour le compte de son client, un établissement situé dans le 75, et facilement accessible en transport en commun |
| service | "BLOC" | MENTION_A_CONFIRMER | Dans le cadre du renforcement de son équipe opératoire, notre établissement recherche un(e) Infirmier(e) de Bloc Opératoire Diplômé(e) d'État (IBODE) pour intervenir en chirurgie gynécologique, notamment sur des actes de : Chirurgie gynécologique fonctionnelle (endométriose, myomectomie.) |
| specialite | "GYNECOLOGIE" | MENTION_A_CONFIRMER | Dans le cadre du renforcement de son équipe opératoire, notre établissement recherche un(e) Infirmier(e) de Bloc Opératoire Diplômé(e) d'État (IBODE) pour intervenir en chirurgie gynécologique, notamment sur des actes de : Chirurgie gynécologique fonctionnelle (endométriose, myomectomie.) |
| experience_domaine | "BLOC" | CONDITIONNEL | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| specialite | "GYNECOLOGIE" | CONDITIONNEL | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| competence | "HYGIENE" | CONDITIONNEL | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| competence | "INSTRUMENTATION" | CONDITIONNEL | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| certification | "DIPLOME_IBODE" | CONDITIONNEL | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| equipement | "ROBOT" | CONDITIONNEL | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| experience_non_chiffree | "Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe" | SOUHAITE | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| horaire_type | "NUIT" | MENTION_A_CONFIRMER | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| horaires_detail | "Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe" | HORAIRES_A_STRUCTURER | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| durees_poste_alternatives | "Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe" | DUREES_PAS_HEURES_DEBUT | Vos missions : Préparation de la salle et du matériel opératoire Prise en charge du patient au bloc opératoire Instrumentation et assistance au chirurgien Respect strict des protocoles d'hygiène et de sécurité Collaboration avec l'équipe anesthésique et les autres soignants Robot-assistée (selon équipement) HORAIRES EN 08H OU 10H / NUIT Profil du candidat : Diplôme IBODE exigé Expérience en chirurgie gynécologique ou en bloc polyvalent appréciée Sens des responsabilités, rigueur, réactivité Bon relationnel, travail d'équipe |
| remuneration_texte | "Salaire :36 € hors CP + FM, remboursement des transports : 3.39 €" | MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER | Salaire :36 € hors CP + FM, remboursement des transports : 3.39 € |
| avantage | "TRANSPORT" | A_STRUCTURER | Salaire :36 € hors CP + FM, remboursement des transports : 3.39 € |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 1 Mois"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 1 Mois"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |

Passages sans classement : 0. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - INFIRMIER ANESTHÉSISTE DE (F/H)

Identifiant : 436e6c08-d17e-49e4-a588-292a1b5a5f1c

**Relecture :** Texte coupe : qualification IADE depuis titre, materiel/anesthesie ; aucune date inventee.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| qualification_titre : IADE | oui |
| competence : SURVEILLANCE | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| qualification_titre | "IADE" | CLASSIFICATION_TITRE | INFIRMIER ANESTHÉSISTE DE (F/H) |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Assurer la surveillance des patientes et patients pendant l'anesthésie, avec vigilance et sang-fr |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 10 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 10 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |

Passages sans classement : 3. Ces passages restent dans le JSON pour relecture.

## FRANCE_TRAVAIL - INFIRMIER ANESTHÉSISTE DE (F/H)

Identifiant : 4db97038-e962-456f-a56d-6d2f4cb8032c

**Relecture :** Texte coupe : qualification IADE depuis titre, aucune competence additionnelle inventee.

Alertes : aucune automatique ; voir relecture

| Controle | Retrouve |
|---|---|
| qualification_titre : IADE | oui |
| competence : SURVEILLANCE | oui |

| Champ | Valeur | Etat | Preuve |
|---|---|---|---|
| qualification_titre | "IADE" | CLASSIFICATION_TITRE | INFIRMIER ANESTHÉSISTE DE (F/H) |
| competence | "SURVEILLANCE" | MENTION_A_CONFIRMER | Vous participez à l'administration de l'anesthésie et surveillez les constantes pendant les interventions |
| api_lieu | "75 - Paris" | NON_VERIFIE | "75 - Paris" |
| api_contrat | {"code":"MIS","label":"Intérim - 10 Jour(s)"} | NON_VERIFIE | {"code":"MIS","label":"Intérim - 10 Jour(s)"} |
| api_experience | {"label":"Débutant accepté","requirement":"D"} | NON_VERIFIE | {"label":"Débutant accepté","requirement":"D"} |

Passages sans classement : 4. Ces passages restent dans le JSON pour relecture.
