-- 「헤어 스텝」 → 「헤어스텝」(붙여 쓰기) 로 저장된 값을 옮긴다.
--
-- 화면에서는 늘 붙여 쓰기로 했는데 직군 이름(자료)이 띄어 있어, 사용자가 「헤어스텝」을
-- 검색하면 하나도 안 걸렸다. 코드의 직군 이름(lib/data/jobGroups.ts)을 붙인 이름으로 바꿨으므로
-- 이미 저장된 값도 같은 이름으로 맞춘다.
--
-- 바꾸는 곳은 「직군 이름이 값으로 들어 있는 칸」만이다 — 공고 본문(description)처럼 사람이
-- 쓴 글은 건드리지 않는다.
--   job_postings.categories            text[]  모집 직군 목록
--   job_postings.positions[].category  jsonb   모집 분야별 직군
--   applications.position_title        text    지원자가 고른 모집분야(「헤어 스텝 · 신입」)
--   external_job_inbox.categories      text[]  외부 공고 수집함의 직군(가져올 때 그대로 쓰인다)

BEGIN;

UPDATE job_postings
   SET categories = array_replace(categories, '헤어 스텝', '헤어스텝')
 WHERE '헤어 스텝' = ANY(categories);

UPDATE job_postings
   SET positions = (
     SELECT jsonb_agg(
       CASE WHEN e->>'category' = '헤어 스텝' THEN jsonb_set(e, '{category}', '"헤어스텝"') ELSE e END
       ORDER BY ord)
       FROM jsonb_array_elements(positions) WITH ORDINALITY AS t(e, ord))
 WHERE jsonb_typeof(positions) = 'array'
   AND EXISTS (SELECT 1 FROM jsonb_array_elements(positions) x WHERE x->>'category' = '헤어 스텝');

UPDATE applications
   SET position_title = replace(position_title, '헤어 스텝', '헤어스텝')
 WHERE position_title LIKE '%헤어 스텝%';

UPDATE external_job_inbox
   SET categories = array_replace(categories, '헤어 스텝', '헤어스텝')
 WHERE '헤어 스텝' = ANY(categories);

COMMIT;
