-- 보관은 상품마다 따로 쌓인다.
--
-- 칸을 하나만 두었더니 보관 중인 상품과 다른 상품을 보관할 자리가 없었다.
-- 라이트를 쓰다 스탠다드로 올리면 남은 라이트 기간이 갈 곳이 없고, 합치면
-- 먼저 세워 둔 것이 조용히 사라진다. 라이트에서 남은 것은 라이트로만 쓰므로
-- 애초에 상품마다 따로 세워 두는 것이 맞다.
--
--   kept = { "LIGHT": { "days": 20, "until": "2027-09-15" }, ... }

ALTER TABLE companies ADD COLUMN IF NOT EXISTS kept jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN companies.kept IS '상품별 보관 기간 {PLAN:{days,until}}. until 이 지난 칸은 없는 것으로 본다';

-- 옛 칸에 든 것을 옮긴다.
UPDATE companies
   SET kept = jsonb_build_object(
         kept_plan, jsonb_build_object('days', kept_days, 'until', to_char(kept_until, 'YYYY-MM-DD')))
 WHERE kept_plan IS NOT NULL AND kept_days > 0 AND kept_until IS NOT NULL
   AND kept = '{}'::jsonb;

ALTER TABLE companies
  DROP COLUMN IF EXISTS kept_days,
  DROP COLUMN IF EXISTS kept_plan,
  DROP COLUMN IF EXISTS kept_until;
