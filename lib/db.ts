import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // Serverless: 함수당 1개 연결만
  idleTimeoutMillis: 10000, // 10초 후 idle 종료
  connectionTimeoutMillis: 10000,
})

export default pool
