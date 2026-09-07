const path=require('path'),Module=require('module');
const out='/Users/jiwon/Desktop/beauty-and-job/.tmpchk/out';
const o=Module._resolveFilename;Module._resolveFilename=function(r,...a){if(r.startsWith('@/'))r=path.join(out,r.slice(2));return o.call(this,r,...a)};
const {parseStructured}=require(path.join(out,'lib/external/parsers/structured.js'));
const UA={"User-Agent":"Mozilla/5.0 Chrome/124"};
(async()=>{
 const u="https://www.hairinjob.com/cms/s01_v.php?idx=22698";
 const buf=Buffer.from(await (await fetch(u,{headers:UA})).arrayBuffer());
 const r=parseStructured("hairinjob.com",new TextDecoder("euc-kr").decode(buf),u);
 console.log("salary_text :",r.salary_text||r.salary);
 console.log("salary_type :",r.salary_type);
 console.log("salary_amount:",r.salary_amount);
})();
