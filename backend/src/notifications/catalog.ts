export const notificationCatalog = {
  MATCH: "Nouvelle mission compatible",
  CONFIRMATION: "Affectation confirmée et document disponible",
  CANCELLATION: "Mission annulée",
  REMINDER: "Mission non pourvue",
  NEED_CREATED: "Nouveau besoin de personnel",
  NEED_UPDATED: "Besoin modifié",
  MISSION_PUBLISHED: "Mission publiée ou republiée",
  APPLICATION_SUBMITTED: "Candidature envoyée",
  APPLICATION_SELECTED: "Candidature présélectionnée",
  APPLICATION_REJECTED: "Candidature refusée",
  APPLICATION_WITHDRAWN: "Candidature retirée",
  MISSION_CHANGED: "Conditions de mission modifiées",
  MISSION_FILLED: "Mission pourvue par un autre candidat",
  MISSION_COMPLETED: "Mission terminée",
  WELCOME: "Bienvenue dans InfiMatch",
  RPPS_RESULT: "Résultat de vérification professionnelle",
  DISCORD_CONNECTED: "Compte Discord associé",
  CLOSURE_REQUESTED: "Demande de clôture reçue",
  CLOSURE_CANCELLED: "Demande de clôture annulée",
  CLOSURE_APPROVED: "Clôture approuvée",
} as const;
export type NoticeKind = keyof typeof notificationCatalog;
export const personalKinds: NoticeKind[] = ["WELCOME", "RPPS_RESULT", "DISCORD_CONNECTED", "CLOSURE_REQUESTED", "CLOSURE_CANCELLED", "CLOSURE_APPROVED"];
export const organizationKinds = Object.keys(notificationCatalog).filter(k => !personalKinds.includes(k as NoticeKind) && !["MATCH", "MISSION_FILLED"].includes(k));
export function noticeMessage(kind: NoticeKind, role: string, detail?: string): string {
  const nurse = role === "NURSE";
  switch (kind) {
    case "WELCOME": return nurse ? "Bienvenue dans InfiMatch. Complétez votre dossier et vos disponibilités pour candidater." : role === "AGENCY" ? "Votre espace agence est créé. Retrouvez vos établissements et vos missions dans InfiMatch." : "Votre espace établissement est créé. Vous pouvez déclarer vos besoins de personnel dans InfiMatch.";
    case "NEED_CREATED": return "Un établissement lié à votre agence a déclaré un nouveau besoin de personnel.";
    case "NEED_UPDATED": return "Un établissement lié à votre agence a modifié un besoin de personnel. Consultez les nouvelles conditions.";
    case "MISSION_PUBLISHED": return "Une mission de votre établissement a été publiée. Le recrutement est ouvert.";
    case "APPLICATION_SUBMITTED": return nurse ? "Votre candidature est enregistrée. Elle attend une décision ; vous n’êtes pas encore affecté." : "Une candidature a été reçue pour une mission de votre organisation.";
    case "APPLICATION_SELECTED": return nurse ? "Votre candidature est présélectionnée. L’affectation reste à confirmer par l’agence." : "Une candidature a été présélectionnée. L’agence peut confirmer l’affectation.";
    case "APPLICATION_REJECTED": return nurse ? "Votre candidature n’a pas été retenue pour cette mission." : "Une candidature a été refusée pour une mission de votre organisation.";
    case "APPLICATION_WITHDRAWN": return nurse ? "Le retrait de votre candidature est enregistré." : "Un intérimaire a retiré sa candidature.";
    case "MISSION_CHANGED": return nurse ? "Les conditions de la mission ont changé. Consultez-les et confirmez à nouveau votre candidature." : "Les conditions d’une mission ont changé. Les candidatures antérieures doivent être confirmées à nouveau.";
    case "MISSION_FILLED": return "Cette mission a été pourvue par un autre candidat. Aucune affectation ne vous a été attribuée.";
    case "MISSION_COMPLETED": return nurse ? "Votre mission a été marquée terminée. Retrouvez-la dans votre historique." : "Une mission de votre organisation a été marquée terminée.";
    case "RPPS_RESULT": return detail === "FOUND" ? "Votre numéro professionnel a été retrouvé. Consultez votre dossier." : detail === "NOT_FOUND" ? "Votre numéro professionnel n’a pas été retrouvé. Vérifiez les informations de votre dossier." : "La vérification professionnelle est en attente. Vous pouvez réessayer depuis votre dossier.";
    case "DISCORD_CONNECTED": return "Votre compte Discord est associé. Choisissez les notifications que vous souhaitez recevoir.";
    case "CLOSURE_REQUESTED": return "Votre demande de clôture a été reçue. Vous pouvez suivre son état dans votre espace.";
    case "CLOSURE_CANCELLED": return "Votre demande de clôture a été annulée. Votre compte reste disponible.";
    case "CLOSURE_APPROVED": return "Votre demande de clôture a été approuvée. La suppression de vos données va être traitée.";
    default: return notificationCatalog[kind];
  }
}
