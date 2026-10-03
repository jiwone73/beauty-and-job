-- 공고 모집분야(job_postings.categories)에 띄어 쓴 「헤어 스탭(시니어·주니어)」 48건을 「헤어스탭(시니어·주니어)」로 붙인다
-- (사용자 지시, 2026-10-03). 괄호 뒤 말은 건드리지 않고 띄어쓰기만 지운다. 이전 값은 backups/2026-10-03_공고모집분야_헤어스탭_이전값.json
BEGIN;
UPDATE job_postings
   SET categories = ARRAY(SELECT regexp_replace(x, '헤어\s+스탭', '헤어스탭', 'g') FROM unnest(categories) WITH ORDINALITY AS t(x, i) ORDER BY i)
 WHERE EXISTS (SELECT 1 FROM unnest(categories) x WHERE x ~ '헤어\s+스탭');
COMMIT;
