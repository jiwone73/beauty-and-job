-- 근무지가 여러 곳인 공고(지점을 함께 뽑는 브랜드 등)를 담는다.
-- 대표 주소는 지금처럼 기업 정보에 두고, 여기에는 '추가' 근무지만 넣는다.
-- 모양: [{"address":"서울 성동구 독서당로 223","detail":"2층"}, ...]
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS work_locations jsonb;
