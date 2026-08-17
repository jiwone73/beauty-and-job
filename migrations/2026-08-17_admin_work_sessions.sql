-- 알바(외부 공고 등록 담당) 근무 기록.
-- 공고를 몇 건 올렸는지는 job_postings.created_by 로 알 수 있지만,
-- '몇 시간 일했는지'는 어디에도 남지 않아 따로 쌓는다.
--
-- ended_at 은 '마지막으로 활동한 시각'이다. 화면이 살아 있는 동안 계속 밀린다.
-- 시작하자마자 한 번 기록되므로 started_at 과 같을 수 있다(= 0분).
CREATE TABLE IF NOT EXISTS admin_work_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    text        NOT NULL,          -- ADMIN_ACCOUNTS 의 로그인 아이디 (예: alba)
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_work_sessions_range CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_admin_work_sessions_admin_started
  ON admin_work_sessions (admin_id, started_at DESC);
