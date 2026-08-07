-- 채용공고: 근무기간 (~6개월 / 1년 / 1년 이상 / 협의). 텍스트 그대로 저장.
-- Supabase SQL Editor에서 실행. (멱등)
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS work_period text;
