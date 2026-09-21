import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {docxDocumentXml,acceptsCv,DOCX_MIME} from '../src/lib/cvDocx.ts';
import {reviewedCvProfile} from '../src/lib/cvReview.ts';
export function zipDocument(xml,overrides={}) {
 const entries=[['[Content_Types].xml','<Types/>'],['word/document.xml',xml]],locals=[],central=[];let offset=0;
 for(const [name,source] of entries){const raw=Buffer.from(source),payload=deflateRawSync(raw),n=Buffer.from(name);let crc=0xffffffff;for(const byte of raw){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(n.length,26);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(payload.length,20);c.writeUInt32LE(name==='word/document.xml'?(overrides.size??raw.length):raw.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);locals.push(local,n,payload);central.push(c,n);offset+=local.length+n.length+payload.length;}
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(2,8);end.writeUInt16LE(2,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);const result=Buffer.concat([...locals,directory,end]);return result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
}
test('DOCX bounded extraction reads deflate document, not relationships or HTML',async()=>{const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:t>IDE 2014</w:t></w:p></w:document>';assert.equal(await docxDocumentXml(zipDocument(xml),new AbortController().signal),xml);});
test('DOCX rejects declared zip bomb and false low size',async()=>{await assert.rejects(docxDocumentXml(zipDocument('x',{size:3*1024*1024}),new AbortController().signal));await assert.rejects(docxDocumentXml(zipDocument('x'.repeat(5000),{size:1}),new AbortController().signal));});
test('DOCX rejects DTD and damaged checksum',async()=>{await assert.rejects(docxDocumentXml(zipDocument('<!DOCTYPE x><x/>'),new AbortController().signal));const b=zipDocument('text'),v=new DataView(b);for(let i=0;i<b.byteLength-46;i++)if(v.getUint32(i,true)===0x02014b50&&v.getUint32(i+24,true)===4){v.setUint32(i+16,1,true);break;}await assert.rejects(docxDocumentXml(b,new AbortController().signal));});
test('DOCX honours cancellation and file limits',async()=>{const c=new AbortController();c.abort();await assert.rejects(docxDocumentXml(zipDocument('x'),c.signal));assert.equal(acceptsCv({name:'cv.docx',type:'',size:100}),true);assert.equal(acceptsCv({name:'cv.docm',type:'',size:100}),false);assert.equal(acceptsCv({name:'cv.docx',type:DOCX_MIME,size:6*1024*1024}),false);});
const profile={display_name:'Existant',details:{firstName:'Existant',lastName:'Protégé',ideDiplomaYear:2010},qualifications:['IDE'],skills:['SKILL_EXISTING'],rpps_status:'VERIFIED'};
test('review preserves personal identity, RPPS, existing skills and independent IDE year',()=>{const patch=reviewedCvProfile(profile,[{qualification:'IADE',year:2018}], [{code:'NEW'}]);assert.deepEqual(patch.qualifications,['IDE','IADE']);assert.equal(patch.details.ideDiplomaYear,2010);assert.equal(patch.details.iadeDiplomaYear,2018);assert.equal(patch.details.firstName,'Existant');assert.equal(patch.rpps_status,undefined);assert.deepEqual(patch.skills,['SKILL_EXISTING','NEW']);assert.equal(profile.details.iadeDiplomaYear,undefined);});
test('review rejects invalid, future or reversed diploma years and leaves original untouched',()=>{for(const year of [1899,2100,2009])assert.throws(()=>reviewedCvProfile(profile,[{qualification:'IADE',year}],[]));assert.equal(profile.details.ideDiplomaYear,2010);});

test('missing OCR years preserve existing years and allow incomplete new diplomas without inventing IDE year',()=>{
 const patch=reviewedCvProfile(profile,[{qualification:'IDE',year:null},{qualification:'IADE',year:null}],[]);
 assert.equal(patch.details.ideDiplomaYear,2010);assert.equal(patch.details.iadeDiplomaYear,undefined);assert.deepEqual(patch.qualifications,['IDE','IADE']);
 const fresh=reviewedCvProfile({...profile,details:{},qualifications:[]},[{qualification:'IADE',year:2012}],[]);
 assert.equal(fresh.details.ideDiplomaYear,undefined);assert.equal(fresh.details.iadeDiplomaYear,2012);assert.deepEqual(fresh.qualifications,['IDE','IADE']);
});
