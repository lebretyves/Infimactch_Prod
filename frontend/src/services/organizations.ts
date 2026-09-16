import { api } from "./api";
export type Organization = {
  id: string;
  kind: "AGENCY" | "ESTABLISHMENT";
  name: string;
  address: string;
  referent: string;
  finess: string | null;
  siret: string | null;
};
export type OrganizationContext = {
  organizations: Organization[];
  links: {
    agency_id: string;
    id: string;
    name: string;
    address: string;
    finess: string | null;
  }[];
};
export const organizations = (signal?: AbortSignal) =>
  api<OrganizationContext>("/me/organizations", { signal });
