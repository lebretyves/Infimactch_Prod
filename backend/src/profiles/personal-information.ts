import {ForbiddenException,BadRequestException} from '@nestjs/common';
import {plainToInstance} from 'class-transformer';
import {validateSync,isEmail} from 'class-validator';
import {ProfileDetailsDto} from './profile-details';
export const personalFields=['firstName','lastName','city','phone','birthDate','address','postalCode'] as const;
export const correctionFields=[...personalFields,'email'] as const;
export type CorrectionField=typeof correctionFields[number];
export function assertPersonalInformationUnchanged(previous:{display_name:string;details?:Record<string,unknown>},next:{displayName:string;details?:ProfileDetailsDto}){
 if(next.displayName!==previous.display_name || (next.details!=null&&personalFields.some(key=>(next.details?.[key]??null)!==(previous.details?.[key]??null))))
  throw new ForbiddenException({code:'PERSONAL_INFORMATION_LOCKED',message:'Vos informations personnelles sont verrouillées après inscription. Envoyez une demande de correction à un administrateur.'});
}
export function correctionValue(field:CorrectionField,raw:string){
 if(!correctionFields.includes(field)||typeof raw!=='string')throw new BadRequestException('Champ de correction invalide.');
 const value=raw.trim();
 if(field==='email'){if(value.length>254||!isEmail(value))throw new BadRequestException('Adresse e-mail invalide.');return value.toLowerCase();}
 if(!value&&['firstName','lastName'].includes(field))throw new BadRequestException('Le nom et le prénom ne peuvent pas être vides.');
 if(value&&validateSync(plainToInstance(ProfileDetailsDto,{[field]:value})).length)throw new BadRequestException('Valeur de correction invalide.');
 if(field==='birthDate'&&value){const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value||date>new Date())throw new BadRequestException('Date de naissance invalide.');}
 if(field==='firstName'&&value.length<2)throw new BadRequestException('Le prénom doit contenir au moins deux caractères.');
 return value;
}
