import { clinicalSkills } from './clinicalSkills';

export const QUALIFICATIONS: Record<string, string> = {
  IDE: 'IDE — Infirmier diplômé d’État',
  IADE: 'IADE — Infirmier anesthésiste diplômé d’État',
  IBODE: 'IBODE — Infirmier de bloc opératoire diplômé d’État',
};
export const SKILLS: Record<string, string> = {
  ...Object.fromEntries(clinicalSkills.map(skill => [skill.code, skill.label])),
  POPULATION_ADULT: "Pratique auprès des adultes",
  POPULATION_PEDIATRIC: "Pratique pédiatrique",
};
export const labelCode = (value: string) =>
  (value === "UNKNOWN" ? "Non connu" : SKILLS[value]) ||
  value
    .replace(/^BLOCK_/, "Bloc : ")
    .replaceAll("_", " ")
    .toLocaleLowerCase("fr-FR")
    .replace(/^./, (c) => c.toLocaleUpperCase("fr-FR"));
export const skillCode = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
export const shiftOptions = [
  { value: "DAY", label: "Jour uniquement", shifts: ["DAY"] },
  { value: "NIGHT", label: "Nuit uniquement", shifts: ["NIGHT"] },
  { value: "BOTH", label: "Jour et nuit", shifts: ["DAY", "NIGHT", "MIXED"] },
];
