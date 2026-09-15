import fs from "node:fs"; import pg from "pg";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n")
  .filter(l=>l.includes("=")&&!l.trim().startsWith("#"))
  .map(l=>[l.slice(0,l.indexOf("=")).trim(), l.slice(l.indexOf("=")+1).trim()]));
const c = new pg.Client({connectionString: env.DATABASE_URL||env.POSTGRES_URL, ssl:{rejectUnauthorized:false}});
await c.connect();
const on = process.argv[2] === "on";
await c.query(`INSERT INTO app_settings (key,value) VALUES ('plan_sales',$1)
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, [on ? "on" : "off"]);
if (on) await c.query(`INSERT INTO app_settings (key,value) VALUES ('plan_bank',$1)
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`, ["(예시) 국민은행 123456-78-901234 하이어스"]);
const { rows } = await c.query(`SELECT key,value FROM app_settings WHERE key IN ('plan_sales','plan_bank')`);
for (const r of rows) console.log(" ", r.key, "=", r.value);
await c.end();
