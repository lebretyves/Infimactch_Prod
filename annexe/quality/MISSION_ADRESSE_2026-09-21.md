# Création de mission : adresse et coordonnées facultatives

Le formulaire conserve une adresse obligatoire, sans champs latitude/longitude. La position de l’établissement est reprise lorsqu’elle est connue et correspond à l’adresse proposée. Modifier le texte efface la position précédente ; choisir une suggestion associe la nouvelle position. Une recherche sans résultat ou indisponible ne bloque pas la publication.

L’API accepte une paire de coordonnées numériques valides, une paire nulle ou leur absence. Une paire partielle reste refusée. La migration `MissionLocationOptional1790006400000` rend `mission.location` nullable, sans modifier les lignes existantes ni créer de position artificielle. Le retour arrière refuse de rétablir NOT NULL si des positions sont inconnues.

Une mission sans position conserve son adresse et reste consultable sans filtre géographique. Sa distance est inconnue ; elle n’entre pas dans un filtre de rayon ou une alerte automatique exigeant une mobilité vérifiée. Une candidature volontaire conserve les avertissements et contrôles habituels. Une modification ultérieure permet de choisir une adresse reconnue.

Validation : compilation frontend/backend, tests PostgreSQL isolés dans `backend/test/integration/mission-location.spec.ts`, régressions de sécurité et suite navigateur officielle. Les scénarios navigateur couvrent agence et établissement : position connue, absente, suggestion sélectionnée et géocodage indisponible. Le tutoriel Publier une mission et le contrat OpenAPI sont actualisés.
