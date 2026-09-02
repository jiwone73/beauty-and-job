-- 유료 회원 기간.
--
-- 인재의 개인정보(이름·연락처·사진·자소서·재직 매장)를 여는 문이자 면접 제안을
-- 보낼 수 있게 하는 문이다. 등급을 따로 두지 않는다 — 날짜 하나면 기간이
-- 지나는 순간 저절로 무료로 떨어지고, 결제가 붙으면 이 날짜만 밀어 주면 된다.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS paid_until date;

-- 이미 쓰고 있던 기업은 그대로 쓰게 둔다. 결제를 아직 안 받는데 오늘부터
-- 잠그면, 어제까지 되던 일이 안내도 없이 안 되는 것이 된다.
UPDATE companies SET paid_until = DATE '2027-12-31'
 WHERE paid_until IS NULL AND is_member = true;
