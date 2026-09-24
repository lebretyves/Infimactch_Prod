import catalog from './clinical-skills.json' with { type: 'json' };

export type ClinicalSkill = {
  code: string;
  label: string;
  qualifications: string[];
  services: string[];
  group: string;
  sources: string[];
};

export const clinicalSkillGroups: Record<string, string> = catalog.groups;
export const clinicalSkillSources = catalog.sources;
export const clinicalSkills: ClinicalSkill[] = catalog.skills;
export const clinicalSkillsVersion = catalog.version;
export const clinicalServiceLabels: Record<string, string> = catalog.services;

/** Suggestions only: never infer a person's skills from their diploma or service. */
export function skillsForContext(qualifications: string[], service = ''): ClinicalSkill[] {
  const allServices = !service || service === 'AUTRE' || service === 'SUPPLEANCE';
  return clinicalSkills.filter(skill =>
    skill.qualifications.some(role => qualifications.includes(role)) &&
    (allServices || skill.services.length === 0 || skill.services.includes(service)),
  );
}

export function serviceOptionsFor(qualifications: string[]): { value: string; label: string }[] {
  const byRole: Record<string, string[]> = catalog.servicesByQualification;
  const labels: Record<string, string> = catalog.services;
  const codes = new Set(qualifications.flatMap(role => byRole[role] || []));
  return [...codes].map(value => ({ value, label: labels[value] || value }));
}

/** Historical experience uses every known service, without inferring a diploma. */
export function experienceServiceOptions(legacyServices: string[] = []): { value: string; label: string }[] {
  const labels: Record<string, string> = catalog.services;
  const codes = new Set([...Object.keys(labels), ...legacyServices]);
  return [...codes].map(value => ({ value, label: labels[value] || value }));
}
