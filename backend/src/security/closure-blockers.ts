import {SqlClient} from '../database/database';
export async function closureBlockers(em:SqlClient,id:string){
 const blockers:{code:string,label:string}[]=[];
 const [a]=await em.query('SELECT platform_only FROM account WHERE id=$1',[id]);
 if(!a || a.platform_only || (await em.query('SELECT 1 FROM platform_admin WHERE user_id=$1',[id])).length) blockers.push({code:'ADMIN_ACCOUNT',label:'Les comptes administrateurs doivent passer par la gestion des acces.'});
 if((await em.query("SELECT 1 FROM assignment WHERE nurse_id=$1 AND status='ACTIVE' LIMIT 1",[id])).length) blockers.push({code:'ACTIVE_ASSIGNMENT',label:'Terminez ou annulez les missions affectees avant la cloture.'});
 if((await em.query("SELECT 1 FROM application WHERE nurse_id=$1 AND status IN('SUBMITTED','SELECTED') LIMIT 1",[id])).length) blockers.push({code:'ACTIVE_APPLICATION',label:'Retirez les candidatures en cours avant la cloture.'});
 const organizations=await em.query("SELECT o.name FROM organization o JOIN membership m ON m.organization_id=o.id WHERE m.user_id=$1 AND m.active AND NOT EXISTS(SELECT 1 FROM membership other JOIN account a ON a.id=other.user_id WHERE other.organization_id=o.id AND other.user_id<>$1 AND other.active AND a.active)",[id]);
 for(const o of organizations) blockers.push({code:'LAST_MANAGER',label:'Transferez la gestion de '+o.name+' a un autre compte actif.'});
 return blockers;
}
export async function lockClosure(em:SqlClient,id:string){
 await em.query('SELECT pg_advisory_xact_lock(1789381700)');
 await em.query('SELECT id FROM account WHERE id=$1 FOR UPDATE',[id]);
 await em.query('SELECT user_id FROM profile WHERE user_id=$1 FOR UPDATE',[id]);
 await em.query('SELECT o.id FROM organization o JOIN membership m ON m.organization_id=o.id WHERE m.user_id=$1 ORDER BY o.id FOR UPDATE OF o',[id]);
}
