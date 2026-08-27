-- 인재검색에서 기업이 후보자에게 보낸 채용공고 제안.
--
-- 왜 따로 두나: 처음에는 알림(notifications) 한 줄로만 남겼는데, 알림은
-- 구직자가 지울 수 있고(전체 삭제 버튼이 있다) 보낸 기업이 본문 글자에만
-- 들어 있어 "누가 누구에게 보냈나"를 구조적으로 꺼낼 수 없었다. 제안은
-- 받은 사람이 나중에 다시 찾아보는 기록이고, 기업에게는 성과 지표이며,
-- 유료 상품을 만들 때 가격 근거가 된다 — 알림과 수명이 다르다.
--
-- 알림은 그대로 함께 남긴다(알림은 '지금 알려주는 일', 여기는 '남는 기록').

CREATE TABLE IF NOT EXISTS proposals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  message        text NOT NULL DEFAULT '',
  read_at        timestamptz,              -- 구직자가 열어본 시각(제안→열람 전환)
  hidden_at      timestamptz,              -- 구직자가 목록에서 치운 시각. 기업에는 알리지 않는다
  created_at     timestamptz NOT NULL DEFAULT NOW()
);

-- 받은 제안 목록(구직자) — 치운 것 빼고 최신순
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals (user_id, created_at DESC);
-- 보낸 제안 성과(기업) + 중복 제안 확인
CREATE INDEX IF NOT EXISTS idx_proposals_company ON proposals (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_company_user ON proposals (company_id, user_id);
