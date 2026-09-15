-- 스타트(무료)의 공고 5건을 「동시에 5건」이 아니라 「평생 5번」으로 센다.
--
-- 여태는 진행 중인 공고만 셌다. 그래서 다섯 건을 올리고 이레 뒤 게재가 끝나면
-- 자리가 다시 비어, 무료로 끝없이 올릴 수 있었다. 소진되는 것이 아니었다.
--
-- 쓴 횟수를 기업에 적어 둔다. 공고 행을 세지 않는 까닭은 지우면 되살아나기
-- 때문이다 — 공고를 지워도 쓴 횟수는 그대로다.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS free_posts_used int NOT NULL DEFAULT 0;

-- 이미 올린 만큼 채워 둔다. 임시저장은 걸린 적이 없으므로 빼고 센다.
-- (2026-09-15 확인: 무료 기업 192곳 중 다섯 건을 넘긴 곳은 없다. 이 백필로
--  당장 막히는 곳은 없다.)
UPDATE companies c
   SET free_posts_used = (
     SELECT COUNT(*) FROM job_postings j
      WHERE j.company_id = c.id AND j.status <> 'DRAFT'
   )
 WHERE free_posts_used = 0;
