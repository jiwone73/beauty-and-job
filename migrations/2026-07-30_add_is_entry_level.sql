-- 이력서: 신입(경력 없음) 여부 플래그
-- Supabase SQL Editor에서 실행. (멱등)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_entry_level boolean NOT NULL DEFAULT false;
