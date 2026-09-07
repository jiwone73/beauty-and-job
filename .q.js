const fs=require('fs');
for(const l of fs.readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].trim();}
const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
p.query(`SELECT key, value FROM app_notes WHERE key LIKE 'jobissue:%' ORDER BY updated_at DESC NULLS LAST`)
.then(r=>{
 console.log("총",r.rows.length,"건");
 let 댓글있음=0;
 for(const x of r.rows){ const v=typeof x.value==='string'?JSON.parse(x.value):x.value;
   const 답=(v&&v.replies)||[]; if(답.length)댓글있음++; }
 console.log("댓글 달린 것:",댓글있음,"건");
 fs.writeFileSync('.issues.json',JSON.stringify(r.rows));
 return p.end();
}).catch(e=>{console.error(e.message);process.exit(1)});
