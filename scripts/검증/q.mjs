import fs from 'fs'
import pg from 'pg'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}))
pg.types.setTypeParser(1082, v=>v)
const pool = new pg.Pool({connectionString: env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:2, options:"-c search_path=public,extensions"})
// 앱(lib/db.ts)은 연결마다 한국 시간대를 건다. 검증이 그걸 안 걸면 한국 오전
// (UTC 로는 아직 전날) 동안 앱은 오늘, 검증은 어제를 보고 날짜 검사가 통째로
// 빨개진다 — 실제로 아침에 여덟 건이 그렇게 틀렸다.
pool.on("connect", (c) => { c.query("SET TIME ZONE 'Asia/Seoul'").catch(() => {}) })
pool.on('connect', c=>c.query("SET TIME ZONE 'Asia/Seoul'").catch(()=>{}))
export const q = async (sql, params=[]) => (await pool.query(sql, params)).rows
export const done = () => pool.end()
export { env }
