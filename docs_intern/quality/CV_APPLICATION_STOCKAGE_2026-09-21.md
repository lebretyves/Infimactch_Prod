# CV : application des propositions et stockage

## Corrections
- Une année non reconnue (`null`) ne bloque plus l’application des diplômes sélectionnés. Elle conserve une année existante ; sinon elle reste absente, sans copier l’année du diplôme spécialisé vers IDE.
- Les années renseignées restent contrôlées : entier depuis 1900, pas de date future ni spécialité antérieure à IDE. Les propositions restent soumises à sélection et confirmation, puis à sauvegarde du profil.
- Le bouton « Enregistrer le CV dans mes documents » conserve le fichier indépendamment de l’analyse et de la sauvegarde du profil. L’analyse seule n’enregistre pas le fichier.
- CV PDF/DOCX/JPEG/PNG, 3 Mo maximum pour le stockage. La lecture seule reste possible jusqu’à 5 Mo. Le téléchargement restitue les octets d’origine avec une extension adaptée.
- Nouveau type de document CV, stockage chiffré existant, accès propriétaire, contrôle du format, quota partagé et clé d’idempotence conservée lors d’une reprise réseau. Les CV sont supprimés avec les autres documents privés lors de la clôture du compte.
- Les imports antérieurs non stockés ne peuvent pas être reconstitués : il faut sélectionner à nouveau leur fichier.

## Vérifications
- Compilations backend et frontend réussies.
- 367 tests unitaires backend réussis, dont nouvelles validations CV et règles de conservation.
- Neuf tests de lecture et révision CV frontend réussis.
- Navigateur sur build local avec API simulées : années existantes conservées, sauvegarde du profil, aucun stockage automatique, erreur 503 puis reprise avec même clé, liste après rechargement, téléchargement exact PDF et DOCX. Quatre largeurs 320/375/768/1440 sans débordement sur le profil.
- Migration additive `CvDocuments1790023000000` : étend les types acceptés sans supprimer ni modifier les documents existants.
