-- 키핑 — 채용이 끝나면 남은 기간을 보관했다가 다음 채용 때 쓴다.
--
-- 미용실 채용은 상시가 아니라 띄엄띄엄 터진다. 30일권을 샀는데 열흘 만에
-- 사람을 뽑으면 남은 스무 날은 그냥 타 버리고, 그것이 곧 환불 요청으로 온다.
-- 남은 기간을 세워 뒀다가 다음에 쓰게 하면 그 요청이 다음 구매로 바뀐다.
--
-- 일수만 저장하면 라이트에서 보관한 스무 날로 프리미엄 스무 날을 공짜로 쓰는
-- 구멍이 생긴다. 그래서 「어느 플랜에서 보관한 며칠인가」를 함께 적고, 쓸 때
-- 하루 값 비율로 환산한다(lib/companyPlans.ts 의 보관환산).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS kept_days  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kept_plan  TEXT,
  ADD COLUMN IF NOT EXISTS kept_until DATE;

COMMENT ON COLUMN companies.kept_days  IS '보관해 둔 남은 일수. kept_plan 기준';
COMMENT ON COLUMN companies.kept_plan  IS '그 일수를 보관한 플랜. 다른 플랜에서 쓸 때 값 비율로 환산한다';
COMMENT ON COLUMN companies.kept_until IS '보관 만료일(보관한 날 + 1년). 이 날이 지나면 소멸';

-- 영수증에 「보관분 며칠을 얹었는가」가 남아야 한다. 안 남기면 왜 30일권인데
-- 45일이 붙었는지 나중에 아무도 설명하지 못한다.
ALTER TABLE company_orders
  ADD COLUMN IF NOT EXISTS kept_days INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN company_orders.kept_days IS '이 주문에 얹힌 보관 일수(환산 후)';
