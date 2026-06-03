import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pgPool?: Pool }

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  })

if (!globalForPg.pgPool) globalForPg.pgPool = pool

export default pool