import {effacerBrouillon} from '../pages/inscription/state';
import { clearAppCaches } from '../lib/pwa';
import { profilePayload,type ProfessionalProfile,type ProfileDetails } from './profile';
import { api, ApiError, resetCsrf } from './api';
export type Role = 'interimaire' | 'entreprise' | 'etablissement';

export interface User {
  idleExpiresAt?: number;
  id: string;
  email: string;
  role: Role;
  prenom: string;
  nom: string;
  telephone?: string;
  ville?: string;
  qualification?: string;
  siret?: string;
  finess?: string;
  nomEtablissement?: string;
  adresse?: string;
  codePostal?: string;
  referentFonction?: string;
  titulaireCompte?: string;
  iban?: string;
  bic?: string;
  creeLe?: string;
}

export interface LoginCredentials {
  email: string;
  motDePasse: string;
  role: Role;
}

export interface RegisterData {
  google?: boolean;
  organizationType?: 'AGENCY'|'ESTABLISHMENT';
  profile?: ProfessionalProfile;
  rppsNumber?: string;
  role: Role;
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  ville: string;
  qualification?: string;
  siret?: string;
  finess?: string;
  nomEtablissement?: string;
  adresse?: string;
  codePostal?: string;
  referentPrenom?: string;
  referentNom?: string;
  referentFonction?: string;
  referentTelephone?: string;
  telephone?: string;
  titulaireCompte?: string;
  iban?: string;
  bic?: string;
  cgu: boolean;
}

export interface AuthResponse {
  user: User;
}
type Account = {
  session?: {idleExpiresAt:number};
  id: string;
  email: string;
  family: 'NURSE' | 'ENTERPRISE';
  organizations: {
    kind: string;
    name: string;
    address: string;
    siret?: string;
    finess?: string;
  }[];
};
export class AccountCreatedError extends Error {
  constructor(google = false) {
    super(
      google ? 'Votre compte a été créé, mais la session est indisponible. Reconnectez-vous avec Google.' : 'Votre compte a été créé, mais la session est indisponible. Connectez-vous avec vos identifiants.',
    );
  }
}
export function clearAuth() {
  try {
    localStorage.removeItem('infimatch:auth_token');
    localStorage.removeItem('infimatch:auth_user');
    sessionStorage.removeItem('infimatch:inscription');
  } catch {
    /* Storage is optional; authentication uses the server session. */
  }
}
async function current(signal?: AbortSignal): Promise<User> {
  const a = await api<Account>('/auth/me', { signal });
  const org = a.organizations[0];
  const p =
    a.family === 'NURSE'
      ? await api<{ display_name: string; qualifications: string[]; details?:ProfileDetails }>(
          '/profile',
          { signal },
        )
      : null;
  return {
    idleExpiresAt: a.session?.idleExpiresAt,
    id: a.id,
    email: a.email,
    role:
      a.family === 'NURSE'
        ? 'interimaire'
        : org?.kind === 'ESTABLISHMENT'
          ? 'etablissement'
          : 'entreprise',
    prenom: (p?.details?.firstName || p?.display_name || org?.name || '').trim().includes('@') ? '' : (p?.details?.firstName || p?.display_name || org?.name || '').trim(),
    nom: p?.details?.lastName || '',
    ville: p?.details?.city,
    qualification: p?.qualifications?.join(', '),
    nomEtablissement: org?.name,
    adresse: org?.address,
    siret: org?.siret,
    finess: org?.finess,
  };
}
export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<User | null> {
  try {
    return await current(signal);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}
export async function login(data: LoginCredentials): Promise<AuthResponse> {
  clearAuth();
  await api('/auth/login', {
    method: 'POST',
    body: { email: data.email, password: data.motDePasse },
  });
  effacerBrouillon();
  return { user: await current() };
}
export async function register(data: RegisterData): Promise<AuthResponse> {
  if (!data.cgu)
    throw new Error("L'acceptation des conditions est obligatoire.");
  if (!data.google && (data.motDePasse.length < 12 || data.motDePasse.length > 128))
    throw new Error(
      'Le mot de passe doit contenir entre 12 et 128 caractères.',
    );
  const enterprise = data.role !== 'interimaire';
  const body = {
    ...(!data.google ? { email: data.email.trim(), password: data.motDePasse } : {}),
    family: enterprise ? 'ENTERPRISE' : 'NURSE',
    termsVersion: '2026-09-14',
    ...(!enterprise&&data.profile?{profile:profilePayload(data.profile),...(data.rppsNumber?{rppsNumber:data.rppsNumber}:{})}:{}),
    ...(enterprise
      ? {
          organizationType: data.organizationType || (data.finess ? 'ESTABLISHMENT' : 'AGENCY'),
          name: data.nomEtablissement,
          address: [data.adresse, data.codePostal, data.ville]
            .filter(Boolean)
            .join(' '),
          referent: [
            data.referentPrenom || data.prenom,
            data.referentNom || data.nom,
            data.referentFonction,
            data.referentTelephone,
          ]
            .filter(Boolean)
            .join(' '),
          ...(data.finess ? { finess: data.finess.replace(/\s/g, '') } : {}),
          ...(data.siret ? { siret: data.siret } : {}),
        }
      : {}),
  };
  await api(data.google ? '/auth/google/register' : '/auth/register', { method: 'POST', body });
  effacerBrouillon();
  clearAuth();
  try {
    return { user: await current() };
  } catch {
    throw new AccountCreatedError(data.google);
  }
}
export async function logout() {
  effacerBrouillon();
  await api('/auth/logout', { method: 'POST' });
  await clearAppCaches().catch(() => undefined);
  clearAuth();
  resetCsrf();
}
export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
  return api('/auth/recovery/request', { method: 'POST', body: { email } });
}
