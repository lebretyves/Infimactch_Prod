# Corrections ciblées RGAA — 20 septembre 2026

> Preuve datée : les constats et chiffres ci-dessous concernent cette campagne. Pour la configuration actuelle, consulter [l’architecture](../SCHEMA_ARCHITECTURE_V1.md), [les automatisations](../AUTOMATISATIONS.md) et [les réserves du rendu](../rendu/README.md).

- Identité : autocomplete=bday transmis au véritable input de date.
- Demande de correction : section nommée par un h3 via aria-labelledby et identifiant React unique ; bday également sur la correction de naissance.
- Contrôles partagés : boutons avec retour à la ligne et hauteurs minimales, champs avec hauteur adaptable, libellés avec retour à la ligne. Fonctionne sans activer le panneau d’accessibilité.

## Vérification locale
Build frontend réussi. Edge automatisé, API simulée, aucune donnée réelle ni demande envoyée.
Échantillon : /inscription/identite, /inscription/localisation, /connexion, /profil avec formulaire de correction ouvert.
Largeurs : 320, 375, 768, 1280 pixels. Interligne 1.5, espacement lettres .12em, mots .16em, marge après paragraphes 2em.
16 configurations : aucun dépassement horizontal de page ni débordement mesuré sur boutons, labels, titres h1-h3 et paragraphes du main.
Vérification DOM bday sur inscription et correction ; région accessible nommée ; ouverture par Entrée depuis le bouton focalisé.
Résultats détaillés : RGAA_ESPACEMENTS_2026-09-20.json.

## Limites
Ce contrôle géométrique automatisé ne détecte pas tous les chevauchements ni toutes les difficultés de lecture. Parcours clavier complet, zoom natif, lecteur d’écran et téléphone physique restent à réaliser humainement. Aucune conformité RGAA complète revendiquée.
Référence : https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/ (11.13 et 10.12).