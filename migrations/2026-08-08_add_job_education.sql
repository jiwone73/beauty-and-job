-- 공고의 학력 요건(오피스 공고 필수, 매장 선택) 저장용 컬럼
-- 값 예: '학력무관' | '고졸 이상' | '초대졸 이상' | '대졸 이상' | '석사 이상'
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS education text;
