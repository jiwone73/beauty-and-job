-- 외부공고 불러오기 — 소스에서 받아 둔 공고를 담는 표
--
-- 목록에는 연락처가 없다. 상세를 받아야 알 수 있는데, 화면을 열 때마다 수십 건씩
-- 받으면 느리고 남의 사이트에도 무리다. 그래서 한 번 받은 것은 여기 둔다.
-- 「업데이트」는 목록을 다시 받아, 없던 것만 상세를 읽고, 목록에서 사라진 것은
-- 마감으로 적는다.
--
-- 이 표는 우리 공고가 아니다. 알바가 보고 고르는 「받은 것」일 뿐이고,
-- 실제 공고는 여기서 골라 job_postings 로 간다.

CREATE TABLE IF NOT EXISTS external_job_inbox (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,                 -- hairinjob | selectme | work24
  source_key    text NOT NULL,                 -- 그 사이트가 쓰는 공고 번호
  url           text NOT NULL UNIQUE,          -- 원문 주소. job_postings.source_url 과 맞춰 본다
  title         text NOT NULL,
  company_name  text,
  region        text,
  salary        text,
  -- 연락처가 없으면 지원서를 전달할 길이 없다. 목록에서 거르는 근거가 된다.
  contact_phone text,
  contact_email text,
  categories    text[] DEFAULT '{}',           -- 우리 직군으로 옮긴 것. 비면 뷰티가 아니다
  parsed        jsonb,                         -- 파서가 읽은 값 전부(폼으로 넘길 때 쓴다)
  first_seen    timestamptz NOT NULL DEFAULT now(),
  last_seen     timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,                   -- 목록에서 사라진 때(= 마감)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eji_source     ON external_job_inbox (source, closed_at, first_seen DESC);
CREATE INDEX IF NOT EXISTS idx_eji_source_key ON external_job_inbox (source, source_key);
