import { api } from "./api";

export type FinessEstablishment = {
  finess: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type FinessLookup = {
  status: "FOUND_IN_SNAPSHOT" | "NOT_IN_SNAPSHOT";
  establishment: FinessEstablishment | null;
  generated_at: string | null;
  imported_at: string | null;
  grantsOrganizationAccess: false;
};

export const normalizeFiness = (value: string) =>
  value.replace(/\s/g, "").toUpperCase();
export const isCompleteFiness = (value: string) =>
  /^(?:[0-9]{9}|2[AB][0-9]{7})$/.test(normalizeFiness(value));
export const lookupFiness = (value: string, signal?: AbortSignal) =>
  api<FinessLookup>(
    "/reference-data/finess/" + encodeURIComponent(normalizeFiness(value)),
    { signal },
  );
