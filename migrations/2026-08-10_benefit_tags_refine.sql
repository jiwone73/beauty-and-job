-- ===========================================================
-- 뷰티워크 · benefit_tags 매장/오피스 재큐레이션
--   매장(살롱 현장)과 오피스(본사 사무)의 복지가 크게 달라 재분류.
--   ① 오피스 성격 태그를 BOTH→OFFICE로 이동(매장 목록에서 빠짐)
--   ② 매장/오피스 각 특화 태그 추가, 공통 태그 추가
--   멱등: UPDATE는 조건부, INSERT는 ON CONFLICT DO NOTHING.
-- ===========================================================

-- ① BOTH → OFFICE 재분류(매장엔 부적합한 사무직 복지)
UPDATE benefit_tags SET job_type = 'OFFICE'
 WHERE job_type = 'BOTH' AND name IN ('사내 동호회', '워크숍·세미나', '성과급', '건강검진', '반차');

-- ② 태그 추가(정규)
INSERT INTO benefit_tags (name, job_type, is_curated)
VALUES
  -- 공통
  ('주5일 근무', 'BOTH', true),
  -- 매장(살롱 현장) 특화
  ('숙식 제공', 'STORE', true),
  ('제품 할인', 'STORE', true),
  ('승진 기회', 'STORE', true),
  ('최신 시설·장비', 'STORE', true),
  -- 오피스(본사 사무) 특화
  ('리프레시 휴가', 'OFFICE', true),
  ('통신비 지원', 'OFFICE', true),
  ('자사 제품 지원', 'OFFICE', true),
  ('생일 축하금', 'OFFICE', true)
ON CONFLICT (name, job_type) DO NOTHING;
