-- 제안 스레드 위의 대화.
--
-- 새 '채팅' 기능을 따로 세우지 않는다. 매장이 제안을 보내고 구직자가 「관심 있어요」로
-- 답하는 실이 이미 있고, 끊긴 것은 그다음 답장 하나뿐이었다. 그 실을 이어 준다.
--
-- 대화의 목적지는 열린 잡담이 아니라 '언제 와서 보실래요'다(셀렉미도 대화하기 다음
-- 단계를 약속잡기로 못 박아 두었다). 그래서 약속을 따로 만들지 않고 같은 줄에
-- 섞는다 — 스레드 하나만 읽으면 무슨 말이 오갔고 언제 만나기로 했는지 다 보인다.

CREATE TABLE IF NOT EXISTS proposal_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  -- 누가 썼나. 제안 한 건에 매장과 구직자 둘뿐이라 이름만으로 갈린다.
  sender       TEXT NOT NULL CHECK (sender IN ('USER', 'COMPANY')),
  -- TEXT: 그냥 한마디 / APPOINTMENT: 면접 약속 제안
  kind         TEXT NOT NULL DEFAULT 'TEXT' CHECK (kind IN ('TEXT', 'APPOINTMENT')),
  body         TEXT,
  -- 약속일 때만 채운다.
  appointment_at     TIMESTAMPTZ,
  appointment_status TEXT CHECK (appointment_status IN ('PROPOSED', 'ACCEPTED', 'DECLINED')),
  -- 상대가 읽은 시각. 구직자에게는 보여주지 않는다 — 읽고 답 안 한 것이
  -- 드러나면 서로 감정만 상한다. 매장 쪽 '답 안 한 문의'를 세는 데 쓴다.
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_messages_thread
  ON proposal_messages (proposal_id, created_at);

-- 스레드 목록을 시간순으로 세울 때 메시지를 매번 훑지 않도록 제안에 얹어 둔다.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
