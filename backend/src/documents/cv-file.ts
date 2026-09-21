import {fileMime} from './crypto';
export const DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const CV_MIMES=['application/pdf','image/png','image/jpeg',DOCX_MIME];
// Stored as an opaque attachment, never extracted or executed on the server.
export function cvFileMime(data:Buffer):string|null {
 const imageOrPdf=fileMime(data);if(imageOrPdf)return imageOrPdf;
 if(data.length<22||data.readUInt32LE(0)!==0x04034b50)return null;
 let end=-1;
 for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(data.readUInt32LE(i)===0x06054b50&&i+22+data.readUInt16LE(i+20)===data.length){end=i;break;}
 if(end<0||data.readUInt16LE(end+4)||data.readUInt16LE(end+6))return null;
 const count=data.readUInt16LE(end+10),size=data.readUInt32LE(end+12),start=data.readUInt32LE(end+16);
 if(!count||count>512||count!==data.readUInt16LE(end+8)||start+size!==end)return null;
 let at=start;const names=new Set<string>();
 for(let i=0;i<count;i++){
  if(at+46>end||data.readUInt32LE(at)!==0x02014b50)return null;
  const flags=data.readUInt16LE(at+8),method=data.readUInt16LE(at+10),nameSize=data.readUInt16LE(at+28),extra=data.readUInt16LE(at+30),comment=data.readUInt16LE(at+32),offset=data.readUInt32LE(at+42);
  if(flags&1||![0,8].includes(method)||at+46+nameSize+extra+comment>end||offset+30>start||data.readUInt32LE(offset)!==0x04034b50)return null;
  const name=data.subarray(at+46,at+46+nameSize).toString('utf8');
  if(names.has(name)||name.includes('..')||/vbaProject|\.exe$|\.dll$/i.test(name))return null;
  names.add(name);at+=46+nameSize+extra+comment;
 }
 return at===end&&names.has('[Content_Types].xml')&&names.has('word/document.xml')?DOCX_MIME:null;
}
