import { useEffect, useState } from 'react';
type Report={schemaVersion:number;measuredAt:string;artifactSha256:string;installed:{bytes:number;fileCount:number};initial:{bytes:number};transfers:null|{measuredAt:string;environment:string;url:string;transferBytes:number;resourceCount:number;artifactSha256:string}};
const size=(bytes:number)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(bytes/1024)+' Kio';
export function BuildMetrics(){
 const [report,setReport]=useState<Report|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch('/quality/build-weight.json',{signal:abort.signal,cache:'no-cache'}).then(async r=>{if(!r.ok)throw Error();const v=await r.json();if(v.schemaVersion!==1||!/^([a-f0-9]{64})$/.test(v.artifactSha256)||!Number.isFinite(Date.parse(v.measuredAt))||!Number.isFinite(v.installed?.bytes)||!Number.isFinite(v.initial?.bytes))throw Error();setReport(v);}).catch(()=>{if(!abort.signal.aborted)setFailed(true);});return()=>abort.abort();},[]);
 return <section><h2>Mesures de cette version</h2>{!report?<p role="status">{failed?'Mesures indisponibles pour cette version. Aucun ancien résultat n’est affiché.':'Chargement des mesures…'}</p>:<>
  <p>Générées le <time dateTime={report.measuredAt}>{new Date(report.measuredAt).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} (Paris)</time>.</p>
  <dl><dt>Poids installé sur l’hébergement</dt><dd>{size(report.installed.bytes)} — {report.installed.fileCount} fichiers, dont les outils OCR chargés à la demande.</dd>
   <dt>Chargement initial estimé</dt><dd>{size(report.initial.bytes)} de fichiers HTML et dépendances initiales non compressés. Les images, polices et chargements dynamiques peuvent ajouter des transferts.</dd>
   <dt>Transferts réseau mesurés</dt><dd>{report.transfers&&report.transfers.artifactSha256===report.artifactSha256?`${size(report.transfers.transferBytes)} · ${report.transfers.environment} · ${report.transfers.resourceCount} ressources · ${report.transfers.measuredAt}`:'Non mesurés pour cet artefact. Le poids des fichiers ne permet pas de les déduire.'}</dd></dl>
  <p>Empreinte SHA-256 des fichiers (hors rapport) : <code style={{overflowWrap:'anywhere'}}>{report.artifactSha256}</code>.</p>
  <p><a href="/quality/build-weight.json">Consulter le rapport de cette version</a>. Ces mesures ne sont ni un score RGESN ni une estimation de consommation énergétique.</p>
 </>}</section>;
}
