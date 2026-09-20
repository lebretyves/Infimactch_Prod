import {createHmac,randomBytes,timingSafeEqual,createCipheriv,createDecipheriv,hkdfSync} from 'node:crypto';
import {required} from '../config';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret(){let bits=0,value=0,out='';for(const b of randomBytes(20)){value=(value<<8)|b;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}return out;}
function decode(secret:string){let bits=0,value=0;const out:number[]=[];for(const c of secret){const n=alphabet.indexOf(c);if(n<0)throw Error('Invalid TOTP secret');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
export function totp(secret:string,counter:number,digits=6){const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(BigInt(counter));const mac=createHmac('sha1',decode(secret)).update(bytes).digest(),offset=mac[19]!&15;return ((mac.readUInt32BE(offset)&0x7fffffff)%10**digits).toString().padStart(digits,'0');}
export function verifyTotp(secret:string,code:string,last:number,now=Date.now()){if(!/^\d{6}$/.test(code))return null;const step=Math.floor(now/30000);for(const counter of [step,step-1,step+1])if(counter>last&&timingSafeEqual(Buffer.from(totp(secret,counter)),Buffer.from(code)))return counter;return null;}
// The envelope records its key family/version. Legacy payloads remain readable
// with DOCUMENT_KEY_V1 during a staged rotation; no secret is silently discarded.
function version(value:string|undefined){const v=value||'1';if(!/^[1-9]\d{0,5}$/.test(v))throw Error('Invalid secret key version');return v;}
function rootKey(family:string,v:string){
 const current=version(process.env[family==='mfa'?'ADMIN_MFA_KEY_VERSION':'DOCUMENT_KEY_VERSION']);
 const name=family==='mfa'?'ADMIN_MFA_KEY':'DOCUMENT_KEY';
 const raw=v===current?required(name):required(`${name}_V${v}`);
 const key=Buffer.from(raw,'base64');if(key.length!==32)throw Error('Invalid secret key');return key;
}
function key(root:Buffer){return Buffer.from(hkdfSync('sha256',root,Buffer.from('infimatch-admin'),Buffer.from('totp-v1'),32));}
export function sealSecret(secret:string){const family=process.env.ADMIN_MFA_KEY?'mfa':'doc',v=version(process.env[family==='mfa'?'ADMIN_MFA_KEY_VERSION':'DOCUMENT_KEY_VERSION']),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(rootKey(family,v)),iv);const ciphertext=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return `${family}.${v}.`+Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64');}
export function openSecret(value:string){
 const tagged=/^(mfa|doc)\.([1-9]\d{0,5})\.([A-Za-z0-9+/=]+)$/.exec(value);
 if(value.includes('.')&&!tagged)throw Error('Invalid secret envelope');
 const b=Buffer.from(tagged?tagged[3]!:value,'base64');if(b.length<29)throw Error('Invalid secret envelope');
 const roots=tagged?[rootKey(tagged[1]!,tagged[2]!)]:[Buffer.from(process.env.DOCUMENT_KEY_V1||required('DOCUMENT_KEY'),'base64')];
 for(const root of roots){const cipher=createDecipheriv('aes-256-gcm',key(root),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8');}
 throw Error('Secret key unavailable');
}
