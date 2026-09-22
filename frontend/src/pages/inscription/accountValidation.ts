import { isCompleteFiness } from "../../services/finessFormat.ts";
import type { AccountValues, AccountErrors } from "./accountTypes";

export function validateAccount({
  email,
  motDePasse,
  confirmation,
  nomEtablissement,
  finess,
  siret,
  adresse,
  codePostal,
  villeEtablissement,
  referentPrenom,
  referentNom,
  referentFonction,
  referentTelephone,
  google,
  interimaire,
  cgu,
  organizationType,
}: AccountValues): AccountErrors {
  const trouvees: AccountErrors = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    trouvees.email = "Indiquez une adresse e-mail valide.";
  if (!google && (motDePasse.length < 12 || motDePasse.length > 128))
    trouvees.motDePasse = "Entre 12 et 128 caractères.";
  if (!google && confirmation !== motDePasse)
    trouvees.confirmation = "Les deux mots de passe diffèrent.";

  if (interimaire) {
    // Pour l'infirmier : seules les informations de compte sont requises ici.
    // L'identité civile (nom/prénom/naissance) et la qualification seront renseignées
    // sans redondance dans les étapes suivantes (/inscription/identite, etc.)
  } else {
    if (!cgu)
      trouvees.cgu = "Vous devez accepter les conditions d'utilisation.";
    if (!nomEtablissement.trim())
      trouvees.nomEtablissement = "Indiquez le nom de l'établissement.";
    // Neuf caractères, avec les préfixes corses 2A et 2B acceptés.
    if (organizationType === "ESTABLISHMENT" && !isCompleteFiness(finess)) {
      trouvees.finess = "Indiquez un numéro FINESS valide de 9 caractères.";
    }
    if (organizationType === "AGENCY" && siret && !/^\d{14}$/.test(siret))
      trouvees.siret = "Le SIRET doit contenir 14 chiffres.";
    if (!adresse.trim())
      trouvees.adresse = "Indiquez l'adresse de l'établissement.";
    if (!/^\d{5}$/.test(codePostal.replace(/\s/g, ""))) {
      trouvees.codePostal = "Code postal à 5 chiffres requis.";
    }
    if (!villeEtablissement.trim())
      trouvees.villeEtablissement = "Indiquez la ville.";
    if (!referentPrenom.trim())
      trouvees.referentPrenom = "Indiquez le prénom du référent.";
    if (!referentNom.trim())
      trouvees.referentNom = "Indiquez le nom du référent.";
    if (!referentFonction.trim()) {
      trouvees.referentFonction =
        "Indiquez la fonction (ex: Cadre, Directeur des soins, RH).";
    }
    if (!referentTelephone.trim())
      trouvees.referentTelephone = "Numéro de téléphone direct requis.";
  }

  return trouvees;
}
