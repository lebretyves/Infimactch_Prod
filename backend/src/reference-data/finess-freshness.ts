import {DateTime} from 'luxon';
export function finessFreshness(snapshot:any,now=new Date()){
 const base={policyMonths:1,warningDays:7,generatedAt:null as string|null,importedAt:null as string|null,expiresAt:null as string|null,daysRemaining:null as number|null,ageDays:null as number|null,establishmentCount:snapshot?.summary?.rows??null,sourceUrl:snapshot?.source_url??null};
 if(!snapshot)return {...base,status:'MISSING',message:'Référentiel FINESS absent : importer une version officielle récente.'};
 const generated=DateTime.fromJSDate(new Date(snapshot.generated_at),{zone:'Europe/Paris'}),current=DateTime.fromJSDate(now,{zone:'Europe/Paris'});
 const imported=new Date(snapshot.imported_at);
 base.importedAt=snapshot.imported_at!=null&&Number.isFinite(imported.getTime())?imported.toISOString():null;
 if(snapshot.generated_at==null||!generated.isValid||!current.isValid||generated.toMillis()>current.toMillis())return {...base,status:'INVALID',message:'Date du référentiel FINESS invalide : vérifier la source avant utilisation.'};
 const expires=generated.plus({months:1}),remaining=Math.ceil(expires.diff(current,'days').days),age=Math.floor(current.diff(generated,'days').days);
 const expired=current.toMillis()>=expires.toMillis(),status=expired?'EXPIRED':remaining<=7?'DUE':'CURRENT';
 return {...base,status,generatedAt:generated.toUTC().toISO(),expiresAt:expires.toUTC().toISO(),daysRemaining:remaining,ageDays:age,message:expired?'Référentiel FINESS à actualiser : la durée maximale d’un mois est atteinte.':`FINESS : J-${remaining} avant actualisation requise${status==='DUE'?' — préparer la mise à jour.':'.'}`};
}
