import {createHmac,randomBytes,timingSafeEqual,createCipheriv,createDecipheriv,hkdfSync} from 'node:crypto';
import {required} from '../config';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret(){let bits=0,value=0,out='';for(const b of randomBytes(20)){value=(value<<8)|b;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}return out;}
function decode(secret:string){let bits=0,value=0;const out:number[]=[];for(const c of secret){const n=alphabet.indexOf(c);if(n<0)throw Error('Invalid TOTP secret');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
export function totp(secret:string,counter:number,digits=6){const bytes=Buffer.alloc(8);bytes.writeBigUInt64BE(BigInt(counter));const mac=createHmac('sha1',decode(secret)).update(bytes).digest(),offset=mac[19]!&15;return ((mac.readUInt32BE(offset)&0x7fffffff)%10**digits).toString().padStart(digits,'0');}
export function verifyTotp(secret:string,code:string,last:number,now=Date.now()){if(!/^\d{6}$/.test(code))return null;const step=Math.floor(now/30000);for(const counter of [step,step-1,step+1])if(counter>last&&timingSafeEqual(Buffer.from(totp(secret,counter)),Buffer.from(code)))return counter;return null;}
function key(){return Buffer.from(hkdfSync('sha256',Buffer.from(required('DOCUMENT_KEY'),'base64'),Buffer.from('infimatch-admin'),Buffer.from('totp-v1'),32));}
export function sealSecret(secret:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const ciphertext=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64');}
export function openSecret(value:string){const b=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));cipher.setAuthTag(b.subarray(12,28));return Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8');}
