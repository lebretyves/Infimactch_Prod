export const reasonLabels: Record<string, string> = {
  QUALIFICATION_MISSING: "Le diplôme requis n’est pas renseigné.",
  RPPS_NOT_CHECKED: "Vérifiez votre numéro professionnel dans Mon dossier.",
  RPPS_PENDING: "La vérification professionnelle est encore en attente.",
  RPPS_NOT_FOUND: "Le numéro professionnel n’a pas été retrouvé.",
  REQUIRED_SKILLS_MISSING: "Certaines compétences requises sont manquantes.",
  EXPERIENCE_INSUFFICIENT:
    "L’expérience renseignée est insuffisante pour cette mission.",
  NOT_FULLY_AVAILABLE: "Les disponibilités ne couvrent pas toute la mission.",
  ASSIGNMENT_CONFLICT:
    "Une autre mission est déjà confirmée sur cette période.",
  SHIFT_NOT_ACCEPTED:
    "Ces horaires ne figurent pas parmi vos horaires acceptés.",
  MOBILITY_INCOMPLETE: "Complétez votre position et votre rayon de mobilité.",
  OUTSIDE_RADIUS: "La mission est située hors de votre rayon de déplacement.",
  MISSION_ALREADY_STARTED: "Cette mission a déjà commencé.",
  MISSION_NOT_OPEN: "Cette mission n’est plus ouverte.",
};
export function explainReasons(fields: unknown): string {
  return Array.isArray(fields)
    ? fields
        .map(
          (code) =>
            reasonLabels[String(code)] ||
            "Une condition de la mission n’est pas remplie.",
        )
        .join(" ")
    : "";
}
export const serverMessages: Record<string, string> = {
  "Impossible d’envoyer le code. Rejoignez le serveur du bot et autorisez ses messages privés, puis vérifiez votre identifiant Discord.": "Impossible d’envoyer le code. Rejoignez le serveur du bot et autorisez ses messages privés, puis vérifiez votre identifiant Discord.",
  "Trois codes maximum par heure. Réessayez plus tard.": "Trois codes maximum par heure. Réessayez plus tard.",
  "At least one qualification required":
    "Renseignez au moins une qualification dans votre profil.",
  "Complete the IDE qualification explicitly":
    "Confirmez explicitement votre diplôme IDE pour une spécialité.",
  "Invalid mission timezone": "Choisissez un fuseau horaire valide pour la mission.",
  "Invalid interval or missing timezone": "Vérifiez les dates de vos périodes.",
  "Experience must describe completed periods":
    "Les expériences doivent porter sur des périodes passées.",
  "Preferred shift must be accepted":
    "Vos horaires préférés doivent faire partie des horaires acceptés.",
  "Invalid birth date": "Vérifiez votre date de naissance.",
  "Diploma year cannot be in the future":
    "L’année du diplôme ne peut pas être dans le futur.",
  "Mission already started": "Cette mission a déjà commencé.",
  "Mission version changed":
    "Les conditions ont changé. Rechargez la mission avant de confirmer.",
  "Fresh consent required":
    "Le candidat doit confirmer à nouveau les conditions de la mission.",
  "Fresh application consent required":
    "Le candidat doit confirmer à nouveau les conditions de la mission.",
  "Invalid application transition":
    "Cette action n’est plus possible dans l’état actuel de la candidature.",
  "Invalid mission transition":
    "Cette action n’est plus possible dans l’état actuel de la mission.",
  "Mission must start in the future":
    "La mission doit commencer dans le futur.",
  "Mission has not ended": "La mission n’est pas encore terminée.",
  "Authorized establishment link required":
    "L’établissement doit être rattaché à votre agence avant de publier une mission.",
  "Concurrent incompatible assignment":
    "Une autre affectation incompatible vient d’être enregistrée.",
  "Assigned application": "Cette candidature est déjà affectée.",
  "RPPS missing": "Renseignez votre numéro professionnel.",
  "Specialty required": "Indiquez la spécialité du bloc.",
  "Invalid mission interval": "La fin de mission doit être après le début.",
  "Organization cannot be reassigned":
    "Les organisations d’une mission ne peuvent pas être remplacées.",
  "Internal server error":
    "Le service est indisponible pour le moment. Réessayez.",
};
