# Choix d’exercice par métier — 18 septembre 2026

Le profil et l’inscription affichent un encadré par diplôme déclaré (IDE, IADE, IBODE), avec des services facultatifs à choix multiples. Les compétences de soins sont présentées dans chaque encadré. Aucun service coché signifie sans préférence, et non une compétence automatiquement acquise.

Les préférences sont stockées dans profile.details.practiceServices sous des clés distinctes IDE, IADE et IBODE. Le brouillon d’inscription les conserve aussi. Aucun changement de schéma SQL n’est nécessaire. Les anciens profils sans cette propriété conservent leur comportement.

Le matching automatique compare uniquement les services du métier demandé par la mission : plusieurs services sont des alternatives. Une mission hors préférence reçoit SERVICE_NOT_PREFERRED et ne fait pas partie des propositions admissibles automatiques. La pondération du score est inchangée. La version des règles change pour invalider les anciennes explications enregistrées.

Les préférences ne remplacent ni diplôme, ni compétence, ni disponibilité. Une candidature volontaire hors préférence reste possible avec un avertissement ; une affectation explicite vérifie toutes les contraintes professionnelles et de planning sans bloquer sur cette seule préférence. Les missions déjà confirmées ne sont pas modifiées.

Les annonces externes conservent une comparaison indicative : le service est comparé seulement lorsqu’il peut être identifié sans ambiguïté. Une information manquante n’est pas transformée en correspondance.

Les compétences communes restent des déclarations uniques : elles ne sont pas dupliquées artificiellement par diplôme. Les sélections précédentes sont conservées lors des changements de contexte. Les populations et spécialités de bloc déjà enregistrées sont conservées.

Validation : compilation frontend/backend ; tests métier et validation DTO ; tests de reprise du brouillon ; scénario navigateur avec deux métiers, plusieurs services, effacement indépendant, sauvegarde/rechargement simulés, conservation des compétences et affichage mobile. Les contrôles navigateur utilisent des API fictives, sans écriture en production.

État : corrections locales, non commitées, non poussées et non déployées.
