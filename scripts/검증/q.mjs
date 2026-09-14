import fs from 'fs'
import pg from 'pg'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}))
pg.types.setTypeParser(1082, v=>v)
const pool = new pg.Pool({connectionString: env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:2, options:"-c search_path=public,extensions"})
pool.on('connect', c=>c.query("SET TIME ZONE 'Asia/Seoul'").catch(()=>{}))
export const q = async (sql, params=[]) => (await pool.query(sql, params)).rows
export const done = () => pool.end()
export { env }
