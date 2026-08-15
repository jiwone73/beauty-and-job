-- 공고 필터(신입·경력직·경력무관)를 모집부문 표의 '경력/직책'에서 다시 계산한다.
-- 그동안은 첫 행만, 그것도 '숫자+년' 패턴만 경력으로 쳤다. 그래서
--   · '경력'만 적힌 공고 → 경력무관으로 빠지고
--   · 신입·경력을 함께 뽑는 공고 → 신입 전용으로 잡혔다.
-- 직책(매니저·실장·부원장·원장·점장)은 신입에게 주지 않는 자리라 경력으로 센다.
WITH c AS (
  SELECT jp.id,
         bool_or(p->>'career' ILIKE '%무관%') AS any_free,
         bool_or(p->>'career' ILIKE '%신입%') AS any_new,
         bool_or(p->>'career' NOT ILIKE '%신입%'
                 AND (p->>'career' ~ '[0-9]+\s*년'
                      OR p->>'career' ILIKE '%경력%'
                      OR p->>'career' ~ '매니저|실장|부원장|원장|점장')) AS any_exp
  FROM job_postings jp, LATERAL jsonb_array_elements(jp.positions) p
  WHERE jsonb_typeof(jp.positions) = 'array' AND COALESCE(p->>'career','') <> ''
  GROUP BY jp.id
)
UPDATE job_postings jp
SET experience_level = (CASE
      WHEN c.any_free OR (c.any_new AND c.any_exp) THEN 'ANY'
      WHEN c.any_new THEN 'NEW'
      WHEN c.any_exp THEN 'EXPERIENCED'
      ELSE 'ANY' END)::experience_level
FROM c
WHERE c.id = jp.id AND jp.experience_level IS DISTINCT FROM (CASE
      WHEN c.any_free OR (c.any_new AND c.any_exp) THEN 'ANY'
      WHEN c.any_new THEN 'NEW'
      WHEN c.any_exp THEN 'EXPERIENCED'
      ELSE 'ANY' END)::experience_level;
