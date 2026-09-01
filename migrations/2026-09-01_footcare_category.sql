-- 「발 관리사(풋케어)」 직군을 새로 세우면서, 흩어져 있던 기존 공고를 모은다.
--
-- 두 건이 서로 다른 데 있었다.
--   · 「발관리 전문가」  ← 목록에 없는 값. 파서가 제목에서 만들어 냈다.
--   · 「피부 관리사(일반·경락)」 ← 「문제성발 관리사」 공고인데 피부로 뭉뚱그려졌다.
-- 제목에 발 관리 신호가 있는 것만 옮긴다 — 진짜 피부 관리사까지 끌어오면 안 된다.

UPDATE job_postings
   SET categories = array_replace(categories, '발관리 전문가', '발 관리사(풋케어)')
 WHERE '발관리 전문가' = ANY(categories);

UPDATE job_postings
   SET categories = array_replace(categories, '피부 관리사(일반·경락)', '발 관리사(풋케어)')
 WHERE '피부 관리사(일반·경락)' = ANY(categories)
   AND title ~ '발관리|발 관리|풋케어|내성발톱|굳은살|티눈';
