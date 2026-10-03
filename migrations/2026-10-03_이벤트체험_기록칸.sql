-- 이벤트 무료 체험 + 활동 기록 (1단계).
--  · companies.plan_source: 이용권이 어디서 왔는가. 'EVENT' = 이벤트 무료 체험, 'PURCHASE' = 구매, NULL = 없음.
--    같은 프리미엄이라도 이벤트로 받은 것과 산 것을 가른다 — 유료화 때 이벤트 쪽만 정리하고 구매는 건드리지 않으려고.
--  · activity_events: 노출 순서(가산점)를 매길 재료. 소급해서 만들 수 없는 데이터라 지금부터 쌓는다.
--    점수는 3단계에서 켠다. 여기서는 기록만 한다.
BEGIN;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_source text;

CREATE TABLE IF NOT EXISTS activity_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  text NOT NULL CHECK (actor_type IN ('company', 'user')),
  actor_id    uuid NOT NULL,
  kind        text NOT NULL,
  ref_id      uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- 한국 날짜. 「며칠에 걸쳐 했나」「하루 몇 건」을 셀 때 쓴다.
  day         date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Seoul')::date)
);
CREATE INDEX IF NOT EXISTS idx_activity_actor_kind ON activity_events (actor_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_kind_day ON activity_events (kind, day);
-- 하루에 한 번만 남기는 종류(LOGIN_DAY)가 겹치지 않게
CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_login_day ON activity_events (actor_id, day) WHERE kind = 'LOGIN_DAY';

COMMIT;
