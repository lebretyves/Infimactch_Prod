export type ContractNotes = { reason: string; workSchedule: string; payTerms: string; contactName: string; additionalNotes: string };
export const contractFields = [
  { key: 'reason', label: 'Motif du recours', limit: 2000, hint: 'Précisez le besoin auquel répond ce renfort.' },
  { key: 'workSchedule', label: 'Organisation du travail', limit: 2000, hint: 'Horaires, pauses et consignes à préciser pour la mission.' },
  { key: 'payTerms', label: 'Éléments de rémunération', limit: 2000, hint: 'Compléments, indemnités et modalités à vérifier avec l’employeur.' },
  { key: 'contactName', label: 'Interlocuteur pour le contrat', limit: 150, hint: 'Nom ou fonction de la personne à contacter.' },
  { key: 'additionalNotes', label: 'Informations complémentaires', limit: 2000, hint: 'Ajoutez seulement les informations nécessaires à cette préparation.' },
] as const;
export type ContractPreparation = {
  assignment: { id: string; status: string };
  mission: { id: string; title: string; qualification: string; service: string; address: string | null; startAt: string | null; endAt: string | null; timeZone: string; hourlySalary: number | string | null };
  employer: { id: string; kind: string; name: string; address: string | null; siret: string | null; contact: string | null };
  establishment: { name: string; address: string | null; finess: string | null };
  worker: { displayName: string; firstName: string | null; lastName: string | null };
  canEdit: boolean;
  preparation: { version: number; notes: ContractNotes; updatedAt: string | null };
  missingInformation: string[];
  notice: string;
};
export function contractPayload(version: number, notes: ContractNotes) {
  const clean = Object.fromEntries(contractFields.map(({key}) => [key, notes[key]])) as ContractNotes;
  return { version, notes: clean };
}
export function contractErrors(notes: ContractNotes): Partial<Record<keyof ContractNotes, string>> {
  return Object.fromEntries(contractFields.filter(({key,limit}) => notes[key].length > limit)
    .map(({key,limit}) => [key, `Limitez ce champ à ${limit} caractères.`]));
}
export function contractChanged(a: ContractNotes, b: ContractNotes) {
  return contractFields.some(({key}) => a[key] !== b[key]);
}
