-- 채용공고: 접수방법 (문자 / 이메일 / 전화 / 온라인 지원) — 복수 선택 가능
-- Supabase SQL Editor에서 실행. (멱등)
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS contact_methods text[] NOT NULL DEFAULT '{}';
