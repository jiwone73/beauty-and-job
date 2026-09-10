-- 케이스를 언제 돌렸고 어떻게 됐나
--
-- 리포트는 「어긋난 것」만 쌓인다. 그것만으로는 "아직 안 해본 것"과 "해봤는데
-- 멀쩡한 것"을 가를 수 없어, 오픈까지 어디가 남았는지 셀 수가 없다.
-- 케이스마다 마지막 결과를 여기 한 줄로 남긴다.

CREATE TABLE IF NOT EXISTS test_case_runs (
  case_id   text PRIMARY KEY,
  area      text NOT NULL,
  result    text NOT NULL,            -- pass | fail | blocked
  note      text,
  report_id uuid,                     -- fail 이면 어느 리포트로 올렸나
  ran_at    timestamptz NOT NULL DEFAULT now()
);
