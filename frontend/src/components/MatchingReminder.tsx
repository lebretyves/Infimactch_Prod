export function MatchingReminder({ enterprise = false }: { enterprise?: boolean }) {
  return <p style={{ lineHeight: 1.6, marginBlock: 12 }}>
    <strong>{enterprise ? "Des missions bien renseignées facilitent le matching." : "Un profil bien renseigné aide à trouver la bonne mission."}</strong>{" "}
    {enterprise
      ? "Précisez le métier, le service, les compétences attendues, le lieu et les horaires de chaque mission pour comparer les profils de façon pertinente."
      : "Complétez avec précision votre métier, vos compétences, votre expérience, vos disponibilités et votre mobilité. Ces informations permettent de vous proposer des missions adaptées et de calculer votre taux de matching. Pensez à les tenir à jour."}
  </p>;
}
