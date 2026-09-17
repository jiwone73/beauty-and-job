-- 무료 등록은 공고마다 한 번만 센다.
--
-- 여태는 ACTIVE 로 갈 때마다 세었다. 그래서 채용이 끝나 마감했다가 다시 열면
-- 횟수가 또 깎였다 — 사장님 쪽에서는 같은 공고인데 두 번 값을 치른 셈이다.
--
-- 공고에 「무료 칸을 이미 썼다」를 적어 둔다. 다시 열 때는 이 표시를 보고
-- 그냥 통과시킨다. 기업의 free_posts_used 는 그대로 둔다 — 공고를 지워도
-- 횟수가 되살아나면 안 되기 때문이다.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS free_slot boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN job_postings.free_slot IS '무료(스타트) 칸을 써서 걸린 적이 있는 공고';

-- 이미 걸린 적 있는 공고에 표시한다. 임시저장은 걸린 적이 없다.
UPDATE job_postings SET free_slot = true WHERE status <> 'DRAFT' AND free_slot = false;

CREATE INDEX IF NOT EXISTS idx_job_postings_free_slot ON job_postings (company_id) WHERE free_slot;
