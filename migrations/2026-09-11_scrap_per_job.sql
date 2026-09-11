-- 스크랩을 공고별로 담는다.
--
-- 스크랩 인재 화면 왼쪽에 공고 목록이 서면서, 공고를 누르면 그 공고로 담은 사람만
-- 보여야 짜임이 맞는다(사람인 「후보자 저장」도 공고를 골라 담는다). 그런데 스크랩은
-- 사람만 담고 있어 거를 기준이 없었다. 어느 공고로 담았는지를 한 칸 더 둔다.
--
-- 같은 사람을 여러 공고에 담을 수 있어야 하므로 (기업, 사람) 유일 조건을
-- (기업, 사람, 공고) 로 바꾼다. 공고 없이 담은 것(NULL)도 한 번만 — NULLS NOT DISTINCT.
-- 지금까지 담은 3건은 공고가 비어 「공고 없이 담은 사람」이 된다(값을 바꾸는 행 없음).
-- 공고를 지우면 그 공고로 담은 것도 함께 지운다(딸린 것 정리).

ALTER TABLE company_talent_scraps
  ADD COLUMN IF NOT EXISTS job_posting_id uuid REFERENCES job_postings(id) ON DELETE CASCADE;

ALTER TABLE company_talent_scraps
  DROP CONSTRAINT IF EXISTS company_talent_scraps_company_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS company_talent_scraps_company_user_job_key
  ON company_talent_scraps (company_id, user_id, job_posting_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_company_talent_scraps_job ON company_talent_scraps (job_posting_id);
