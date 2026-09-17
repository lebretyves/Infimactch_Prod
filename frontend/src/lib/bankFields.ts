export type BankFields={iban:string;bic:string;holder:string;bankName:string};
export const emptyBankFields=():BankFields=>({iban:'',bic:'',holder:'',bankName:''});
export const normalizeIban=(value:string)=>value.replace(/\s/g,'').toUpperCase();
const lengths:Record<string,number>={FR:27,DE:22,GB:22,ES:24,IT:27,BE:16,CH:21,LU:20,NL:18,AT:20,IE:22,PT:25,GR:27,MC:27,MT:31,NO:15,SE:24,FI:18,DK:18,PL:28,CZ:24,SK:24,HU:28,RO:24,BG:22,HR:21,SI:19,EE:20,LV:21,LT:20,CY:28,IS:26,LI:21,AL:28,AD:24,BA:20,RS:22,ME:22,MK:19,XK:20,TR:26,UA:29,MD:24,GE:22,AZ:28,BH:22,AE:23,SA:24,QA:29,KW:30,JO:30,IL:23,LB:28,IQ:23,PK:24,BR:29,CR:22,DO:28,GT:28,SV:28,LC:32,VG:24,SC:31,ST:25,TL:23,TN:24,EG:29,MA:28,MU:30,MR:27,BY:28,KZ:20,PS:29,VA:22,BI:27,DJ:27,SO:23,SD:18,LY:25,RU:33,NI:28,MN:20,FK:18,HN:28,OM:23};
export function validIban(raw:string){const value=normalizeIban(raw);if(!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value))return false;if(!lengths[value.slice(0,2)]||value.length!==lengths[value.slice(0,2)])return false;const rearranged=value.slice(4)+value.slice(0,4);let remainder=0;for(const c of rearranged){const digits=/[A-Z]/.test(c)?String(c.charCodeAt(0)-55):c;for(const digit of digits)remainder=(remainder*10+Number(digit))%97;}return remainder===1;}
export const validBic=(value:string)=>/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(value);
export function frenchBankParts(iban:string){const value=normalizeIban(iban);return value.startsWith('FR')&&validIban(value)?{bank:value.slice(4,9),branch:value.slice(9,14),account:value.slice(14,25),key:value.slice(25,27)}:null;}
export function parseBankText(text:string):BankFields {
 const result=emptyBankFields();text=text.replace(/\u00a0|\u202f/g,' ').replace(/\r/g,'').replace(/\n[ \t]*\n+/g,'\n');const upper=text.toUpperCase();
 // Never repair OCR digits by guessing. Only retain candidates with a valid checksum.
 for(const candidate of upper.matchAll(/[A-Z]{2}\s*\d{2}(?:[ \t\r\n-]*[A-Z0-9]){11,32}/g)){const compact=candidate[0].replace(/[\s-]/g,'');const expected=lengths[compact.slice(0,2)];const candidates=expected?[compact.slice(0,expected)]:Array.from({length:20},(_,i)=>compact.slice(0,15+i));const found=candidates.find(validIban);if(found){result.iban=found;break;}}
 const bic=upper.match(/(?:\bB[. \t]*I[. \t]*C\.?|SWIFT)(?:\s*\/\s*SWIFT)?(?:\s+CODE)?(?:[ \t]*\((?:BANK IDENTIFIER CODE|CODE[^)\n]*)\))?\s*[:\-]?\s*([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/);if(bic&&validBic(bic[1]))result.bic=bic[1];
 const labeled=(pattern:RegExp)=>{const match=text.match(pattern);const value=match?match[1].split(/\s+(?=(?:IBAN|BIC|SWIFT|titulaire(?:\s+du\s+compte)?|banque|account\s*holder|bank\s*name)\s*[:\-])/i)[0].trim():'';return /^(?:IBAN|BIC|SWIFT|titulaire|banque|account holder|bank name)(?:\s*[:\-]|\s*$)/i.test(value)?'':value.slice(0,150);};
 result.holder=labeled(/\b(?:titulaires?(?:\(s\))?(?:\s+du\s+compte)?|intitul[eé]\s+du\s+compte|account\s*holder)[ \t]*(?:[:\-][ \t]*\n?[ \t]*|\n[ \t]*|[ \t]+)([^\r\n]+)/i);
 result.bankName=labeled(/(?:banque|bank\s*name)[ \t]*(?:[:\-][ \t]*\n?[ \t]*|\n[ \t]*)([^\r\n]+)/i);
 return result;
}

export function completeBankText(text:string){const fields=parseBankText(text);return Boolean(fields.iban&&fields.bic&&fields.holder);}
