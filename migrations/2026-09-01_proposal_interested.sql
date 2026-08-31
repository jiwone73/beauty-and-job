-- 제안에 「관심 있어요」 한 방향 응답을 더한다.
--
-- 수락/거절을 두지 않는 이유는 기존 코드에 적어 둔 그대로다 — 거절 통보는 좁은
-- 업계에서 서로에게 부담이고, 기업이 할 수 있는 일도 없다. 관심이 있으면 누르고,
-- 없으면 그냥 두면 된다. 기업에는 누른 사람만 보인다.
--
-- 이 값이 채워지면 기업이 그 사람의 연락처를 볼 수 있다. 구직자가 스스로 연 것이라
-- 먼저 전화를 받는 부담이 없다.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS interested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_proposals_interested
  ON proposals (company_id, interested_at DESC)
  WHERE interested_at IS NOT NULL;
