import { diplomaDetails } from "./diplomas";
import type { Inscription } from "./state";
import type { ProfessionalProfile, ProfileDetails } from "@/services/profile";
import { wholeDayPeriod } from "@/lib/datePeriods";
import { skillCode, shiftOptions } from "@/data/professional";
export function registrationProfile(v: Inscription): ProfessionalProfile {
  if (!v.prenom.trim() || !v.nom.trim() || !v.qualifications.length)
    throw new Error(
      "Complétez votre identité et vos qualifications avant de créer le compte.",
    );
  if (
    v.qualifications.some((q) => q !== "IDE") &&
    !v.qualifications.includes("IDE")
  )
    throw new Error(
      "Retournez à l’étape Qualification et cochez aussi « IDE — Infirmier diplômé d’État » : une spécialité suppose ce diplôme.",
    );
  const slot =
    v.disponibleDes || v.disponibleFin
      ? wholeDayPeriod(v.disponibleDes, v.disponibleFin)
      : null;
  if ((v.disponibleDes || v.disponibleFin) && !slot)
    throw new Error("Vérifiez les dates de disponibilité.");
  const experience = v.experiences
    .filter((e) => e.etablissement || e.service || e.start || e.end || e.annees)
    .map((e) => {
      const period = wholeDayPeriod(e.start || "", e.end || "");
      if (!e.service || !period || Date.parse(period.end) > Date.now())
        throw new Error(
          "Renseignez le service et les dates passées de chaque expérience.",
        );
      return {
        ...period,
        service: e.service,
        ...(e.etablissement ? { establishment: e.etablissement } : {}),
      };
    });
  const details: ProfileDetails = {
    practiceServices: v.practiceServices || {},
    firstName: v.prenom.trim(),
    lastName: v.nom.trim(),
    ...(v.naissance ? { birthDate: v.naissance } : {}),
    ...(v.telephone ? { phone: v.telephone } : {}),
    ...(v.adresse ? { address: v.adresse } : {}),
    ...(v.codePostal ? { postalCode: v.codePostal } : {}),
    ...(v.ville ? { city: v.ville } : {}),
    ...(v.ville && v.latitude != null && v.longitude != null ? { mobilityCity: v.ville } : {}),
    ...(v.diplome ? { diploma: v.diplome } : {}),
    ...diplomaDetails(v.qualifications, v),
    ...(v.transport ? { transport: v.transport } : {}),
  };
  return {
    display_name: v.prenom.trim(),
    details,
    qualifications: v.qualifications,
    skills: v.competences.map(skillCode),
    experience,
    available: slot ? [slot] : [],
    unavailable: [],
    latitude: v.latitude,
    longitude: v.longitude,
    radius_km: v.rayonKm,
    accepted_shifts:
      shiftOptions.find((s) => s.value === v.horaire)?.shifts || [],
    preferred_shifts: [],
    visible: true,
    rpps_status: "NOT_CHECKED",
  };
}
