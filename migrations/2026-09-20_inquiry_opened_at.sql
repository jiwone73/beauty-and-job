-- 미답변 문의 — 열어서 읽었는데 아직 답을 안 한 것.
--
-- 신규문의(new)와 답변한 문의(done) 사이에 상태가 하나 더 필요했다. 열어 보긴
-- 했는데 손이 안 간 것과, 아직 펼쳐 보지도 않은 것을 구분해야 관리자가 놓치지
-- 않는다. 이건 임시저장(초안 글 저장)이 아니라 "읽은 시각"만 남기는 얕은
-- 표시라, 상태값(status)을 따로 늘리지 않고 시각 컬럼 하나로 뜻을 낸다:
--   opened_at 없음            → 신규문의(아직 안 열어봄)
--   opened_at 있음 · status=new → 미답변 문의(열어봤지만 답 안 함)
--   status=done                → 답변한 문의
ALTER TABLE ad_inquiries ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS opened_at timestamptz;
