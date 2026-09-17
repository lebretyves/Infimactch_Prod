import { createContext, use } from 'react';

export type Inscription = {
  google: boolean;
  email: string;
  motDePasse: string;
  nom: string;
  prenom: string;
  naissance: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
  qualification: string;
  qualifications: string[];
  disponibleFin: string;
  horaire: string;
  latitude: number | null;
  longitude: number | null;
  diplome: string;
  anneeDiplome: string;
  rpps: string;
  competences: string[];
  experiences: { etablissement: string; service: string; annees: string; start?:string; end?:string }[];
  rayonKm: number;
  transport: string;
  creneaux: string[];
  disponibleDes: string;
  titulaireCompte: string;
  iban: string;
  bic: string;
  cgu: boolean;
  confidentialite: boolean;
  traitement: boolean;
  actualites: boolean;
};

export const vide: Inscription = {
  google: false,
  email: '',
  motDePasse: '',
  nom: '',
  prenom: '',
  naissance: '',
  telephone: '',
  adresse: '',
  codePostal: '',
  ville: '',
  qualification: '',
  qualifications: [],
  disponibleFin: '',
  horaire: '',
  latitude: null,
  longitude: null,
  diplome: '',
  anneeDiplome: '',
  rpps: '',
  competences: [],
  experiences: [{ etablissement: '', service: '', annees: '' }],
  rayonKm: 30,
  transport: 'Véhicule personnel',
  creneaux: [],
  disponibleDes: '',
  titulaireCompte: '',
  iban: '',
  bic: '',
  cgu: false,
  confidentialite: false,
  traitement: false,
  actualites: false,
};

type Store = {
  valeurs: Inscription;
  modifier: (champs: Partial<Inscription>) => void;
};

export const InscriptionContext = createContext<Store | null>(null);

export function useInscription() {
  const store = use(InscriptionContext);
  if (!store)
    throw new Error('useInscription doit être utilisé dans InscriptionLayout');
  return store;
}

export const CLE = 'infimatch:inscription';

// Keep the password in memory only. The tab draft excludes bank details and passwords.
export const CLE_BROUILLON = 'infimatch:inscription-draft-v1';
function videNeuf(): Inscription {
  return structuredClone(vide);
}
function lireBrouillon(): Inscription {
  const restored = videNeuf();
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(CLE_BROUILLON) || '{}',
    );
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return restored;
    const source = value as Record<string, unknown>;
    const excluded = ['motDePasse', 'iban', 'bic', 'titulaireCompte'];
    for (const key of Object.keys(vide) as (keyof Inscription)[]) {
      if (excluded.includes(key)) continue;
      const item = source[key];
      if (key === 'experiences') {
        if (
          Array.isArray(item) &&
          item.every(
            (v) =>
              v &&
              ['etablissement', 'service', 'annees'].every(
                (k) => typeof v[k] === 'string',
              ),
          )
        ) {
          restored.experiences = item.map((v) => ({
            etablissement: v.etablissement,
            service: v.service,
            annees: v.annees,
            start: typeof v.start==='string'?v.start:'',
            end: typeof v.end==='string'?v.end:'',
          }));
        }
      } else if (Array.isArray(vide[key])) {
        if (Array.isArray(item) && item.every((v) => typeof v === 'string')) {
          (restored as unknown as Record<string, unknown>)[key] = [...item];
        }
      } else if ((key==='latitude'||key==='longitude')&&(item===null||typeof item==='number')) {
        restored[key]=item as number|null;
      } else if (typeof item === typeof vide[key]) {
        (restored as unknown as Record<string, unknown>)[key] = item;
      }
    }
  } catch {
    /* Browser storage may be unavailable or contain an old draft. */
  }
  return restored;
}
let brouillon = lireBrouillon();
export function charger(): Inscription {
  return structuredClone(brouillon);
}
export function enregistrer(champs: Partial<Inscription>) {
  brouillon = { ...brouillon, ...champs };
  const draft: Partial<Inscription> = { ...brouillon };
  delete draft.motDePasse;
  delete draft.iban;
  delete draft.bic;
  delete draft.titulaireCompte;
  try {
    sessionStorage.removeItem(CLE);
    sessionStorage.setItem(CLE_BROUILLON, JSON.stringify(draft));
  } catch {
    /* Continue in memory when storage is blocked. */
  }
}
export function effacerBrouillon() {
  brouillon = videNeuf();
  try {
    sessionStorage.removeItem(CLE);
    sessionStorage.removeItem(CLE_BROUILLON);
  } catch {
    /* No browser storage is required to finish registration. */
  }
}

export const etapes = [
  { path: '/inscription', titre: 'Compte' },
  { path: '/inscription/identite', titre: 'Identité' },
  { path: '/inscription/localisation', titre: 'Localisation' },
  { path: '/inscription/qualification', titre: 'Qualification' },
  { path: '/inscription/mobilite', titre: 'Mobilité' },
  { path: '/inscription/disponibilites', titre: 'Disponibilités' },
  { path: '/inscription/consentements', titre: 'Consentements' },
];
