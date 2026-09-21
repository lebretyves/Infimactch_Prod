import type {ProfessionalProfile} from '../services/profile';
import {withIde} from '../pages/inscription/diplomas.ts';
export type CvValue={value:string;evidence:string;warnings:string[]};
export type CvDiploma={qualification:'IDE'|'IADE'|'IBODE';year:number|null;evidence:string;warnings:string[]};
export type CvSkill={code:string;label:string;evidence:string;warnings:string[]};
export type CvSuggestions={identity:Partial<Record<'firstName'|'lastName'|'email'|'phone'|'city'|'postalCode',CvValue>>;diplomas:CvDiploma[];skills:CvSkill[];services?:CvSkill[]};
export const cvDiplomaField={IDE:'ideDiplomaYear',IADE:'iadeDiplomaYear',IBODE:'ibodeDiplomaYear'} as const;
// Deliberately no identity/RPPS mutation. Only explicitly reviewed additions enter the draft.
export function reviewedCvProfile(profile:ProfessionalProfile,diplomas:CvDiploma[],skills:CvSkill[]):Partial<ProfessionalProfile> {
  const details={...profile.details};
  for(const diploma of diplomas) {
    // Missing OCR years remain optional; never erase an existing year or invent one.
    if(diploma.year===null) continue;
    if(!Number.isInteger(diploma.year)||diploma.year!<1900||diploma.year!>new Date().getFullYear()) throw Error(`Renseignez une année passée valide pour le diplôme ${diploma.qualification}.`);
    details[cvDiplomaField[diploma.qualification]]=diploma.year!;
  }
  const ide=details.ideDiplomaYear;
  if(ide!==undefined && [details.iadeDiplomaYear,details.ibodeDiplomaYear].some(year=>year!==undefined&&year<ide)) throw Error('Le diplôme spécialisé ne peut pas précéder le diplôme IDE.');
  return {details,qualifications:withIde([...profile.qualifications,...diplomas.map(d=>d.qualification)]),skills:[...new Set([...profile.skills,...skills.map(s=>s.code)])]};
}
