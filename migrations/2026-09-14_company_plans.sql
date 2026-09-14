-- 기업 유료 상품 — 날짜 하나(paid_until)로 보던 것에 등급을 더한다.
--
-- 등급이 필요해진 까닭은 라이트·스탠다드·프리미엄이 인재 열람과 노출에서
-- 갈리기 때문이다. 유료 여부 자체는 그대로 paid_until 하나로 본다.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan text;

-- 이미 유료로 열어 둔 곳(2027-12-31 넣어 둔 65곳)은 스탠다드로 본다.
-- 어제까지 인재를 보던 곳이 안내 없이 막히면 안 된다.
UPDATE companies SET plan = 'STANDARD' WHERE plan IS NULL AND paid_until IS NOT NULL;

-- 공고 게재 종료일. 기존 deadline 은 사장님이 정한 채용 마감일이라 다른 것이다.
--   무료: 등록일 + 7일 / 유료: 이용권 만료일 / 대행(비회원) 공고: 비워 둔다
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS listed_until date;

-- 메인 채용관 노출 횟수. 롤링 차례를 정하는 근거이자 기업 대시보드에 보여줄 숫자다.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS main_impressions bigint NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS job_postings_main_impressions_idx ON job_postings (main_impressions);

-- 주문. 결제 모듈이 붙기 전에는 무통장입금이라 「입금을 확인했는가」가 곧 상태다.
-- PG 가 붙어도 이 표를 그대로 쓰고 결제수단 칸만 는다.
CREATE TABLE IF NOT EXISTS company_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan          text NOT NULL,               -- LIGHT | STANDARD | PREMIUM
  days          int  NOT NULL,               -- 7 | 15 | 30 | 45 | 60
  amount        int  NOT NULL,               -- 원, 부가세 포함
  status        text NOT NULL DEFAULT 'PENDING',  -- PENDING | PAID | CANCELED
  depositor     text,                        -- 입금자명
  applied_from  date,                        -- 입금 확인 때 기록한다
  applied_until date,
  confirmed_at  timestamptz,
  canceled_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_orders_company_idx ON company_orders (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS company_orders_status_idx  ON company_orders (status, created_at DESC);

-- 판매 개시 스위치. 통신판매업 신고번호가 나오기 전에는 꺼 둔다.
INSERT INTO app_settings (key, value, updated_at) VALUES ('plan_sales', 'off', now())
  ON CONFLICT (key) DO NOTHING;
