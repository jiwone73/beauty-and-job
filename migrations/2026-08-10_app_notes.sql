-- ===========================================================
-- 뷰티워크 · app_notes (관리자 자유 메모 키-값 저장소)
--   용도: 아웃리치 "등록 이슈 노트" 등 화면별 자유 메모를 key로 저장.
--   멱등: IF NOT EXISTS.
-- ===========================================================

CREATE TABLE IF NOT EXISTS app_notes (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
