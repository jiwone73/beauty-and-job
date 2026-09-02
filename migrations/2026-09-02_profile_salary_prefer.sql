-- 희망급여.
--
-- 매장이 인재를 보고 제안할 때 가장 먼저 맞춰 봐야 하는 값인데 프로필에 칸이
-- 없었다. 공고와 같은 모양으로 둔다(원 단위 + 유형) — 그래야 「희망 급여와
-- 같아요」처럼 공고와 맞대어 볼 수 있다.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS salary_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS salary_min BIGINT;
