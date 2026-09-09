-- 제안에 두 가지를 더한다.
--
-- position_index — 어느 자리로 제안한 것인가.
--   공고 하나에 모집분야가 여럿일 수 있는데(신입 한 자리, 경력 한 자리) 지금은
--   공고만 가리켜서 구직자가 어느 자리를 제안받은 것인지 알 수 없었다.
--   job_postings.positions 배열의 자리번호를 담는다.
--
-- canceled_at — 기업이 제안을 거둬들인 시각.
--   잘못 보냈거나 이미 다른 사람을 뽑았을 때 거둘 방법이 없었다. 수락 전에만
--   누를 수 있다 — 대화가 시작된 뒤에 소리 없이 사라지면 구직자가 영문을 모른다.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS position_index INT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

COMMENT ON COLUMN proposals.position_index IS
  'job_postings.positions 배열에서 제안한 자리의 번호(0부터). 옛 제안은 비어 있다.';
COMMENT ON COLUMN proposals.canceled_at IS
  '기업이 제안을 거둔 시각. 수락 전에만 가능.';
