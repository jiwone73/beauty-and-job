-- ===========================================================
-- 뷰티워크 · benefit_tags (복리후생 태그 마스터)
--   폼(공고등록)의 복리후생 칩을 하드코딩 → DB 마스터 + 검색/자동완성으로.
--   is_curated=true: 정규 태그(필터 노출 대상). false: 기업이 추가한 미검수 태그.
--   job_type: STORE | OFFICE | BOTH (BOTH=양쪽 노출)
--   멱등: 테이블 IF NOT EXISTS + 시드는 ON CONFLICT DO NOTHING.
-- ===========================================================

CREATE TABLE IF NOT EXISTS benefit_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  job_type    text NOT NULL DEFAULT 'BOTH',
  is_curated  boolean NOT NULL DEFAULT false,
  usage_count int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, job_type)
);

INSERT INTO benefit_tags (name, job_type, is_curated)
VALUES
  ('4대보험', 'BOTH', true),
  ('인센티브', 'BOTH', true),
  ('식대 지원', 'BOTH', true),
  ('주차 가능', 'BOTH', true),
  ('교육비 지원', 'BOTH', true),
  ('정규직 전환', 'BOTH', true),
  ('퇴직금', 'BOTH', true),
  ('명절 선물·상여', 'BOTH', true),
  ('경조사비', 'BOTH', true),
  ('연차', 'BOTH', true),
  ('반차', 'BOTH', true),
  ('건강검진', 'BOTH', true),
  ('성과급', 'BOTH', true),
  ('교통비 지원', 'BOTH', true),
  ('장기근속 포상', 'BOTH', true),
  ('워크숍·세미나', 'BOTH', true),
  ('사내 동호회', 'BOTH', true),
  ('기숙사 제공', 'STORE', true),
  ('주말·공휴일 휴무', 'STORE', true),
  ('직원 시술 할인', 'STORE', true),
  ('유니폼 제공', 'STORE', true),
  ('재택근무', 'OFFICE', true),
  ('유연근무', 'OFFICE', true),
  ('자기계발비', 'OFFICE', true),
  ('복지포인트', 'OFFICE', true),
  ('자녀 학자금', 'OFFICE', true)
ON CONFLICT (name, job_type) DO NOTHING;
