-- 인재 추천은 구직자에게 먼저 관심 여부를 물은 뒤에만 기업에 알린다
-- ("관심여부만 묻는 예 아니오로 정리하자"). 기존 TALENT_MATCH는 쓰지 않던
-- enum 값이라 지우는 대신 그대로 두고, 새 값 둘을 추가한다.
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'TALENT_MATCH_ASK';
ALTER TYPE notif_type ADD VALUE IF NOT EXISTS 'TALENT_INTEREST';

-- 공고 하나·인재 하나 조합마다 한 번만 묻는다.
CREATE TABLE IF NOT EXISTS talent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INTERESTED', 'DECLINED')),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  notified_company_at timestamptz,
  UNIQUE (company_id, job_posting_id, user_id)
);
