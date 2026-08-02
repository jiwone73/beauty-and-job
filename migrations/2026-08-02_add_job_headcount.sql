-- 채용공고: 모집인원 (null = 미표기)
-- Supabase SQL Editor에서 실행. (멱등)
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS headcount int;
