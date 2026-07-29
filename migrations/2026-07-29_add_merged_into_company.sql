-- 비회원(외부) 기업 → 회원 기업 "연결(병합)" 표시용 컬럼
-- Supabase SQL Editor에서 실행. (멱등 처리)
-- 연결 시 비회원 행은 삭제하지 않고 이 컬럼으로 "어느 회원기업에 연결됐는지"만 남긴다.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS merged_into_company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_merged_into ON companies(merged_into_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_is_member   ON companies(is_member);
