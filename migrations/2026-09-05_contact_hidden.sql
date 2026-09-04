-- 담당자 정보는 칸마다 가릴 수 있다. 기업이 적어 두되 구직자에게 보일지는
-- 따로 고른다 — 연락처가 그대로 나가면 지원이 뷰티워크 밖에서 끝난다.
--
-- 가리는 쪽을 참으로 둔다(hidden). 기본은 가림 — 적어 둔 것이 실수로
-- 새어 나가는 쪽보다, 안 보여서 한 번 더 누르는 쪽이 낫다.
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS contact_name_hidden  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_phone_hidden boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_email_hidden boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_kakao_hidden boolean NOT NULL DEFAULT true;

-- 이미 올라와 있는 공고는 지금 보이던 대로 둔다. 어제까지 전화번호가 보이던
-- 공고가 오늘 갑자기 가려지면 그 공고로 지원하던 사람이 길을 잃는다.
UPDATE job_postings
   SET contact_name_hidden = false,
       contact_phone_hidden = false,
       contact_email_hidden = false,
       contact_kakao_hidden = false;
