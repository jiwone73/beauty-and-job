-- 이력서: 신입 지원자의 '직무와 연관된 경험' 서술 필드
-- Supabase SQL Editor에서 실행. (멱등)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS entry_experience text NOT NULL DEFAULT '';
