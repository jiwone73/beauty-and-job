-- 접수담당자(external_contact_*) 를 구직자에게 보일지 기업이 고른다.
-- 기존 공고는 지금까지 보이고 있었으므로 true 로 둔다(동작이 갑자기 바뀌지 않게).
-- 비회원(관리자 대행) 공고는 이 값과 무관하게 계속 가린다 — /api/jobs/[id] 참조.
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS contact_public boolean NOT NULL DEFAULT true;
