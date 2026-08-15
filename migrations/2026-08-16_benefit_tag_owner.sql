-- 기업이 직접 추가한 복리후생 태그는 그 기업에게만 보인다.
-- (A 매장의 오타·1회성 문구가 B 매장 목록에 뜨면 안 된다.)
-- 검수된 태그(is_curated)만 모두에게 공용이다.
ALTER TABLE benefit_tags ADD COLUMN IF NOT EXISTS created_by_company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_benefit_tags_owner ON benefit_tags(created_by_company_id) WHERE created_by_company_id IS NOT NULL;
