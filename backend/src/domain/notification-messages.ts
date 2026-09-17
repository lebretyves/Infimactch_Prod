export type NotificationRole = "NURSE" | "AGENCY" | "ESTABLISHMENT";
export type NotificationKind = "MATCH" | "CONFIRMATION" | "CANCELLATION" | "REMINDER";

const messages: Record<NotificationRole, Partial<Record<NotificationKind, string>>> = {
  NURSE: {
    MATCH: "Une nouvelle mission correspond à votre profil. Consultez les conditions avant de candidater.",
    CONFIRMATION: "Votre affectation est confirmée. Consultez les détails et votre confirmation dans votre espace InfiMatch.",
    CANCELLATION: "Une mission à laquelle vous étiez affecté a été annulée. Consultez les informations mises à jour dans votre espace InfiMatch.",
  },
  AGENCY: {
    CONFIRMATION: "L’affectation est confirmée pour une mission de votre agence. Consultez le suivi et la confirmation dans InfiMatch.",
    CANCELLATION: "Une mission gérée par votre agence a été annulée. Consultez le suivi dans InfiMatch.",
    REMINDER: "Une mission de votre agence reste non pourvue après le délai prévu. Consultez les candidatures et les profils proposés.",
  },
  ESTABLISHMENT: {
    CONFIRMATION: "Un professionnel est affecté à une mission de votre établissement. Consultez les détails et la confirmation dans InfiMatch.",
    CANCELLATION: "Une mission de votre établissement a été annulée. Consultez le suivi avec votre agence.",
    REMINDER: "Une mission de votre établissement reste non pourvue après le délai prévu. Consultez son suivi avec votre agence.",
  },
};

export function notificationMessage(role: NotificationRole, kind: NotificationKind): string {
  const message = messages[role]?.[kind];
  if (!message) throw new Error("Unsupported notification role and event");
  return message;
}
