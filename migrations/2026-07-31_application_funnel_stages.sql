-- ===========================================================
-- 뷰티워크 · 외부(비회원) 지원서 퍼널을 '지원서 단위'로 추적
-- 단계(지원서별): 외부공고등록 → 접수 → 통보 → (회원가입: 회사단위) → 연결 → 확인
--   · 접수   = applied_at (지원 존재)
--   · 통보   = notified_at (그 회사에 가입 안내 발송 시 대기 지원서에 기록)
--   · 회원가입 = 공고 회사의 is_member/joined (회사 단위 사실)
--   · 연결   = linked_at (가입/연결 시 지원서에 기록)
--   · 확인   = viewed_at (이미 있음)
-- Supabase SQL Editor에서 실행. (멱등)
-- ===========================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,  -- 소속 기업에 가입 안내를 보낸(=통보) 시각
  ADD COLUMN IF NOT EXISTS linked_at   timestamptz;  -- 기업 가입/연결로 이 지원서가 회원 계정에 연결된 시각

CREATE INDEX IF NOT EXISTS idx_applications_notified ON applications(notified_at);
CREATE INDEX IF NOT EXISTS idx_applications_linked   ON applications(linked_at);
