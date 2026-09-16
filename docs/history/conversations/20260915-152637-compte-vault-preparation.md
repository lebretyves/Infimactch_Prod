# Compte personnel Vault : preparation

Etat : NON CREE. Aucun mot de passe ou jeton personnel genere.

- Methode : Userpass, chemin userpass.
- Identifiant : lebre.
- Policy preparee : infra/vault/personal-lebre.hcl.
- Droits : lecture des deux secrets V1 et de leurs metadonnees ; navigation dans leurs dossiers ; gestion de sa session et changement de son propre mot de passe.
- Aucun droit d'ecriture/suppression des secrets, de lecture V2 ou d'administration.
- Session prevue : 30 minutes, maximum 2 heures ; pas de policy default.
- Mot de passe : aleatoire, conserve uniquement dans le dossier prive protege data/vault/ et remis localement a l'utilisateur.

## Etape administrative bloquee

Les roles existants ne permettent pas d'activer Userpass ou de creer une policy/utilisateur. Le controle automatique a refuse meme la verification de sys/generate-root/attempt avec le role operateur, car la creation d'un acces personnel ne vaut pas autorisation explicite de recuperation root.

Autorisation requise : utiliser les parts de recuperation locales pour obtenir un jeton administrateur temporaire, activer Userpass et creer uniquement ce compte, puis revoquer ce jeton. Si la configuration doit autoriser temporairement la procedure generate-root, retablir sa restriction ensuite. Ne pas executer cette procedure avant autorisation.

## Recette apres autorisation

Verifier le login, les lectures V1, le refus d'ecriture et de lecture V2, la revocation du jeton administrateur, puis l'ouverture de la session personnelle. Ne pas afficher les valeurs secretes dans les preuves. Le simple affichage de Userpass dans l'interface ne prouve pas son activation.
