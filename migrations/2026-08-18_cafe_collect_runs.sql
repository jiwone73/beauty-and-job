-- 카페 글 수집이 언제 돌았고 몇 건이 들어왔는지.
--
-- 하루 여러 번 돌리면 "크론이 조용히 죽어 있어도 모른다"는 게 문제가 된다.
-- 마지막 수집 시각을 화면에 띄우려면 기록이 남아야 한다.
CREATE TABLE IF NOT EXISTS cafe_collect_runs (
  id       bigserial PRIMARY KEY,
  ran_at   timestamptz NOT NULL DEFAULT now(),
  found    int NOT NULL DEFAULT 0,   -- 조회된 글(중복 제거 후)
  added    int NOT NULL DEFAULT 0,   -- 그중 새로 저장된 글
  source   text NOT NULL DEFAULT 'cron'  -- cron | manual
);
CREATE INDEX IF NOT EXISTS idx_cafe_collect_runs_at ON cafe_collect_runs (ran_at DESC);
