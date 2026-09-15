require('../../backend/dist/config').validateConfiguration();
const {Client}=require('pg');
(async()=>{
  if(process.env.INFIMATCH_SECRET_SOURCE!=='vault')throw new Error('VAULT_MODE_REQUIRED');
  const sql=new Client({connectionString:process.env.DATABASE_URL});
  try{await sql.connect();const r=await sql.query('SELECT current_database() AS database');console.log(JSON.stringify({source:'vault',database:r.rows[0].database,configurationValid:true}));}
  finally{await sql.end();}
})().catch(()=>{console.error('Vault runtime check failed');process.exitCode=1;});
