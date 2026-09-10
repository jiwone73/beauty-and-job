-- 같은 기업이 같은 공고로 같은 사람에게 제안은 한 번만.
-- 동시에 다섯 번 보내니 다섯 건이 그대로 들어가, 받는 사람은 알림·메일을 다섯 번 받았다.
-- 만들기 전 겹친 묶음은 0건이었다.
CREATE UNIQUE INDEX IF NOT EXISTS proposals_company_user_job_key
  ON proposals (company_id, user_id, job_posting_id);

-- 못 보낸 메일. 메일 서비스는 실패해도 예외를 던지지 않고 error 를 돌려줘서,
-- 여태 실패가 서버 로그에조차 안 남았다. 「메일이 안 왔다」는 문의에 답할 근거.
CREATE TABLE IF NOT EXISTS email_failures (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_addr    text NOT NULL,
  subject    text,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_failures_created ON email_failures (created_at DESC);
