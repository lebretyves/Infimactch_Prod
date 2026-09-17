import {parseBankText} from './bankFields';
export async function analyzeBankFile(file:File,signal:AbortSignal,onProgress:(value:string)=>void):Promise<string>{
 let worker:import('tesseract.js').Worker|undefined;
 let pdf:import('pdfjs-dist').PDFDocumentProxy|undefined;
 let loading:import('pdfjs-dist').PDFDocumentLoadingTask|undefined;
 const cancelled=()=>{if(signal.aborted)throw new Error('Analyse annulée.');};
 const stop=()=>{void worker?.terminate();void loading?.destroy();};signal.addEventListener('abort',stop,{once:true});
 const recognize=async(image:HTMLCanvasElement|File)=>{
  cancelled();if(!worker){onProgress('Chargement du moteur local…');const {createWorker}=await import('tesseract.js');cancelled();worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',cacheMethod:'none',workerBlobURL:false,logger:()=>{},errorHandler:()=>{}});if(signal.aborted){await worker.terminate();cancelled();}}
  onProgress('Lecture du document sur cet appareil…');const value=await worker.recognize(image);cancelled();return value.data.text;
 };
 try{
  if(file.type!=='application/pdf'){
   const bitmap=await createImageBitmap(file);try{cancelled();if(bitmap.width*bitmap.height>20000000)throw new Error('Image trop grande pour l’analyse locale. Utilisez une image plus petite ou la saisie manuelle.');const scale=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);return await recognize(canvas);}finally{bitmap.close();}
  }
  onProgress('Lecture locale du PDF…');const pdfjs=await import('pdfjs-dist');cancelled();pdfjs.GlobalWorkerOptions.workerSrc='/ocr/pdf.worker.min.mjs';
  loading=pdfjs.getDocument({data:await file.arrayBuffer(),useSystemFonts:true,disableFontFace:true,stopAtErrors:true});pdf=await loading.promise;cancelled();
  if(pdf.numPages>3)throw new Error('L’analyse est limitée à 3 pages. Importez un RIB plus court ou saisissez les champs manuellement.');
  let text='';
  for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();text+=content.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join('')+'\n';page.cleanup();cancelled();}
  if(parseBankText(text).iban)return text;
  for(let n=1;n<=Math.min(pdf.numPages,2);n++){const page=await pdf.getPage(n),basic=page.getViewport({scale:1}),scale=Math.min(2,2000/Math.max(basic.width,basic.height)),viewport=page.getViewport({scale});if(viewport.width*viewport.height>4000000)throw new Error('Page trop grande pour l’analyse.');const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvas,viewport}).promise;cancelled();text+='\n'+await recognize(canvas);page.cleanup();if(parseBankText(text).iban)break;}
  return text;
 }catch(cause){if(file.type==='application/pdf'){const name=cause instanceof Error?cause.name:'';if(name==='PasswordException')throw new Error('Ce PDF est protégé par un mot de passe. Importez une copie non protégée ou saisissez les champs manuellement.');if(name==='InvalidPDFException'||name==='UnknownErrorException')throw new Error('Ce PDF est illisible ou invalide. Importez un autre fichier ou saisissez les champs manuellement.');}throw cause;}finally{signal.removeEventListener('abort',stop);await worker?.terminate().catch(()=>{});await loading?.destroy().catch(()=>{});}
}

/** One local OCR worker per camera session; never upload preview frames. */
export async function createBankCameraReader(signal:AbortSignal){
 const {createWorker}=await import('tesseract.js');
 if(signal.aborted)throw new Error('Analyse annulée.');
 const worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',cacheMethod:'none',workerBlobURL:false,logger:()=>{},errorHandler:()=>{}});
 let stopped=false;
 const close=()=>{if(stopped)return;stopped=true;signal.removeEventListener('abort',close);void worker.terminate().catch(()=>{});};
 if(signal.aborted){close();throw new Error('Analyse annulée.');}
 signal.addEventListener('abort',close,{once:true});
 return {close,async read(canvas:HTMLCanvasElement){if(stopped)throw new Error('Analyse annulée.');const result=await worker.recognize(canvas);if(stopped)throw new Error('Analyse annulée.');return result.data.text;}};
}
