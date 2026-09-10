import fs from 'fs'
import pg from 'pg'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g,'')
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, options:'-c search_path=public,extensions' })
await c.connect()
// 시드니 주소가 남아 있을 수 있는 칸을 스키마에서 직접 찾아 전부 센다.
const 칸들 = (await c.query(`
  select table_name, column_name from information_schema.columns
  where table_schema='public' and data_type in ('text','character varying','jsonb','ARRAY')
  order by table_name, column_name`)).rows
let 총 = 0, 걸린곳 = []
for (const k of 칸들) {
  try {
    const r = await c.query(`select count(*)::int n from "${k.table_name}" where "${k.column_name}"::text like '%upbwhfppkrdhzijhghsb%'`)
    if (r.rows[0].n > 0) { 총 += r.rows[0].n; 걸린곳.push(`${k.table_name}.${k.column_name}=${r.rows[0].n}`) }
  } catch {}
}
console.log('시드니 주소가 남은 칸:', 총 === 0 ? '없음' : 걸린곳.join(', '))
const s = (await c.query(`select
  (select count(*) from pg_tables where schemaname='public') 테이블,
  (select count(*) from pg_indexes where schemaname='public') 인덱스,
  (select count(*) from information_schema.table_constraints where constraint_schema='public') 제약`)).rows[0]
console.log('스키마:', s)
await c.end()
