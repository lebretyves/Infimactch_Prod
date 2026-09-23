# Recette humaine de la version publiée

À réaliser par un membre de l’équipe avec comptes de démonstration autorisés. Avant toute émission email/Discord, obtenir l’accord du propriétaire du compte destinataire. Ne pas utiliser de données ou de justificatifs réels pour la démonstration. Cette fiche ne constitue pas une preuve d’exécution.

Consigner pour chaque ligne de [RECETTE_FINALE.csv](RECETTE_FINALE.csv) : SHA applicatif, URL, date/heure, observateur, attendu, résultat réel et lien vers une capture anonymisée. Un contrôle automatisé ou simulé ne remplace pas cette ligne.

| Scénario | Manipulation et résultat attendu |
|---|---|
| Inscription | Créer un candidat et une entreprise de démonstration ; vérifier les champs obligatoires, messages d’erreur et arrivée dans le bon espace. |
| Discord facultatif | S’inscrire sans Discord ; le parcours reste utilisable. Activer ensuite uniquement sur un compte destinataire autorisé et contrôler le choix des événements. |
| Admin / MFA | Connexion avec MFA réel du compte habilité ; un code erroné doit être refusé et la déconnexion doit fermer l’accès. Ne pas capturer de code de récupération. |
| Mission | Créer une mission future explicitement fictive, puis la consulter avec le candidat. Vérifier titre, dates, fuseau et établissement. |
| Matching / candidature | Vérifier les critères, candidater ; l’état doit indiquer attente de décision, sans affectation implicite. Contrôler l’explication disponible ou son indisponibilité explicite. |
| Confirmation / agenda | Confirmer avec l’organisation habilitée ; le candidat retrouve l’affectation et les horaires dans son agenda. |
| PDF | Télécharger la confirmation avec le titulaire ; contrôler dates et parties, puis vérifier qu’un autre compte n’y accède pas. |
| n8n mission | Déclencher sur scénario autorisé ; relever l’identifiant d’exécution et les étapes réussies, sans exporter les credentials. |
| n8n confirmation | Relever l’exécution correspondante ; ne pas confondre exécution acceptée et réception effective. |
| Discord réel | Sur destinataire autorisé, contrôler la réception, le libellé et le lien ouvrant la bonne mission ; capture anonymisée. |
| Email réel | Contrôler le statut prestataire et la réception dans la boîte autorisée ; distinguer accepté, livré et observé. |
| Annulation | Annuler la mission fictive ; vérifier état, agenda et accès aux documents selon le comportement prévu. |
| Accessibilité | Faire le parcours au clavier seul, puis au lecteur d’écran et sur téléphone physique ; noter focus, annonces, zoom, débordement et obstacles rencontrés. |

Après le test, clôturer le scénario fictif selon la procédure de l’application, sans purger arbitrairement les bases. En cas d’échec, conserver l’étape exacte et l’attendu, puis rejouer ce scénario après correction. Ne pas cocher une étape non exécutée.
