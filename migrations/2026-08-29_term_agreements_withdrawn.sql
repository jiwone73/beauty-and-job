-- 선택 약관(마케팅·추천 알림)은 나중에 철회할 수 있어야 한다(정보통신망법).
-- 지운 기록으로 남기지 않고 철회 시각을 적어 둔다 — 언제 동의했고 언제 껐는지가 증빙이다.
ALTER TABLE term_agreements
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
