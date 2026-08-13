-- 공고별 상단 이미지(배너). 없으면(NULL) 기업정보의 커버 이미지를 그대로 쓴다.
-- 공고 등록 화면에서 이미지를 지워도 기업정보에 저장된 이미지는 그대로 두기 위해,
-- 공고 단위로 따로 보관한다. (빈 배열 = "이 공고는 상단 이미지 없음")
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS cover_images jsonb;
