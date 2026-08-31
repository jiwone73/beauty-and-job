-- 「관심 있어요」에 한마디를 붙일 수 있게 한다.
--
-- 관심은 대개 조건부다 — "주 4일 가능한가요", "급여는 협의되나요" 같은 것을
-- 물어야 다음 통화가 짧아진다. 채팅을 열지 않고도 그 한마디는 담을 수 있다.
-- 선택이다. 안 적고 보내도 관심은 전해진다.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS interest_message TEXT;
