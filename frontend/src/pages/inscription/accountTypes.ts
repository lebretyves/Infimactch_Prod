import type { FinessLookup } from "../../services/finess";

export type AccountValues = {
  email: string;
  motDePasse: string;
  confirmation: string;
  nomEtablissement: string;
  finess: string;
  siret: string;
  adresse: string;
  codePostal: string;
  villeEtablissement: string;
  referentPrenom: string;
  referentNom: string;
  referentFonction: string;
  referentTelephone: string;
  google: boolean;
  interimaire: boolean;
  cgu: boolean;
  organizationType: "ESTABLISHMENT" | "AGENCY";
};

export type AccountErrors = Record<string, string>;
export type OrganizationField = "name" | "address" | "postalCode" | "city";
export type FinessState = {
  state: "idle" | "loading" | "found" | "missing" | "error";
  data?: FinessLookup;
};
