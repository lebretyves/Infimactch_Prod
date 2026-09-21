# Démonstration InfiMatch — script et secours

Scénario proposé, à répéter ; il n’a pas été exécuté par la création de ce document. Ne pas annoncer un résultat avant de l’avoir observé sur le SHA de remise.

## Préparation

Utiliser un environnement isolé, des comptes fictifs et un destinataire de test autorisé. Les appels fournisseur sont remplacés par des fixtures ou un instantané daté lorsque l’accès est indisponible. Ne pas afficher mots de passe, clés, CV réels, RPPS de tiers ou adresses personnelles dans les captures. Le portail réel ne devient pas une sandbox parce qu’une mission est intitulée « démo ».

La reprise périodique n8n est à quatre heures : ne pas attendre ce délai sur scène ni déclencher des essais répétés sans compter le quota. Préparer les résultats datés des deux workflows. La configuration Discord après inscription est facultative.

Consigner le SHA backend, le SHA frontend, les migrations, la date des données et les versions n8n. Ouvrir le PDF du support avant de commencer. Répartition proposée : A auth/missions ; B données/matching ; C interface ; D automatisations/exploitation. Les noms et le temps de parole restent à attribuer par l’équipe.

## Parcours en huit étapes

1. **Publication — A + C.** Créer une mission fictive IDE / Urgences, dans une ville explicite, à J+7 de 8 h à 16 h. Montrer une saisie incorrecte puis sa correction. Résultat attendu : fiche publiée, dates et lieu conservés.
2. **Recherche — C.** Ouvrir le compte candidat fictif. Vérifier ville/rayon, filtres et affichage de provenance. Résultat attendu : mission visible selon le périmètre choisi, sans confusion avec les alertes.
3. **Matching — B.** Comparer deux profils fictifs, afficher les composantes et une donnée manquante. Résultat attendu : score explicable, incertitude visible, aucune compatibilité inventée. Relever les pondérations de l’API active.
4. **Candidature — C.** Envoyer une candidature puis consulter son état côté recruteur. Résultat attendu : une seule candidature créée ; droits croisés refusés si testés dans le banc isolé.
5. **Affectation — A.** Confirmer, consulter l’agenda et essayer un chevauchement fictif. Résultat attendu : créneau confirmé ; chevauchement bloqué ; candidatures concurrentes fermées avec motif sans nom d’autre employeur.
6. **Document et message — D.** Télécharger la confirmation. Montrer le journal SMTP sur le destinataire autorisé seulement. Résultat attendu : document lisible ; distinguer l’acceptation fournisseur de la livraison et de la lecture.
7. **Automatisations — D.** Montrer un workflow de correspondance réussi, puis la confirmation ou une relance éligible. Utiliser une fixture datée pour la relance ; ne pas avancer une horloge de production ni réactiver les anciennes missions.
8. **Annulation et bilan — A + tous.** Annuler l’affectation fictive, télécharger le récapitulatif, vérifier l’état de l’agenda et expliquer les limites métier. Terminer par les preuves et les réserves du dossier.

Pour le CV enrichi, extension courte uniquement si la version intégrée est prête : charger un document fictif avec IDE 2014 et IADE 2020, une compétence et une expérience terminée ; montrer les suggestions, leur preuve textuelle et la validation explicite. Une expérience « en cours » ne doit pas recevoir une date de fin fabriquée.

## Scénario de secours

- **API ou réseau indisponible :** afficher les captures déjà obtenues sur le SHA indiqué, ou présenter le PDF et les traces datées. Dire qu’il s’agit d’un résultat antérieur ; ne pas simuler une exécution en direct.
- **Quota JobsPipe épuisé :** montrer l’arrêt au quota et le dernier instantané réel daté. Ne pas changer de clé pour prétendre augmenter le quota.
- **SMTP indisponible :** montrer le résultat du test isolé et l’état FAILED/UNCERTAIN approprié. Aucun renvoi aveugle ; aucune promesse de réception en boîte principale.
- **n8n indisponible :** ouvrir l’export JSON et une preuve d’exécution datée, en annonçant la limite. Ne pas déclarer le workflow actif sans contrôle.
- **Données du profil incomplètes :** montrer l’explication de l’incertitude. Ne jamais transformer un RPPS absent en vérifié.

## Fiche de répétition à compléter

Date et participants : non renseignés. Durée officielle : non fournie. SHA réellement remis : à relever après publication. Étapes exécutées/résultats : à renseigner après la répétition. Incident et adaptation : à documenter s’il survient.

Le support ne remplace pas la participation de chaque membre, les heures réelles, la preuve de cadrage J+2 ou la recette de la version finale.
