# Verification Discord

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

Le relais n8n actif utilise un noeud HTTP Request avec identifiant securise discordBotApi. Lecture authentifiee /users/@me : HTTP 200 et bot=true ; lecture des serveurs : un serveur. Aucun message de test envoye a une personne.

L'administration effectue maintenant un controle reel en lecture de l'identite du bot. Disponible signifie authentification du bot reussie, pas livraison ou lecture d'un message prive. L'echec du controle s'affiche comme indisponible.

Association interimaire : espaces exterieurs supprimes, ID conserve comme texte pour eviter toute perte de precision, message explicite si le format n'est pas 17 a 20 chiffres. Le pseudo et les identifiants de salon/serveur ne remplacent pas l'identifiant utilisateur. Test navigateur intercepte : formats invalides ne declenchent aucune requete, identifiant valide transmis exactement ; aucun envoi automatique.

Au diagnostic initial, aucune demande d'association n'etait enregistree en base. La capture fournie confirme la saisie d'un pseudo au lieu de l'identifiant utilisateur numerique, rejetee avant tout appel serveur. Le compte Discord doit partager un serveur avec le bot et autoriser les messages prives. Le code recu en message prive prouve la possession du compte Discord ; il est distinct de l'authentification administrateur simplifiee.