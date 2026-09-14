-- v_active_jobs 가 새 칸 셋을 보게 한다.
--
-- 뷰가 칼럼을 하나하나 적어 두는 형태라, 표에 칸을 더해도 목록 화면에는
-- 보이지 않는다. 게재 종료일로 거르고, 노출 등급으로 줄을 세우려면 뷰가
-- 그 값을 들고 나와야 한다.
--
-- 기존 칼럼의 이름·차례는 그대로 두고 뒤에만 붙인다(CREATE OR REPLACE 규칙).

CREATE OR REPLACE VIEW v_active_jobs AS
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
    jp.listed_until,
    jp.main_impressions,
    -- 유료 기간 밖이면 등급을 지워서 내보낸다. 부르는 쪽이 날짜를 또 견주지 않게.
    CASE WHEN c.paid_until IS NOT NULL AND c.paid_until >= CURRENT_DATE
         THEN c.plan END AS company_plan
   FROM job_postings jp
     LEFT JOIN companies c ON c.id = jp.company_id
     LEFT JOIN external_companies ec ON ec.id = jp.external_company_id
  WHERE jp.status = 'ACTIVE'::job_status
    AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE)
    -- 게재 기간이 끝난 공고는 목록에서 내린다. 대행(비회원) 공고는 비어 있어 그대로 남는다.
    AND (jp.listed_until IS NULL OR jp.listed_until >= CURRENT_DATE);
