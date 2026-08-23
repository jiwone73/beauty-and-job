-- 활성공고 줄마다 '연락처 있음/없음'을 알바가 표시할 수 있게.
-- found_jobs 안에 넣지 않는 이유: 재조회(updateAllTabs)가 found_jobs 를 통째로
-- 갈아끼우기 때문에 표시가 매번 지워진다. 공고 URL 을 열쇠로 한 별도 칸에 둔다.
--   { "<공고 URL>": "y" | "n" }
ALTER TABLE target_companies
  ADD COLUMN IF NOT EXISTS job_phone_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
