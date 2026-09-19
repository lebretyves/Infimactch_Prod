// Read only the main Word XML part. Never render HTML, run macros or follow relationships.
const MAX_XML = 2 * 1024 * 1024;
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export function isCvDocx(file: Pick<File, 'name' | 'type'>) {
  return file.type === DOCX_MIME || (/\.docx$/i.test(file.name) && (!file.type || file.type === 'application/octet-stream'));
}
export function acceptsCv(file: Pick<File, 'name' | 'type' | 'size'>) {
  return file.size <= 5 * 1024 * 1024 && (isCvDocx(file) || ['application/pdf','image/jpeg','image/png'].includes(file.type));
}
export async function docxDocumentXml(buffer: ArrayBuffer, signal: AbortSignal): Promise<string> {
  const bad = () => new Error('Ce DOCX est illisible ou utilise un format non pris en charge. Exportez-le en PDF.');
  signal.throwIfAborted();
  if (buffer.byteLength > 5 * 1024 * 1024 || buffer.byteLength < 22) throw bad();
  const view = new DataView(buffer), bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0 || view.getUint16(end+4,true) || view.getUint16(end+6,true)) throw bad();
  const count = view.getUint16(end+10,true), centralSize = view.getUint32(end+12,true);
  let pos = view.getUint32(end+16,true), total = 0;
  const centralEnd = pos + centralSize;
  if (!count || count > 500 || count !== view.getUint16(end+8,true) || centralEnd !== end) throw bad();
  let document: {offset:number;packed:number;size:number;method:number;crc:number} | undefined;
  const names = new Set<string>();
  for (let i=0;i<count;i++) {
    signal.throwIfAborted();
    if (pos+46>centralEnd || view.getUint32(pos,true)!==0x02014b50) throw bad();
    const flags=view.getUint16(pos+8,true), method=view.getUint16(pos+10,true), packed=view.getUint32(pos+20,true), size=view.getUint32(pos+24,true);
    const nameSize=view.getUint16(pos+28,true), extra=view.getUint16(pos+30,true), comment=view.getUint16(pos+32,true);
    const next=pos+46+nameSize+extra+comment;
    if(next>centralEnd || flags&1 || view.getUint16(pos+34,true)) throw bad();
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(pos+46,pos+46+nameSize));
    if(names.has(name) || name.includes('..') || name.includes('\\') || name.startsWith('/') || /vbaProject|activeX/i.test(name)) throw bad();
    names.add(name); total+=size;
    if(total>25*1024*1024) throw new Error('Ce DOCX est trop volumineux après décompression. Exportez un CV plus court en PDF.');
    if(name==='word/document.xml') {
      if(size>MAX_XML || packed>5*1024*1024 || (method!==0 && method!==8)) throw bad();
      document={offset:view.getUint32(pos+42,true),packed,size,method,crc:view.getUint32(pos+16,true)};
    }
    pos=next;
  }
  if(pos!==centralEnd || !document || !names.has('[Content_Types].xml')) throw bad();
  const {offset,packed,size,method,crc}=document;
  if(offset+30>end || view.getUint32(offset,true)!==0x04034b50 || view.getUint16(offset+8,true)!==method || view.getUint16(offset+6,true)&1) throw bad();
  const nameLength=view.getUint16(offset+26,true), start=offset+30+nameLength+view.getUint16(offset+28,true);
  if(start+packed>view.getUint32(end+16,true) || new TextDecoder().decode(bytes.subarray(offset+30,offset+30+nameLength))!=='word/document.xml') throw bad();
  const blob=new Blob([buffer.slice(start,start+packed)]);
  let stream:ReadableStream<Uint8Array<ArrayBuffer>> = blob.stream();
  if(method===8) {
    try { stream=stream.pipeThrough(new DecompressionStream('deflate-raw')); }
    catch { throw new Error('Votre navigateur ne peut pas lire ce DOCX. Importez sa version PDF.'); }
  }
  const reader=stream.getReader(), chunks:Uint8Array[]=[];
  const abort=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',abort,{once:true});
  let length=0;
  try {
    for (;;) {
      signal.throwIfAborted(); const {done,value}=await reader.read(); signal.throwIfAborted(); if(done)break;
      length+=value.length;
      if(length>MAX_XML || length>size) {await reader.cancel();throw bad();}
      chunks.push(value);
    }
  } finally {signal.removeEventListener('abort',abort);reader.releaseLock();}
  if(length!==size) throw bad();
  const result=new Uint8Array(length);let at=0;for(const chunk of chunks){result.set(chunk,at);at+=chunk.length;}
  let checksum=0xffffffff;
  for(const byte of result){checksum^=byte;for(let n=0;n<8;n++)checksum=(checksum>>>1)^((checksum&1)?0xedb88320:0);}
  if(((checksum^0xffffffff)>>>0)!==crc) throw bad();
  const xml=new TextDecoder('utf-8',{fatal:true}).decode(result);
  if(/<!DOCTYPE|<!ENTITY/i.test(xml)) throw bad();
  return xml;
}
export function docxXmlText(xml:string):string {
  if(xml.length>MAX_XML || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Contenu DOCX non pris en charge.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const namespaces=[WORD_NS,'http://purl.oclc.org/ooxml/wordprocessingml/main'];
  if(doc.querySelector('parsererror') || !namespaces.includes(doc.documentElement.namespaceURI||'') || doc.documentElement.localName!=='document') throw new Error('Le texte de ce DOCX est illisible.');
  // Paragraphs preserve dates/experience boundaries; only explicit Word text is read.
  const parts:string[]=[];
  for(const paragraph of Array.from(doc.getElementsByTagNameNS(doc.documentElement.namespaceURI,'p'))) {
    parts.push(Array.from(paragraph.getElementsByTagNameNS(doc.documentElement.namespaceURI,'t')).map(node=>node.textContent||'').join(' '));
  }
  const text=parts.join('\n');
  if(text.length>60000) throw new Error('Le CV contient trop de texte. Choisissez une version plus courte.');
  return text;
}
