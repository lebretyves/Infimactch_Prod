const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const doc=JSON.parse(readFileSync(resolve(__dirname,'../../docs_intern/openapi.json'),'utf8'));
const missingSuccess=[],emptyBodies=[];
function resolveSchema(s){return s?.$ref?doc.components?.schemas?.[s.$ref.split('/').pop()]:s;}
for(const [path,item] of Object.entries(doc.paths))for(const method of ['get','post','put','patch','delete']){
 const op=item[method];if(!op)continue;
 if(!Object.entries(op.responses||{}).some(([status,value])=>/^2\d\d$/.test(status)&&value.content))missingSuccess.push(method.toUpperCase()+' '+path);
 for(const [media,entry] of Object.entries(op.requestBody?.content||{})){
  const s=resolveSchema(entry.schema);
  if(!s||(!s.oneOf&&!s.anyOf&&!s.allOf&&(s.type==='object'||!s.type)&&!Object.keys(s.properties||{}).length&&!s.additionalProperties))emptyBodies.push({operation:method.toUpperCase()+' '+path,media,schema:entry.schema?.$ref||null});
 }
}
console.log(JSON.stringify({missingSuccess,emptyBodies},null,2));

if(missingSuccess.length||emptyBodies.length)process.exitCode=1;
