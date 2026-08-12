-- 모집분야별 급여: [{category, text}] 형태. 값 있으면 상세에서 분야별로 표시. 멱등.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_by_category jsonb;
