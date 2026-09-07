const path=require('path'),Module=require('module'),fs=require('fs');
const out='/Users/jiwon/Desktop/beauty-and-job/.tmpchk/out';
const o=Module._resolveFilename;Module._resolveFilename=function(r,...a){if(r.startsWith('@/'))r=path.join(out,r.slice(2));return o.call(this,r,...a)};
const {parseStructured}=require(path.join(out,'lib/external/parsers/structured.js'));
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"};
const ids=process.argv.slice(2);
(async()=>{
 const res=[];
 for(const u of ids){
  const h=new URL(u).hostname.replace(/^www\./,"");
  let r=null,err="";
  try{
    const buf=Buffer.from(await (await fetch(u,{headers:UA})).arrayBuffer());
    const html=/hairinjob/.test(h)?new TextDecoder("euc-kr").decode(buf):new TextDecoder("utf-8").decode(buf);
    r=parseStructured(h,html,u);
  }catch(e){err=e.message}
  const id=(u.match(/idx=(\d+)|recruit\/(\d+)|\/(\d+)$/)||[])[0]||u;
  if(!r){console.log(`${id}  ✗ 파서 실패 ${err}`);continue}
  console.log(`${id}  직군=${JSON.stringify(r.job_categories||[])} 전화=${r.contact_phone||"-"} 마감=${r.deadline||(r.always_open?"상시":"-")} 급여=${(r.salary_text||r.salary||"-")} 요일=${r.work_days||"-"} 주소=${(r.address||"-").slice(0,34)} 요강=${String(r.description||"").length}자`);
 }
})();
