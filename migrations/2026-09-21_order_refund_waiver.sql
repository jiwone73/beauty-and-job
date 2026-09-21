-- 환불 정책을 "원칙적 환불불가"로 좁히면서, 결제 전에 그 사실을 안내하고
-- 동의받았다는 기록을 남겨야 한다(전자상거래법상 청약철회 제한 요건).
ALTER TABLE company_orders ADD COLUMN IF NOT EXISTS refund_waiver_agreed_at TIMESTAMPTZ;
