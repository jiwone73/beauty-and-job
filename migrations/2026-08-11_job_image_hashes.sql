-- ===========================================================
-- 뷰티워크 · job_image_hashes (외부공고 이미지 지각해시 캐시)
--   목적: 활성공고 목록의 상세 이미지를 "한 번만" 해시해 저장 → 재분석 생략(증분).
--         같은 해시가 서로 다른 source(사이트)에 나타나면 = 기업 제공 이미지(교차대조).
--   dHash(9x8) 16진 문자열. host_origin = 호스트 기반 1차 분류(company/site_upload/site_template).
--   멱등: IF NOT EXISTS.
-- ===========================================================

CREATE TABLE IF NOT EXISTS job_image_hashes (
  posting_url  text NOT NULL,
  image_url    text NOT NULL,
  source       text NOT NULL DEFAULT '',   -- 헤어인잡·알바몬·자사홈페이지 등
  hash         text NOT NULL,              -- dHash(16진)
  host_origin  text NOT NULL DEFAULT '',   -- company | site_upload | site_template
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (posting_url, image_url)
);
CREATE INDEX IF NOT EXISTS idx_job_image_hashes_hash ON job_image_hashes(hash);
CREATE INDEX IF NOT EXISTS idx_job_image_hashes_posting ON job_image_hashes(posting_url);
