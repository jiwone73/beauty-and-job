-- 지원방법에 카카오톡을 더한다. 매장은 전화보다 카톡으로 받는 곳이 많다.
-- 전화·이메일과 같은 자리(담당자 정보)에 카카오톡 ID 를 받는다.
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS external_contact_kakao TEXT;
