-- 원문이 아직 살아 있는지 마지막으로 확인한 시각.
-- 확인 안 된 지 오래된 공고부터 돌려 가며 보기 위한 값이다.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS source_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_job_postings_source_checked
  ON job_postings (source_checked_at NULLS FIRST)
  WHERE status = 'ACTIVE' AND source_url IS NOT NULL;
