-- 지원서 사본의 임시저장. 브라우저(localStorage)에만 두면 폰에서 쓰다 만 것을
-- PC에서 이어 쓸 수 없다 — 계정은 같은데 그릇이 다르면 못 찾는다.
--
-- 공고 하나에 사람 하나가 미리 지원한 사본은 하나뿐이라 (user_id, job_posting_id)
-- 를 키로 둔다. 지원을 마치면 이 행은 지운다 — 이미 낸 것은 applications.
-- resume_snapshot 이 갖고 있으므로, 남겨 두면 다음에 열 때 낸 사본이 초안인
-- 척 되살아난다.
CREATE TABLE IF NOT EXISTS application_drafts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  resume jsonb NOT NULL,
  cover_letter text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_posting_id)
);
