import type { PoolClient } from "pg";

// ⚠️ 샘플 데이터 자동 갱신 — 상용화 시 이 파일 + 크론 호출부 삭제
export async function refreshSampleData(client: PoolClient) {
  await client.query(`
    DELETE FROM applications a
    USING users u
    WHERE a.user_id = u.id
      AND u.is_sample = true
      AND a.applied_at < now() - interval '8 days'
  `);

  const newUsers = 3 + Math.floor(Math.random() * 6);
  await client.query(`
    UPDATE users SET created_at = now() - (floor(random()*10) || ' hours')::interval
    WHERE is_sample = true
      AND id IN (SELECT id FROM users WHERE is_sample = true ORDER BY random() LIMIT $1)
  `, [newUsers]);

  const newCompanies = 1 + Math.floor(Math.random() * 4);
  await client.query(`
    UPDATE companies SET created_at = now() - (floor(random()*8) || ' hours')::interval
    WHERE is_sample = true
      AND id IN (SELECT id FROM companies WHERE is_sample = true ORDER BY random() LIMIT $1)
  `, [newCompanies]);

  const newJobs = 5 + Math.floor(Math.random() * 11);
  await client.query(`
    UPDATE job_postings SET created_at = now() - (floor(random()*12) || ' hours')::interval
    WHERE is_sample = true
      AND id IN (SELECT id FROM job_postings WHERE is_sample = true ORDER BY random() LIMIT $1)
  `, [newJobs]);

  const newApps = 10 + Math.floor(Math.random() * 21);
  // 상태와 열람 시각의 앞뒤를 맞춘다. 상태만 제비뽑기로 넣으면 「면접까지 갔는데
  // 본 적은 없다」는 지원이 쌓여, 화면에서 열람 흐름을 볼 수 없다.
  // 열람 이후 단계면 지원한 뒤~지금 사이 아무 때나 본 것으로 둔다.
  await client.query(`
    WITH 뽑기 AS (
      SELECT u.id AS user_id, jp.id AS job_posting_id,
        (ARRAY['APPLIED','VIEWED','INTERVIEW','PASSED','REJECTED','WITHDRAWN'])[floor(random()*6+1)::int]::app_status AS status,
        now() - (floor(random()*10) || ' hours')::interval AS applied_at
      FROM (SELECT id, job_type FROM users WHERE is_sample = true ORDER BY random() LIMIT $1) u
      CROSS JOIN LATERAL (
        SELECT id FROM job_postings
        WHERE is_sample = true AND job_type = u.job_type
        ORDER BY random() LIMIT 1
      ) jp
    )
    INSERT INTO applications (user_id, job_posting_id, status, applied_at, viewed_at)
    SELECT user_id, job_posting_id, status, applied_at,
      CASE WHEN status IN ('VIEWED','INTERVIEW','PASSED','REJECTED')
        THEN applied_at + (random() * (now() - applied_at))
        ELSE NULL END
    FROM 뽑기
    ON CONFLICT (job_posting_id, user_id) DO NOTHING
  `, [newApps]);

  return { newUsers, newCompanies, newJobs, newApps };
}
