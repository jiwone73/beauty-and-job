-- 구직상태: 인재검색에서 '퇴직여부'(경력 종료일) 대신 실제로 중요한 "지금 구인 제안을 받을 의사"를 본다.
--   SEEKING  구직중        — 적극적으로 자리를 찾는 중
--   OPEN     좋은 제안은 검토 — 재직/휴식 중이지만 조건이 맞으면 이직 의사 있음
--   CLOSED   구직 안 함     — 제안을 받지 않음
-- 사람 단위 속성이라 이력서(resumes)가 아니라 프로필(user_profiles)에 둔다.
-- 상태는 금방 낡으므로 갱신 시점을 함께 저장해 인재검색에서 신선도를 보여준다.
DO $$ BEGIN
  CREATE TYPE job_search_status AS ENUM ('SEEKING', 'OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS job_search_status job_search_status NOT NULL DEFAULT 'SEEKING',
  ADD COLUMN IF NOT EXISTS job_search_status_at timestamptz;

-- 기존 회원은 이력서를 공개해 둔 상태(=구직 의사)라 기본값 그대로 두고, 갱신 시점만 채워 둔다.
UPDATE user_profiles SET job_search_status_at = COALESCE(job_search_status_at, updated_at, created_at)
WHERE job_search_status_at IS NULL;
