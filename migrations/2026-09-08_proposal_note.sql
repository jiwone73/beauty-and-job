-- 제안에 매장이 적는 한 줄 메모.
--
-- 지원자 카드에는 이미 있다("통화함", "화요일 3시 면접"). 제안관리 표에도 같은
-- 자리가 필요하다 — 남을 위한 상태값과 달리 자기가 나중에 보려고 적는 것이라
-- 실제로 쓰인다.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS note TEXT;
