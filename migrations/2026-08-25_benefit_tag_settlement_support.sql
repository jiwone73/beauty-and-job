-- 매장 복리후생 태그에 '정착지원금' 추가(매장만).
-- 이미 한 매장이 직접입력으로 등록해 미검수(is_curated=false, 그 매장 소유)
-- 상태로 존재했다 — 검수 태그로 승격시켜 모든 매장에 공용으로 연다.
-- 멱등: 있으면 검수 상태로 승격, 없으면 새로 넣는다.

INSERT INTO benefit_tags (name, job_type, is_curated)
VALUES
  ('정착지원금', 'STORE', true)
ON CONFLICT (name, job_type) DO UPDATE
  SET is_curated = true, created_by_company_id = NULL;
