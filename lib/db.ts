import { Pool, types } from 'pg'

// DATE 칸은 연-월-일만 있는 값이다. 그대로 두면 pg 가 「한국 시각 자정」짜리
// Date 로 만들어 주는데, 그것을 JSON 으로 내보내면 UTC 로 옮겨져 전날 15시가 된다
// (2026-12-31 → "2026-12-30T15:00:00.000Z"). 받는 쪽은 앞 열 글자만 잘라 쓰므로
// 마감일·유료기간이 **하루 당겨져** 보이고, 그 값을 그대로 저장하면 고칠 때마다
// 하루씩 밀렸다. 시각이 없는 값에 시간대를 태우지 않는다 — 글자 그대로 넘긴다.
types.setTypeParser(1082, (v) => v)

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