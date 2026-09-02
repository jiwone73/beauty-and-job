-- 제안 거절.
--
-- 지금까지 구직자가 할 수 있는 건 「치우기」(hidden_at)뿐이었다. 그건 내 화면에서만
-- 사라지는 것이라, 기업 쪽 「보낸 제안」에는 계속 「읽음 · 답변 대기」로 남아 상대를
-- 기다리게 뒀다. 거절은 상대에게 전해져야 한다.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
