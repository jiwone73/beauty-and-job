-- 공고에만 있던 연락처를 업체 행으로 옮긴다.
--
-- 외부 공고 157건 중 148건의 번호가 job_postings.external_contact_phone 한 곳에만
-- 있었다. 알바가 공고에서 번호를 지우면 그 업체에 연락할 길이 사라진다 —
-- 「나중에 그 번호로 연락해 회원가입을 권한다」는 뜻이 공고 하나에 매달려 있었다.
-- 업체 행은 지점마다 따로라(「리안헤어 녹양역점」) 지점 번호가 지점에 남는다.
UPDATE companies c
   SET phone = (SELECT j.external_contact_phone FROM job_postings j
                 WHERE j.company_id = c.id AND COALESCE(j.external_contact_phone,'') <> ''
                 ORDER BY j.created_at LIMIT 1),
       updated_at = now()
 WHERE c.is_member = false AND COALESCE(c.phone,'') = ''
   AND EXISTS (SELECT 1 FROM job_postings j WHERE j.company_id = c.id AND COALESCE(j.external_contact_phone,'') <> '');

UPDATE companies c
   SET email = (SELECT j.external_contact_email FROM job_postings j
                 WHERE j.company_id = c.id AND COALESCE(j.external_contact_email,'') <> ''
                 ORDER BY j.created_at LIMIT 1)::citext,
       updated_at = now()
 WHERE c.is_member = false AND c.email IS NULL
   AND EXISTS (SELECT 1 FROM job_postings j WHERE j.company_id = c.id AND COALESCE(j.external_contact_email,'') <> '');
