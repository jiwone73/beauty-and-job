-- 공개 목록에서 샘플 공고를 뒤로 보내고 메인에서는 빼려면 화면 쪽이 샘플 여부를
-- 알아야 한다. 뷰에 is_sample 을 덧붙인다(뒤에 붙이는 것만 CREATE OR REPLACE 가 받는다).

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
    jp.is_sample
   FROM job_postings jp
     LEFT JOIN companies c ON c.id = jp.company_id
     LEFT JOIN external_companies ec ON ec.id = jp.external_company_id
  WHERE jp.status = 'ACTIVE'::job_status AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE);
