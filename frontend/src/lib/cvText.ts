import {cvPdfText} from './cvPdfText';
﻿import {createBankCameraReader} from './bankOcr';
export async function extractCvText(file:File,signal:AbortSignal,progress:(message:string)=>void){
 if(file.size>5*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(file.type))throw Error('Choisissez un CV PDF, JPEG ou PNG de 5 Mo maximum.');
 let reader:Awaited<ReturnType<typeof createBankCameraReader>>|undefined,loading:import('pdfjs-dist').PDFDocumentLoadingTask|undefined;
 const check=()=>{if(signal.aborted)throw new DOMException('Analyse interrompue','AbortError');};
 const stop=()=>{reader?.close();void loading?.destroy().catch(()=>{});};signal.addEventListener('abort',stop,{once:true});
 async function recognize(canvas:HTMLCanvasElement){check();progress('Lecture des pages scannées sur cet appareil…');reader??=await createBankCameraReader(signal,'fra+eng');check();return reader.read(canvas);}
 try{
  check();
  if(file.type!=='application/pdf'){
   const bitmap=await createImageBitmap(file);try{check();if(bitmap.width*bitmap.height>20000000)throw Error('Image trop grande. Importez une image de moins de 20 mégapixels.');const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);return await recognize(canvas);}finally{bitmap.close();}
  }
  progress('Lecture du PDF…');const pdfjs=await import('pdfjs-dist');check();pdfjs.GlobalWorkerOptions.workerSrc='/ocr/pdf.worker.min.mjs';loading=pdfjs.getDocument({data:await file.arrayBuffer(),useSystemFonts:true,disableFontFace:true,stopAtErrors:true});check();const pdf=await loading.promise;check();
  if(pdf.numPages>5)throw Error('L’import est limité à 5 pages. Choisissez une version plus courte de votre CV.');
  const pages:string[]=[];
  for(let n=1;n<=pdf.numPages;n++){
   check();progress(`Lecture de la page ${n} sur ${pdf.numPages}…`);const page=await pdf.getPage(n);const content=await page.getTextContent();check();let text=cvPdfText(content.items.filter((item):item is import('pdfjs-dist/types/src/display/api').TextItem=>'str' in item),page.getViewport({scale:1}).width);
   if(text.replace(/\s/g,'').length<40){const basic=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(2,2000/Math.max(basic.width,basic.height))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;text=await recognize(canvas);}
   pages.push(text);page.cleanup();if(pages.join('\n').length>60000)throw Error('Le CV contient trop de texte. Limitez-le aux expériences professionnelles.');
  }
  return pages.join('\n');
 }catch(e){if(e instanceof Error&&e.name==='PasswordException')throw Error('Ce PDF est protégé. Importez une copie sans mot de passe.');if(e instanceof Error&&['InvalidPDFException','UnknownErrorException'].includes(e.name))throw Error('Ce PDF est illisible. Importez un autre fichier.');throw e;}
 finally{signal.removeEventListener('abort',stop);stop();}
}
