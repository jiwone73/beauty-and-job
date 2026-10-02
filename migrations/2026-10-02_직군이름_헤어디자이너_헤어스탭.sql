-- 직군 이름의 정식 표기를 「헤어디자이너」「헤어스탭」(붙여 쓰기, 스탭)으로 맞춘다.
--
-- 1) 「헤어 디자이너」 → 「헤어디자이너」
-- 2) 「헤어 스텝」「헤어스텝」 → 「헤어스탭」 — 앞서(2026-10-02_헤어스텝붙이기) 「헤어스텝」(텝)으로 붙였는데,
--    현장 표기·직군 목록 주석("스탭으로 통일")과 달라 정식 표기를 스탭으로 바로잡는다.
--
-- 직군 이름이 값으로 들어 있는 칸만 바꾼다 — 공고 제목·본문처럼 사람이 쓴 글은 건드리지 않는다.
--   job_postings.categories text[] / job_postings.positions[].category jsonb
--   applications.position_title / external_job_inbox.categories / job_categories.name(참조 표, 다른 표는 id 로 잇는다)

BEGIN;

UPDATE job_postings SET categories = array_replace(array_replace(array_replace(categories,
    '헤어 디자이너', '헤어디자이너'), '헤어스텝', '헤어스탭'), '헤어 스텝', '헤어스탭')
 WHERE categories && ARRAY['헤어 디자이너', '헤어스텝', '헤어 스텝'];

UPDATE job_postings
   SET positions = (
     SELECT jsonb_agg(
       CASE e->>'category'
         WHEN '헤어 디자이너' THEN jsonb_set(e, '{category}', '"헤어디자이너"')
         WHEN '헤어스텝'      THEN jsonb_set(e, '{category}', '"헤어스탭"')
         WHEN '헤어 스텝'     THEN jsonb_set(e, '{category}', '"헤어스탭"')
         ELSE e END
       ORDER BY ord)
       FROM jsonb_array_elements(positions) WITH ORDINALITY AS t(e, ord))
 WHERE jsonb_typeof(positions) = 'array'
   AND EXISTS (SELECT 1 FROM jsonb_array_elements(positions) x WHERE x->>'category' IN ('헤어 디자이너', '헤어스텝', '헤어 스텝'));

UPDATE applications
   SET position_title = replace(replace(replace(position_title, '헤어 디자이너', '헤어디자이너'), '헤어스텝', '헤어스탭'), '헤어 스텝', '헤어스탭')
 WHERE position_title ~ '헤어 디자이너|헤어스텝|헤어 스텝';

UPDATE external_job_inbox SET categories = array_replace(array_replace(array_replace(categories,
    '헤어 디자이너', '헤어디자이너'), '헤어스텝', '헤어스탭'), '헤어 스텝', '헤어스탭')
 WHERE categories && ARRAY['헤어 디자이너', '헤어스텝', '헤어 스텝'];

UPDATE job_categories SET name = '헤어디자이너' WHERE name = '헤어 디자이너';

COMMIT;
