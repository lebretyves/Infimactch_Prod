/** A clinical word in transport, emergency response or facility marketing is not a job service. */
export function isJobServiceEvidence(text:string,code:string){
 const s=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const token=code.toLowerCase().replaceAll('_',' ');
 const namedPost=new RegExp('(?:poste|infirmier|infirmiere|affectation|rejoindr|travaill|exerc|interviendr).{0,65}(?:en|au|aux|service|unite).{0,25}'+token).test(s);
 if(code==='URGENCES'&&/urgence[s]? vitale|gestion des urgences|face aux urgences|en (?:cas d.|situation d.)urgence|(?:avc|samu|transport|transfert|evacuation).{0,100}urgence|urgence.{0,100}(?:avc|samu|transport|transfert|evacuation)/.test(s))return false;
 if(code==='REANIMATION'&&/(?:materiel|chariot|gestes|formation).{0,35}reanimation/.test(s))return false;
 if(namedPost)return true;
 if(/(?:notre |cet |l.)?(?:etablissement|hopital|clinique|groupe).{0,60}(?:dispose|comprend|regroupe|propose|offre|couvre)|(?:ensemble|diversite|panel|eventail) (?:des |d.)?(?:activites|specialites)|activites (?:de |en )/.test(s))return false;
 return true;
}
