import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ProfileDto, validateProfile } from "../../src/profiles/profiles.module";
const base = {displayName:"Camille",qualifications:["IDE","IADE"],skills:[],experience:[],available:[],unavailable:[],latitude:null,longitude:null,radiusKm:null,acceptedShifts:["DAY"],preferredShifts:[],visible:true};
function errors(details: object) {return validateSync(plainToInstance(ProfileDto,{...base,details}),{whitelist:true,forbidNonWhitelisted:true});}
test("profile accepts declared professional reference and years for each diploma",()=>{
 const details={ideDiplomaYear:2015,iadeDiplomaYear:2020,referenceName:"Alex Exemple",referenceRole:"Cadre de santé",referenceEstablishment:"Établissement fictif",referenceEmail:"reference@example.invalid"};
 assert.equal(errors(details).length,0);assert.doesNotThrow(()=>validateProfile({...base,details} as ProfileDto));
});
test("profile reference validates email, lengths and rejects invented verification fields",()=>{
 assert.ok(errors({referenceEmail:"incorrect"}).length);assert.ok(errors({referenceName:"x".repeat(151)}).length);assert.ok(errors({referenceVerified:true}).length);
});
test("every diploma year is an integer with sensible bounds and cannot be future",()=>{
 for(const field of ["diplomaYear","ideDiplomaYear","iadeDiplomaYear","ibodeDiplomaYear"]){
  assert.ok(errors({[field]:1899}).length);assert.ok(errors({[field]:2020.5}).length);
  assert.throws(()=>validateProfile({...base,details:{[field]:new Date().getFullYear()+1}} as ProfileDto),/future/);
 }
});
test("legacy diploma details remain accepted when optional additions are omitted",()=>{
 assert.equal(errors({diploma:"Ancien intitulé conservé",diplomaYear:2010,firstName:"Camille"}).length,0);
});
