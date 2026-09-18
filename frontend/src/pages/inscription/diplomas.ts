export const diplomaFields = [
  ["IDE", "ideDiplomaYear"],
  ["IADE", "iadeDiplomaYear"],
  ["IBODE", "ibodeDiplomaYear"],
] as const;
export type DiplomaYears = Record<(typeof diplomaFields)[number][1], string>;

export function withIde(qualifications: string[]): string[] {
  return qualifications.some(q => q === "IADE" || q === "IBODE")
    ? [...new Set(["IDE", ...qualifications])]
    : [...new Set(qualifications)];
}

export function diplomaDetails(qualifications: string[], years: DiplomaYears) {
  const details: Partial<Record<keyof DiplomaYears, number>> = {};
  for (const [qualification, field] of diplomaFields) {
    if (!qualifications.includes(qualification)) continue;
    const value = years[field];
    const year = Number(value);
    if (!/^\d{4}$/.test(value) || year < 1900 || year > new Date().getFullYear())
      throw new Error(`Renseignez une année d’obtention valide pour le diplôme ${qualification}.`);
    details[field] = year;
  }
  for (const field of ["iadeDiplomaYear", "ibodeDiplomaYear"] as const) {
    if (details[field] !== undefined && details.ideDiplomaYear !== undefined && details[field]! < details.ideDiplomaYear)
      throw new Error("L’année du diplôme IADE ou IBODE ne peut pas précéder celle du diplôme IDE.");
  }
  return details;
}
