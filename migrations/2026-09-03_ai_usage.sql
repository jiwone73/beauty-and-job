-- AI 를 하루에 몇 번 썼나.
--
-- 건당 요금은 몇 원이라 아깝지 않지만, 마음에 들 때까지 계속 돌리는 사람이
-- 하나만 있어도 그 사람이 요금을 정한다. 값이 아니라 횟수가 비용을 정한다.
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     date  NOT NULL,
  kind    text  NOT NULL,
  count   int   NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
