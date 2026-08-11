-- ===========================================================
-- 뷰티워크 · 비회원 공고 자유입력(급여·모집인원)
--   숫자 컬럼(salary_min/max, headcount)에 담을 수 없는 원문 표기
--   ("추후협의", "인원미정", "건당 3만원" 등)을 그대로 보존하는 텍스트 컬럼.
--   값이 있으면 상세/목록 표시에서 이 텍스트를 우선한다. 멱등(IF NOT EXISTS).
-- ===========================================================

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS salary_text   text;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS headcount_text text;
