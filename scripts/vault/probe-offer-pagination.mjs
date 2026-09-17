import {withRole,request} from './common.mjs';
import {FranceTravailClient,initialFtQueries} from '../../backend/dist/public-data/france-travail-client.js';
await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 process.env.FT_CLIENT_ID=values.FT_CLIENT_ID;process.env.FT_CLIENT_SECRET=values.FT_CLIENT_SECRET;
 const client=new FranceTravailClient();
 for(const query of initialFtQueries()){
  const page=await client.search(query,1);console.log(JSON.stringify({query:query.keyword||query.rome,total:page.total,next:page.next,rows:page.rows.length}));
 }
});
