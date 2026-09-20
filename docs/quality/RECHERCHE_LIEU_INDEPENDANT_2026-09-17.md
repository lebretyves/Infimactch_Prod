# Recherche autour d'un lieu choisi

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

Le lieu de recherche n'est plus impose par les coordonnees du domicile. Dans Missions, choisir une ville ou une adresse parmi les propositions, puis un rayon. La selection propose 25 km ; 5, 10, 25, 50, 100, 200 km et toutes les distances restent disponibles. Le bouton Utiliser mon domicile permet de revenir au centre du profil. Aucune ecriture de profil n'est effectuee.

Le lieu et les coordonnees sont conserves dans les filtres URL pour la pagination, le retour navigateur et le changement d'origine. Modifier le texte invalide la selection precedente. Les profils sans domicile geolocalise peuvent aussi rechercher autour d'un lieu.

Le rayon est une distance geographique directe. Les offres partenaires restent prioritaires ; les offres externes ne sont retenues que si leurs coordonnees fournies par la source sont dans le rayon. Les coordonnees externes restent indicatives ; une adresse precise n'est pas garantie. Les offres externes sans coordonnees sont exclues du rayon. Les recommandations strictes conservent les criteres du profil.

La recherche de lieu utilise le service public [IGN Geoplateforme](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/) via le backend, sans nouvelle cle API. Delai maximum 8 secondes, limite 30 requetes par minute par IP pour cet endpoint ; aucune sauvegarde de l'adresse recherchee dans le profil.

Validation : recette isolee 211 tests PASS. Cas domicile Paris/recherche Lyon, partenaires et offres externes localisees, exclusion des coordonnees inconnues, conservation du profil. Tests UI : choix explicite, erreurs et reponses tardives, profils sans coordonnees, pagination, changement d'origine, retour domicile et affichages 375/1440.