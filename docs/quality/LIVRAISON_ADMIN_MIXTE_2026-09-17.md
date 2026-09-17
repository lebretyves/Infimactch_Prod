# Administration indépendante et recommandations mixtes

Livraison du 17 septembre 2026. Ce rapport remplace les états « en attente » des diagnostics historiques pour les éléments ci-dessous.

## Déploiement

- Administration : https://infimatch-admin.vercel.app ; déploiement `dpl_2Req19PwZHZwM4ESeHW4856c1Bc9`, bundle `admin-7LJvNFLz.js`.
- Site : https://infimactch-prod-backend-l5bc.vercel.app ; version applicative `infimactch-prod-backend-l5bc-fnw3786rg-neotravel.vercel.app`.
- Backend : https://infimactch-prod-backend.vercel.app ; version applicative `infimactch-prod-backend-42ir3abeu-neotravel.vercel.app`.
- Sources applicatives : `9c4d29c` dans lebretyves/Infimactch_Prod, branche Main ; `08b12ba` dans Ziwazou/infiMatch, branche fusion-front_Back.
- Migration additive `AdminOperations1789381900000` appliquée à Neon.

Le domaine admin dessert une interface indépendante et transmet uniquement ses routes administrateur au backend commun. Aucun second ensemble de données métier n'est créé. L'invitation du premier responsable est préparée dans un fichier privé hors Git ; l'activation du compte réel et l'enrôlement MFA restent à effectuer par son titulaire. Les comptes dédiés ne peuvent pas se connecter au parcours client, même avec leur mot de passe valide.

## Fonctions livrées

Administration des comptes et accès, organisations et membres, liens agence/établissement protégés, missions et explications de matching versionnées, revue professionnelle sans attribution automatique de qualification, sources/imports avec pause et relance contrôlée, incidents, suivi des exécutions, audit et demandes de confidentialité en lecture. Les opérations sensibles requièrent des droits serveur et un MFA récent.

L'accueil intérimaire présente séparément les missions compatibles et les offres externes récentes : voir RECOMMANDATIONS_DIAGNOSTIC.md. Aucun score de compatibilité clinique n'est inventé pour une offre externe incomplète.

## Vérifications

- 201 tests backend réussis, zéro échec ; couverture lignes 81,68 %, branches 79,94 %, fonctions 78,76 %. Migrations sur base vierge et régressions de sécurité PostgreSQL réussies.
- Compilations et tests navigateur des interfaces admin et recommandations mixtes réussis ; contrôles mobiles 375/768/1440 pixels.
- En production : activation dédiée avec compte fictif, MFA TOTP réel, refus de réutilisation d'invitation/code, refus d'accès client, sessions sécurisées et révocation à la déconnexion.
- Tous les écrans de lecture admin, dont opérations, incidents et demandes de confidentialité, répondent avec les droits attendus et sans secrets.
- Profil modifié et relu, PDF fictif chiffré envoyé puis téléchargé, recommandations mixtes, notification de bienvenue, configuration Discord, rejet CSRF et protection des routes internes : réussis.
- Parcours entreprise : tableau de bord, besoin enregistré, offre brouillon et confidentialité vérifiés. Les comptes/documents de recette sont supprimés après les essais.
- Formulaire d'activation public réellement rendu dans un navigateur ; capture `admin-production-activation.png` sans secret.

## Sauvegarde et exploitation

Sauvegarde réelle autorisée : `data/backups/production/2026-09-17T06-34-30-282Z`, trois composants chiffrés PostgreSQL, MongoDB et configuration. Restauration isolée réussie en 5,719 secondes : six comptes au moment de la capture, un document fictif et son blob, déchiffrement réussi de ce document. Une collection MongoDB vide dans cette capture ; la restauration d'un document MongoDB est couverte par le test synthétique distinct. Voir restore-production.json et restore-synthetic.json.

Aucun port exposé ni réseau dans les conteneurs de restauration, aucun remplacement de production. La capture inclut le compte temporaire de recette, ensuite supprimé en production. Avant toute vraie reprise, réconcilier le registre d'effacement actuel. Le résultat sans données personnelles ni secrets est enregistré dans operational_check pour l'écran Sauvegardes.

Les exécutions planifiées du 17 septembre ont été observées : imports France Travail/JobsPipe réussis à 02:15 UTC ; dispatch et rappels périodiques réussis notamment à 06:00 UTC. La conservation des charges complètes n8n reste désactivée ; seul le suivi technique minimal est conservé.

## Limites restantes

Pro Santé Connect reste désactivé en attente d'habilitation et d'identifiants ANS. Aucun audit RGAA complet ni essai physique d'installation mobile n'est revendiqué. La continuité n8n après la période d'essai dépend de l'offre du compte. La maintenance destructive quotidienne et une politique de rotation automatique des sauvegardes ne sont pas activées. Vault reste local, conformément au choix du propriétaire ; seuls les secrets nécessaires au runtime sont présents côté serveur Vercel. Aucun service d'email payant ni abonnement supplémentaire n'a été souscrit.
