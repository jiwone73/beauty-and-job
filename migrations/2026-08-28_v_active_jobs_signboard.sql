-- 목록 카드 썸네일에 매장 '프로필 사진'을 쓰기 위해 뷰에 컬럼 하나를 더한다.
--
-- 왜: 카드 썸네일이 배너 사진이었는데, 배너는 상세 페이지 상단에서 크게 보여
-- 주려고 받은 홍보 사진이라 목록에서 매장을 알아보게 하는 일과는 결이 다르다.
-- 프로필 사진(로고·간판)을 먼저 쓰고, 없으면 예전처럼 배너로 물러선다.
-- 이렇게 두면 매장이 프로필 사진을 올릴 이유도 분명해진다 — 32px 아바타가
-- 아니라 공고 목록에 나가는 얼굴이다.
--
-- CREATE OR REPLACE VIEW 는 맨 뒤에 컬럼을 더하는 것만 허용한다. 그래서
-- signboard_url 을 마지막에 붙인다.

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
    c.signboard_url
   FROM job_postings jp
     LEFT JOIN companies c ON c.id = jp.company_id
     LEFT JOIN external_companies ec ON ec.id = jp.external_company_id
  WHERE jp.status = 'ACTIVE'::job_status
    AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE);
