-- 직군이 빈 공고를 제목 기준으로 채운다.
--
-- 애견 미용 값을 빼면서 7건이 비었다. 그런데 제목은 「헤어디자이너 채용」·
-- 「네일아티스트 채용」이다 — 애초에 직군이 잘못 붙어 있던 것이고, 제목만 봐도
-- 무엇을 뽑는지 분명하다. 제목에 근거가 있는 것만 채운다.

UPDATE job_postings SET categories = ARRAY['헤어 디자이너']
 WHERE array_length(categories, 1) IS NULL AND title ~ '헤어\s*디자이너';

UPDATE job_postings SET categories = ARRAY['네일 아티스트']
 WHERE array_length(categories, 1) IS NULL AND title ~ '네일\s*아티스트';
