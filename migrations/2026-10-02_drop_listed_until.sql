-- 게재기간(listed_until)을 없앤다. 공고가 노출되는지는 이제 둘로만 정한다 --
-- 회사가 마감했는가(status), 공고 자체 마감일이 지났는가(deadline). 유료
-- 이용권이 끝났다고 노출이 사라지는 게 아니라 스타트(회원전용) 대우로
-- 돌아갈 뿐이고, 그건 v_active_jobs의 company_plan이 그때그때 다시 계산해
-- 이미 하고 있던 일이다.
--
-- listed_until을 등록 시점에 박아 두는 값으로 따로 뒀던 탓에, 회사가 결제
-- 승인 경로를 안 거치고 plan/paid_until만 바뀌면(관리자 보정 등) listed_until
-- 만 옛날 값으로 남아 "이용권은 살아있는데 노출종료로 보이는" 어긋남이
-- 생겼다. 칸을 없애면 이 어긋남 자체가 생길 수 없다
-- ("게제기간은 없고 공고 마감일하고 이용기간이 있겠지", 2026-10-02).
--
-- 컬럼 순서 중간의 listed_until을 빼야 해서 CREATE OR REPLACE로는 안 되고
-- 뷰를 다시 만들어야 한다.
DROP VIEW IF EXISTS v_active_jobs;

CREATE VIEW v_active_jobs AS
SELECT jp.id,
    jp.company_id,
    jp.title,
    jp.job_type,
    jp.job_category_id,
    jp.description,
    jp.requirements,
    jp.preferred_qualifications,
    jp.salary_min,
    jp.salary_max,
    jp.salary_type,
    jp.location,
    jp.address,
    jp.work_type,
    jp.experience_level,
    jp.deadline,
    jp.is_featured,
    jp.featured_until,
    jp.status,
    jp.view_count,
    jp.application_count,
    jp.closed_at,
    jp.created_at,
    jp.updated_at,
    COALESCE(c.company_name, ec.name::character varying) AS company_name,
    c.brand_name,
    COALESCE(c.logo_url, ec.logo_url) AS logo_url,
    c.company_type,
    jp.categories,
    jp.employment_type,
    jp.benefit_tags,
    c.cover_images,
    c.signboard_url,
    jp.is_sample,
    jp.main_impressions,
    CASE
        WHEN c.paid_until IS NOT NULL AND c.paid_until >= CURRENT_DATE THEN c.plan
        ELSE NULL::text
    END AS company_plan
FROM job_postings jp
LEFT JOIN companies c ON c.id = jp.company_id
LEFT JOIN external_companies ec ON ec.id = jp.external_company_id
WHERE jp.status = 'ACTIVE'::job_status AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE);

ALTER TABLE job_postings DROP COLUMN IF EXISTS listed_until;
ALTER TABLE job_postings DROP COLUMN IF EXISTS exposure_notified_at;
