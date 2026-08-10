-- job_postings에 원문 URL 저장(외부공고 재파싱·백필용). 멱등.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS source_url text;
