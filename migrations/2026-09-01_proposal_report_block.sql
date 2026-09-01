-- 대화방의 신고·차단.
--
-- 신고는 community_reports 를 쓰지 않는다 — 그쪽은 글쓴이(구직자)만 신고할 수 있는
-- 모양이라 매장이 신고할 자리가 없다. 대화는 양쪽이 다 신고할 수 있어야 한다.
CREATE TABLE IF NOT EXISTS proposal_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  -- 누가 신고했나. 제안 한 건에 둘뿐이라 이름만으로 상대가 정해진다.
  reporter    TEXT NOT NULL CHECK (reporter IN ('USER', 'COMPANY')),
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_reports_new
  ON proposal_reports (created_at DESC);

-- 차단은 이미 있는 user_company_blocks 를 그대로 쓴다. 다만 지금까지는 구직자가
-- 매장을 가리는 용도뿐이었다. 매장도 차단할 수 있어야 해서 누가 걸었는지만 남긴다.
-- 효과는 어느 쪽이 걸든 같다 — 서로 보이지 않고 말도 오가지 않는다.
ALTER TABLE user_company_blocks
  ADD COLUMN IF NOT EXISTS blocked_by TEXT NOT NULL DEFAULT 'USER'
  CHECK (blocked_by IN ('USER', 'COMPANY'));
