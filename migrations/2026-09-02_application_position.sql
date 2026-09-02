-- 어느 자리에 지원했는가.
--
-- 공고 하나에 모집부문이 넷이고 근무지가 둘이면, 「지원했다」만으로는 매장이
-- 무엇을 받았는지 알 수 없다. 지원 시점의 값을 글자로 박아 둔다 — 나중에
-- 공고를 고쳐도 그때 무엇을 보고 지원했는지가 남아야 한다.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS position_title text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS work_location  text;
