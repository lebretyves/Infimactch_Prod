import { useEffect, useState } from 'react';
type Report={schemaVersion:number;measuredAt:string;artifactSha256:string;installed:{bytes:number;fileCount:number};initial:{bytes:number};transfers:null|{measuredAt:string;environment:string;url:string;transferBytes:number;resourceCount:number;artifactSha256:string}};
const size=(bytes:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(bytes/(bytes>=1_000_000?1_000_000:1_000))+(bytes>=1_000_000?' Mo':' ko');
export function BuildMetrics(){
 const [report,setReport]=useState<Report|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch('/quality/build-weight.json',{signal:abort.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error();const v=await r.json();if(v.schemaVersion!==1||!/^([a-f0-9]{64})$/.test(v.artifactSha256)||!Number.isFinite(Date.parse(v.measuredAt))||!Number.isFinite(v.installed?.bytes)||!Number.isFinite(v.initial?.bytes))throw Error();setReport(v);}).catch(()=>{if(!abort.signal.aborted)setFailed(true);});return()=>abort.abort();},[]);
 return <section><h2>Mesures de cette version</h2>{!report?<p role="status">{failed?'Mesures indisponibles pour cette version. Aucun ancien résultat n’est affiché.':'Chargement des mesures…'}</p>:<>
  <p>Générées le <time dateTime={report.measuredAt}>{new Date(report.measuredAt).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} (Paris)</time>.</p>
  <dl><dt>Ensemble des fichiers hébergés</dt><dd>{size(report.installed.bytes)} — {report.installed.fileCount} fichiers avant compression, dont les outils de lecture de documents chargés à la demande. Ce total n’est pas téléchargé à chaque ouverture du site.</dd>
   <dt>Fichiers de base de la page d’accueil</dt><dd>{size(report.initial.bytes)} avant compression. Cette estimation comprend les fichiers de démarrage et les ressources référencées dans la page d’accueil. Les écrans et ressources chargés ensuite s’ajoutent à ce total : ce n’est pas une mesure complète du chargement dans le navigateur.</dd>
   <dt>Transferts réseau mesurés</dt><dd>{report.transfers&&report.transfers.artifactSha256===report.artifactSha256?`${size(report.transfers.transferBytes)} · ${report.transfers.environment} · ${report.transfers.resourceCount} ressources · ${report.transfers.measuredAt}`:'Pas encore mesurés pour cette version. La compression et le cache du navigateur modifient le volume réellement transféré.'}</dd></dl>
  <p><a href="/quality/build-weight.json">Consulter le rapport technique de cette version</a>. Ces mesures ne sont ni un score RGESN ni une estimation de consommation énergétique.</p>
 </>}</section>;
}
