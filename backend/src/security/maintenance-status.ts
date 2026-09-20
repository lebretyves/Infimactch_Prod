import {SqlClient} from '../database/database';
export async function maintenanceStatus(db:SqlClient,now=Date.now()){
 const [latest]=await db.query("SELECT state,checked_at FROM operational_check WHERE service='retention-maintenance' ORDER BY checked_at DESC LIMIT 1");
 const [success]=await db.query("SELECT checked_at FROM operational_check WHERE service='retention-maintenance' AND state='completed' ORDER BY checked_at DESC LIMIT 1");
 const lastSuccessAt=success?.checked_at??null;
 const state=latest?.state==='failed'?'failed':!lastSuccessAt||now-new Date(lastSuccessAt).getTime()>36*3600000?'stale':latest?.state==='running'?'running':'ready';
 const message=state==='failed'?'La dernière maintenance a échoué. Vérifiez les exécutions et les effacements en attente.':state==='stale'?'Aucune maintenance réussie dans les dernières 36 heures. Vérifiez la planification.':state==='running'?'Maintenance en cours.':'Maintenance réussie dans les dernières 36 heures.';
 return {state,message,lastSuccessAt,lastAttemptAt:latest?.checked_at??null};
}
