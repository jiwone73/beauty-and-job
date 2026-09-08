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
    // 스키마 경로를 직접 정한다.
    //
    // 우리는 쿼리에 스키마를 안 적으므로(job_postings 처럼) search_path 에
    // public 이 있어야 한다. 보통은 역할 설정으로 들어오지만, 트랜잭션 풀러는
    // 서버 연결을 여러 손님이 돌려 쓰기 때문에 앞사람이 바꿔 놓은 값이 그대로
    // 넘어온다 — 실제로 pg_dump 가 쓰고 간 빈 search_path 때문에 모든 테이블이
    // 「없다」고 나왔다. 주변 설정에 기대지 않고 연결마다 못 박는다.
    options: "-c search_path=public,extensions",
  })

if (!globalForPg.pgPool) globalForPg.pgPool = pool

export default pool