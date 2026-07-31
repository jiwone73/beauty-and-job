-- ===========================================================
-- 뷰티워크 · 비회원(외부) 기업 온보딩 퍼널 추적
-- 흐름: RECEIVED(지원접수) → INVITED(가입안내 발송) → JOINED(회원가입 완료)
--       → LINKED(대기 지원서 연결·이관)
-- 이탈: INVITE_FAILED(연락처없음/발송실패) · DECLINED(거절) · EXPIRED(기한초과 파기)
-- Supabase SQL Editor에서 실행. (멱등)
-- ===========================================================

-- 1) 비회원 기업 온보딩 상태 (companies, is_member=false 대상)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'RECEIVED',
  ADD COLUMN IF NOT EXISTS invited_at     timestamptz,   -- 가입 안내 최초 발송 시각
  ADD COLUMN IF NOT EXISTS invite_channel text,          -- EMAIL | SMS | BOTH
  ADD COLUMN IF NOT EXISTS invite_count   int NOT NULL DEFAULT 0,  -- 발송 횟수(리마인더 포함)
  ADD COLUMN IF NOT EXISTS joined_at      timestamptz,   -- 회원가입 완료 시각
  ADD COLUMN IF NOT EXISTS linked_at      timestamptz;   -- 대기 지원서 연결·이관 완료 시각

-- 2) 지원서 단위 추적 (applications)
--    delivery_status 값 확장: PENDING(접수·보관) → LINKED(기업연결) → VIEWED(열람)
--                            / WITHDRAWN(구직자 철회) / EXPIRED(파기)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS viewed_at  timestamptz,        -- 기업이 이 지원서를 열람한 시각
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;        -- 보관 기한(미가입 시 파기 기준, 자동파기는 추후)

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS idx_companies_onboarding ON companies(onboarding_status) WHERE is_member = false;
CREATE INDEX IF NOT EXISTS idx_applications_viewed   ON applications(viewed_at);
