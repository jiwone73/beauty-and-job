import pool from '@/lib/db'

// 공고 상세 한 건을 읽어 화면이 쓰는 모양으로 정리한다.
// /api/jobs/[id] 와 서버에서 미리 그리는 /jobs/[id] 가 같은 값을 봐야 해서
// 한 곳에 둔다 — 두 벌로 두면 한쪽만 고쳐져 화면이 갈라진다.
// DATE 칸은 시각이 없다. 시간대를 태우지 않고 연-월-일만 적는다.
function 날짜꼴(d: any): string | null {
  if (!d) return null
  const t = d instanceof Date ? d : new Date(d)
  if (isNaN(t.getTime())) return null
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export async function 공고읽기(id: string) {
  const jobRes = await pool.query(
    `SELECT
       jp.*,
       c.id AS company_id,
       c.company_name,
       c.brand_name,
       c.representative_name,
       c.company_phone,
       c.logo_url, c.cover_images AS company_cover_images,
       c.company_type,
       c.industry AS company_industry,
       c.description AS company_description,
       c.website_url,
       c.address AS company_address,
       c.region_sido AS company_region_sido,
       c.region_sigungu AS company_region_sigungu,
       c.company_size,
       c.founded_year,
       c.latitude AS company_latitude,
       c.longitude AS company_longitude,
       c.is_member
     FROM job_postings jp
     LEFT JOIN companies c ON c.id = jp.company_id
     WHERE jp.id = $1 AND jp.status = 'ACTIVE'`,
    [id]
  )
  if (jobRes.rowCount === 0) return null

  const job = jobRes.rows[0]
  // 외부에서 옮겨 온 공고인지 — apply 라우트의 REDIRECT 분기 등에서 쓴다.
  const isExternalJob = job.source === 'EXTERNAL' || job.is_member === false

  return {
    id: job.id,
    title: job.title,
    job_type: job.job_type,
    description: job.description,
    requirements: job.requirements,
    preferred_qualifications: job.preferred_qualifications,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_type: job.salary_type,
    salary_text: job.salary_text || null, // 비회원 자유입력 급여 — 있으면 표시 우선
    positions: Array.isArray(job.positions) ? job.positions : [], // 모집부문 표(분야별 경력·급여·인원)
    location: job.location,
    address: job.address,
    work_type: job.work_type,
    employment_type: job.employment_type || '',
    experience_level: job.experience_level,
    education: job.education || '',
    // 날짜는 문자로 내보낸다. API 를 거치면 JSON 이 알아서 문자로 바꿔 주지만,
    // 서버에서 바로 화면으로 넘길 때는 Date 그대로라 '~Thu Oct 01' 처럼 찍혔다.
    // toISOString 은 UTC 로 옮겨서 한국 시간 자정이 전날이 된다 — 날짜 칸은
    // 시각이 없으니 있는 그대로 연-월-일만 적는다.
    deadline: 날짜꼴(job.deadline),
    headcount: job.headcount,
    headcount_text: job.headcount_text || null, // 비회원 자유입력 모집인원 — 있으면 표시 우선
    gender_preference: job.gender_preference || '', // 성별우대(매장)
    categories: job.categories || [],
    detail_images: job.detail_images || [],
    hiring_process: job.hiring_process || [],
    // 가린 칸은 아예 실어 보내지 않는다. 화면에서만 감추면 개발자 도구로 다
    // 보인다 — 기업이 「비공개」로 둔 번호가 그렇게 새면 안 된다.
    external_contact_name: job.contact_name_hidden ? '' : (job.external_contact_name || ''),
    external_contact_phone: job.contact_phone_hidden ? '' : (job.external_contact_phone || ''),
    external_contact_email: job.contact_email_hidden ? '' : (job.external_contact_email || ''),
    external_contact_kakao: job.contact_kakao_hidden ? '' : (job.external_contact_kakao || ''),
    // 등록 화면이 되읽을 때는 어느 칸을 가렸는지 알아야 체크가 그대로 선다.
    contact_name_hidden: !!job.contact_name_hidden,
    contact_phone_hidden: !!job.contact_phone_hidden,
    contact_email_hidden: !!job.contact_email_hidden,
    contact_kakao_hidden: !!job.contact_kakao_hidden,
    contact_methods: job.contact_methods || [],
    notes: job.notes || '',
    responsibilities: job.responsibilities || '',
    work_days: job.work_days || '',
    work_time: job.work_time || '',
    work_period: job.work_period || '',
    work_time_slots: job.work_time_slots || '',
    benefits: job.benefits || '',
    benefit_tags: job.benefit_tags || [],
    view_count: job.view_count,
    application_count: job.application_count,
    created_at: job.created_at ? new Date(job.created_at).toISOString() : null,
    source: job.source,
    is_external: isExternalJob,
    apply_method: job.apply_method,
    external_apply_url: job.external_apply_url,
    // 공고 전용 상단 이미지. null이면 기업정보의 커버를 쓴다(빈 배열은 '이 공고는 없음').
    cover_images: Array.isArray(job.cover_images) ? job.cover_images : null,
    company: {
      id: job.is_member === false ? null : job.company_id,
      company_name: job.company_name,
      brand_name: job.brand_name,
      representative_name: job.representative_name,
      company_phone: job.company_phone,
      logo_url: job.logo_url,
      cover_images: job.company_cover_images || [],
      company_type: job.company_type,
      industry: job.company_industry,
      description: job.company_description,
      website_url: job.website_url,
      address: job.company_address,
      region_sido: job.company_region_sido,
      region_sigungu: job.company_region_sigungu,
      company_size: job.company_size,
      founded_year: job.founded_year,
      latitude: job.company_latitude,
      longitude: job.company_longitude
    },
    is_bookmarked: false,
    has_applied: false,
  }
}
