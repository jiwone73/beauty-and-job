-- 테스트 리포트 — 시험하다 나온 것을 한 자리에 모은다
--
-- 그동안 공고 불러오기 이슈만 app_notes 에 「원문주소 + 한 줄 메모」로 쌓았다.
-- 시험은 공고등록 말고도 지원·회원가입·기업 공고관리에서 나는데 적을 자리가 없었고,
-- 무엇보다 「고칠 방법이 둘인데 어느 쪽이냐」를 물을 자리가 없었다.
--
-- 규칙 하나: 고칠 길이 하나뿐이면 고치고 done 으로 올린다. 갈래가 둘 이상이면
-- 손대지 않고 open 으로 올려 사람이 고르게 한다.

CREATE TABLE IF NOT EXISTS test_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     text,                       -- 어느 케이스에서 나왔나 (TC-공고-014). 없으면 그때그때 발견
  area        text NOT NULL,              -- 공고등록 | 지원 | 회원가입 | 기업공고관리 | 그밖
  title       text NOT NULL,
  severity    text NOT NULL DEFAULT '정해야 함',  -- 막힘 | 정해야 함 | 알림
  status      text NOT NULL DEFAULT 'open',      -- open | done | wontfix
  -- 이렇게 하면 나온다 / 이래야 한다 / 이렇게 됐다
  steps       text,
  expected    text,
  actual      text,
  -- 갈래가 둘 이상일 때 고를 것. [{ "text": "...", "recommend": true }]
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  decided_by  text,                        -- admin | alba — 누가 정할 일인가
  decision    text,                        -- 고른 것(사람이 누른 뒤 채워진다)
  decided_at  timestamptz,
  ref_url     text,                        -- 그 공고 원문 주소나 화면 주소
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_reports_area ON test_reports (area);
