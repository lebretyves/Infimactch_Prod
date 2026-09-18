import {DateTime} from 'luxon';
export function validDateBounds(start:string,end:string,zone='Europe/Paris'):boolean {
  const a=DateTime.fromISO(start,{zone}),b=DateTime.fromISO(end,{zone});
  return a.isValid && b.isValid && a.toMillis()===a.startOf('day').toMillis() && b.toMillis()===b.startOf('day').toMillis() && b.toMillis()>a.toMillis();
}
export function startsInPast(start:string,precision?:string,zone='Europe/Paris',now=Date.now()):boolean {
  if(precision==='DATE')return DateTime.fromISO(start,{zone}).startOf('day').toMillis()<DateTime.fromMillis(now,{zone}).startOf('day').toMillis();
  return Date.parse(start)<=now;
}
