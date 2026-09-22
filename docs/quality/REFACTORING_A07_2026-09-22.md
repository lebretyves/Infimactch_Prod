# A07 — découpage ciblé des formulaires, missions et règles métier

Date : 22 septembre 2026. Base : Main `081fcc3`, alignée fonctionnellement avec Backend `698292d`. Le travail conserve les modifications frontend présentes dans cette base.

## Changements

- Inscription : sections candidat, organisation/FINESS, référent et compte entreprise dans `pages/inscription/`. La validation du compte est isolée dans `accountValidation.ts` et les règles de format FINESS sont partagées sans importer le client API dans les tests purs. Les étapes candidat suivantes existaient déjà ; elles ne sont pas recréées.
- Missions : filtres, résultats et pagination dans `pages/missions/`, paramètres URL et bornage dans `searchModel.ts`. Les requêtes, zones de recherche, dates, protections contre les réponses obsolètes et focus restent orchestrés dans la page.
- Backend : adaptateurs de profil/mission et validations dans quatre modules dédiés. Les transactions, verrous, autorisations, idempotence, événements et audit restent dans leurs services. Les anciens exports restent disponibles pour compatibilité.

Aucun changement fonctionnel recherché : textes, champs, classes CSS et actions conservés. La validation profil continue de normaliser les disponibilités ; la modification d’une mission conserve ses deux validations successives.

| Fichier orchestrateur | Lignes avant | Lignes après |
| --- | ---: | ---: |
| `frontend/src/pages/Inscription.tsx` | 938 | 549 |
| `frontend/src/pages/Missions.tsx` | 894 | 408 |
| `backend/src/missions/missions.service.ts` | 543 | 501 |
| `backend/src/profiles/profiles.module.ts` | 417 | 345 |

Ces nombres décrivent le découpage, pas une mesure de qualité ou de couverture.

## Validation locale

- Typage frontend et backend réussi ; 367 tests backend et 68 tests frontend réussis.
- Builds application et admin réussis.
- Tests navigateur existants réussis : recommandations, erreurs/reprise, accessibilité, publication des missions, Discord et RPPS simulé.
- Nouveau test inscription : candidat classique/Google, retour arrière, agence classique/Google, consentement et contenu envoyé ; saisie manuelle préservée pendant une réponse FINESS retardée.
- Nouveau test recherche à 390 et 1440 pixels : filtres, pagination, retour navigateur, résultats vides, réinitialisation et correction d’une page hors limites.
- Tests supplémentaires : reconnaissance du métier, navigation locale et dates dans trois fuseaux horaires.

Les nouveaux parcours navigateur utilisent des réponses API fictives. Ils ne créent pas de comptes réels et ne prouvent pas une recette publiée ni une livraison de notifications. La CI complète sur le commit final doit être verte avant promotion.

## Suite prioritaire

1. Rejouer et tracer la recette A03 sur la version publiée : parcours complet, PDF, notifications, deux workflows n8n, MFA propriétaire avec sa participation.
2. Renseigner les heures humaines réelles A02 et préparer la soutenance à quatre ; ne pas déduire les heures des commits ou durées d’exécution des outils.
3. Vérifier les protections et la promotion conditionnée par les tests A09 ; documenter le SHA servi et le retour arrière.
4. Terminer les décisions A05 sur la responsabilité effective et les traitements, puis la sauvegarde indépendante A08 avant usage réel. La copie D: interne reste distincte d’une copie hors site.

Les décisions A04 et A06 validées pour la démonstration restent inchangées. Ce refactoring ne ferme pas les autres réserves d’exploitation.
