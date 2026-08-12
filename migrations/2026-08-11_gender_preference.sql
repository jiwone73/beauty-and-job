-- 매장 공고 성별우대(남성/여성/무관). 없으면 미지정. 멱등.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS gender_preference text;
