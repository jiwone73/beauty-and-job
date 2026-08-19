export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, getAuth } from '@/lib/api'
import { hideContactsIn } from "@/lib/hideContacts"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const auth = getAuth(req)

  // 공고 + 기업 정보 조회
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

  if (jobRes.rowCount === 0) {
    return err('JOB_001', '공고를 찾을 수 없거나 마감되었습니다.', 404)
  }

  const job = jobRes.rows[0]
  // 외부에서 옮겨 온 공고인지 — 연락처·SNS 를 내려보낼지 가르는 기준
  const isExternalJob = job.source === 'EXTERNAL' || job.is_member === false
  // 회원 기업이 직접 올린 공고는 그대로 둔다 — 자기 연락처를 적을 자유가 있다.
  const hide = <T,>(v: T): T => (isExternalJob ? (hideContactsIn(v as any) as T) : v)

  // 조회수 +1 (비동기로 처리, 응답 지연 안 시킴)
  pool.query(
    'UPDATE job_postings SET view_count = view_count + 1 WHERE id = $1',
    [id]
  ).catch(e => console.error('[view_count update]', e))

  // 로그인 유저의 경우: 북마크 / 지원 여부 추가 조회
  let is_bookmarked = false
  let has_applied = false

  if (auth?.owner_type === 'user') {
    const [bookmarkRes, applyRes] = await Promise.all([
      pool.query(
        'SELECT id FROM bookmarks WHERE user_id = $1 AND job_posting_id = $2',
        [auth.sub, id]
      ),
      pool.query(
        'SELECT id FROM applications WHERE user_id = $1 AND job_posting_id = $2',
        [auth.sub, id]
      )
    ])
    is_bookmarked = (bookmarkRes.rowCount ?? 0) > 0
    has_applied = (applyRes.rowCount ?? 0) > 0
  }

  // 응답 구조 정리
  const response = {
    id: job.id,
    title: job.title,
    job_type: job.job_type,
    // 외부 공고는 본문에 매장 번호가 그대로 적혀 있다. 내려보내기 전에 가린다.
    description: hide(job.description),
    requirements: hide(job.requirements),
    preferred_qualifications: hide(job.preferred_qualifications),
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
    deadline: job.deadline,
    headcount: job.headcount,
    headcount_text: job.headcount_text || null, // 비회원 자유입력 모집인원 — 있으면 표시 우선
    gender_preference: job.gender_preference || '', // 성별우대(매장)
    categories: job.categories || [],
    detail_images: job.detail_images || [],
    hiring_process: job.hiring_process || [],
    // 비회원(외부에서 옮겨 온) 공고의 연락처는 구직자에게 내려보내지 않는다.
    // 화면에서 가려도 이 JSON 을 그대로 열어 보면 번호가 다 보이기 때문이다.
    // 지원은 뷰티워크를 거쳐야 매장에도 이력이 남고 우리도 성과를 안다.
    // (관리자 화면은 /api/admin/jobs 를 따로 쓰므로 대조에는 지장이 없다.)
    external_contact_name: isExternalJob ? '' : (job.external_contact_name || ''),
    external_contact_phone: isExternalJob ? '' : (job.external_contact_phone || ''),
    external_contact_email: isExternalJob ? '' : (job.external_contact_email || ''),
    contact_methods: job.contact_methods || [],
    notes: hide(job.notes) || '',
    responsibilities: hide(job.responsibilities) || '',
    work_days: job.work_days || '',
    work_time: job.work_time || '',
    work_period: job.work_period || '',
    work_time_slots: job.work_time_slots || '',
    benefits: job.benefits || '',
    benefit_tags: job.benefit_tags || [],
    view_count: job.view_count,
    application_count: job.application_count,
    created_at: job.created_at,
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
      company_phone: isExternalJob ? null : job.company_phone,
      logo_url: job.logo_url,
      cover_images: job.company_cover_images || [],
      company_type: job.company_type,
      industry: job.company_industry,
      description: job.company_description,
      // 매장 SNS(인스타 등)도 마찬가지다. 들어가 보면 DM·프로필에 번호가 있어
      // 연락처를 가린 뜻이 없어진다. 회원 기업의 홈페이지는 그대로 둔다.
      website_url: isExternalJob ? null : job.website_url,
      address: job.company_address,
      region_sido: job.company_region_sido,
      region_sigungu: job.company_region_sigungu,
      company_size: job.company_size,
      founded_year: job.founded_year,
      latitude: job.company_latitude,
      longitude: job.company_longitude
    },
    is_bookmarked,
    has_applied
  }

  return ok(response)
}
