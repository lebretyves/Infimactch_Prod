export const SPECIALITES = [
  'Médecine',
  'Chirurgie',
  'Bloc opératoire',
  'Pédiatrie',
  'EHPAD',
  'Médecine du travail',
  'Urgences',
  'Réanimation',
] as const;

export const QUALIFICATIONS = [
  'Infirmier IDE',
  'Infirmier anesthésiste (IADE)',
  'Infirmier de bloc opératoire (IBODE)',
  'Infirmier puériculteur',
  'Infirmier en pratique avancée (IPA)',
] as const;

export const COMPETENCES = [
  'Pose de voie veineuse',
  'Soins palliatifs',
  'Perfusion',
  'Pansements complexes',
  'Urgences vitales',
  'Dialyse',
  'Chimiothérapie',
  'Prélèvements',
  'Surveillance post-opératoire',
  'Éducation thérapeutique',
] as const;

export type Specialite = (typeof SPECIALITES)[number];
export type Qualification = (typeof QUALIFICATIONS)[number];
export type Competence = (typeof COMPETENCES)[number];

export type Etablissement = {
  id: string;
  nom: string;
  type: string;
  ville: string;
  departement: string;
};

export type Mission = {
  id: string;
  intitule: string;
  specialite: Specialite;
  qualification: Qualification;
  service: string;
  etablissement: Etablissement;
  debut: string;
  fin: string;
  horaires: string;
  tauxHoraire: number;
  distanceKm: number;
  postes: number;
  competences: string[];
  description: string;
  conditions: string[];
  publieeLe: string;
  limiteCandidature: string;
  score: number;
  raisonMatch: string;
};

export type Candidature = {
  missionId: string;
  statut: 'en-attente' | 'acceptee' | 'refusee' | 'retiree' | 'expiree';
  envoyeeLe: string;
};
