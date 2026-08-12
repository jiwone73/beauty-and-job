-- 모집부문 표: [{category, career, salary, headcount}] (모집분야별 경력/급여/인원). 멱등.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS positions jsonb;
