export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok } from '@/lib/api'
import { 플랜, type PlanId } from '@/lib/companyPlans'

// 화면 라벨은 '오피스'다. 예전에 쓰던 '본사'·'기업'도 그대로 받는다 —
// 밖에 나간 링크와 북마크가 조용히 안 걸리면 안 된다.
const TYPE_MAP: Record<string, string> = {
  "본사": "OFFICE",
  "오피스": "OFFICE",
  "기업": "OFFICE",
  "매장": "STORE",
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobType = searchParams.get('job_type')
  const location = searchParams.get('location')
  const type = searchParams.get('type')
  const sido = searchParams.get('sido')
  const sigungu = searchParams.get('sigungu')
  const regions = searchParams.get('regions')
  const q = searchParams.get('q')
  const active = searchParams.get('active')
  // 샘플 공고는 화면을 채우려고 만든 가짜다 — 메인처럼 몇 건만 보여주는 자리에서는 뺀다.
  const noSample = searchParams.get('nosample') === '1' 
  // 메인은 자리가 여럿이라 같은 공고가 두 번 뜨기 쉽다. 위 자리에 이미 뜬 것을
  // 빼고 고른다 — /api/jobs/recommended 가 쓰던 규칙과 같은 이름을 쓴다.
  const exclude = (searchParams.get('exclude') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 40)
  // 목록 화면의 상세 필터. 예전에는 100건을 받아 브라우저에서 걸렀는데, 진행 중
  // 공고가 189건이 되면서 89건은 애초에 걸러지지도 않았다(네일 10건 중 1건만 보임).
  const categories = (searchParams.get('categories') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 40)
  const benefits = (searchParams.get('benefits') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20)
  const career = searchParams.get('career') || ''
  const employment = searchParams.get('employment') || ''
  const salaryMin = parseInt(searchParams.get('salary_min') || '0')
  const brand = searchParams.get('brand') || ''
  const companyType = searchParams.get('company_type') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit
  // 메인 "채용속보"처럼 등급 상관없이 방금 올라온 공고 그대로 보여줄 때만 쓴다.
  const sortNew = searchParams.get('sort') === 'new'

  const where: string[] = []
  const params: any[] = []
  let idx = 1
  const prefix = active ? 'j.' : ''

  if (noSample) where.push(`${prefix}is_sample IS NOT TRUE`)

  if (jobType) {
    where.push(`${prefix}job_type = $${idx++}`)
    params.push(jobType)
  }
  if (location) {
    where.push(`${prefix}location ILIKE $${idx++}`)
    params.push(`%${location}%`)
  }
  if (type && TYPE_MAP[type]) {
    where.push(`${prefix}job_type = $${idx++}`)
    params.push(TYPE_MAP[type])
  }
  if (regions) {
    const list = regions.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length) {
      const ors = list.map((r) => {
        const keyword = r.endsWith(' 전체') ? r.replace(' 전체', '').slice(0, 2) : r.split(' ').pop()
        params.push(`%${keyword}%`)
        return `${prefix}location ILIKE $${idx++}`
      })
      where.push(`(${ors.join(' OR ')})`)
    }
  } else if (sigungu) {
    where.push(`${prefix}location ILIKE $${idx++}`)
    params.push(`%${sigungu}%`)
  } else if (sido) {
    where.push(`${prefix}location ILIKE $${idx++}`)
    params.push(`%${sido.slice(0, 2)}%`)
  }
  if (q) {
    const kw = `%${q}%`
    where.push(`(${prefix}title ILIKE $${idx} OR ${prefix}brand_name ILIKE $${idx + 1} OR ${prefix}company_name ILIKE $${idx + 2})`)
    params.push(kw, kw, kw)
    idx += 3
  }
  // 매장/본사. company_type 이 비어 있는 대행 공고는 job_type 으로 갈음한다.
  if (companyType === 'STORE' || companyType === 'OFFICE') {
    // 두 칸이 서로 다른 열거형이라 그대로 COALESCE 하면 형 변환에서 걸린다.
    where.push(`COALESCE(${prefix}company_type::text, ${prefix}job_type::text) = $${idx++}`)
    params.push(companyType)
  }
  if (categories.length) {
    // 하나라도 걸치면 나온다(화면의 직군 필터가 OR 다).
    where.push(`${prefix}categories && $${idx++}::text[]`)
    params.push(categories)
  }
  if (career === 'INTERN') {
    // 인턴은 공고 전체의 경력 등급(experience_level)이 아니라 모집부문 줄마다 적는 단계다
    // (인턴·신입·경력·실장). 어느 줄이든 인턴이면 걸린다.
    // 목록 뷰(v_active_jobs)에는 모집부문 열이 없어 원본 표에서 찾는다.
    where.push(`${prefix}id IN (SELECT jp_.id FROM job_postings jp_, jsonb_array_elements(COALESCE(jp_.positions, '[]'::jsonb)) AS pos WHERE pos->>'career' = '인턴')`)
  }
  if (career === 'NEW' || career === 'EXPERIENCED') {
    // 「경력무관」은 신입에게도 경력자에게도 열려 있으니 양쪽에 걸린다.
    where.push(`(${prefix}experience_level = $${idx} OR ${prefix}experience_level = 'ANY')`)
    params.push(career); idx += 1
  }
  if (employment) {
    // 공고 하나에 고용형태를 여럿 고를 수 있어 「정규직, 스페어」처럼 붙어 저장된다 —
    // 같은 값만 찾으면 「정규직」을 눌러도 그런 공고가 빠진다. 들어 있으면 걸리게 하고,
    // 옛 표기(알바·파트타임)도 아르바이트로 함께 찾는다.
    const 별칭: Record<string, string[]> = { '아르바이트': ['아르바이트', '알바', '파트타임'] }
    const 찾을말 = (별칭[employment] ?? [employment]).map((w) => `%${w}%`)
    where.push(`${prefix}employment_type ILIKE ANY($${idx++}::text[])`)
    params.push(찾을말)
  }
  if (benefits.length) {
    // 고른 것을 다 갖춘 공고만(화면의 복리후생 필터가 AND 다).
    where.push(`${prefix}benefit_tags @> $${idx++}::text[]`)
    params.push(benefits)
  }
  if (salaryMin > 0) {
    where.push(`${prefix}salary_min >= $${idx++}`)
    params.push(salaryMin)
  }
  if (brand) {
    where.push(`(${prefix}brand_name ILIKE $${idx} OR ${prefix}company_name ILIKE $${idx + 1})`)
    params.push(`%${brand}%`, `%${brand}%`); idx += 2
  }
  if (exclude.length) {
    const prefix = active ? 'j.' : ''
    where.push(`NOT (${prefix}id = ANY($${idx}::uuid[]))`)
    params.push(exclude)
    idx += 1
  }
  // 마감 지난 공고는 v_active_jobs 가 이미 걸러 낸다. 예전에는 여기서 마감일이
  // 있어야 한다는 조건을 더해, 상시채용 공고를 전부 떨어뜨렸다 — 메인의
  // '지금 적극 채용 중'이 208건 중 4건만 보고 있었다.

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // 샘플은 가짜라 진짜 공고 뒤에 세운다.
  const activeOrderBy = `j.is_sample NULLS FIRST, j.created_at DESC`
  // 유료로 산 자리. 프리미엄이 최상단, 스탠다드가 그 아래, 나머지는 그 밑이다.
  // 예전에 여기 있던 is_featured 는 아무 데서도 켜 주지 않는 죽은 칸이었다.
  const 노출등급 = (a = '') =>
    `CASE ${a}company_plan ` +
    (Object.keys(플랜) as PlanId[]).map((p) => `WHEN '${p}' THEN ${플랜[p].노출순위} `).join('') +
    `ELSE 0 END DESC`
  /**
   * 같은 구간(상품) 안에서 줄 세우는 법 — **기업이 마지막으로 들어온 날**이다.
   *
   * 헤어인잡이 쓰는 방식이다. 이용안내에 「채용정보 게시판의 노출순서는 접속일
   * 순서입니다. 로그인을 하지 않을 경우 구인광고가 후순위로 밀려서 노출이
   * 되지 않습니다」라고 대놓고 적어 두었고, 유료 상품마다 「접속일 오늘 날짜로
   * 업데이트」를 혜택으로 판다.
   *
   * 이 규칙이 하는 일은 **살아 있는 공고를 위로 올리는 것**이다. 채용이 끝났는데
   * 안 내린 공고는 사장님이 안 들어오니 저절로 가라앉는다. 목록을 손으로
   * 치우지 않아도 최근 것으로 채워진다.
   *
   * 로그인한 적 없는 곳(우리가 모아 온 공고)은 접속일이 없어 등록일로 갈음한다.
   * 그러지 않으면 그것들이 전부 맨 뒤에 무더기로 몰린다.
   *
   * 마감일이 빠른 공고를 먼저 세우던 규칙을 이걸로 갈았다. 마감이 급한 자리를
   * 앞에 두는 것도 말이 되지만, 그러면 **공고를 걸어 두고 아무것도 안 하는 곳이
   * 계속 위에 선다.** 자리를 파는 이상 움직이는 쪽이 위에 서야 한다.
   */
  const 같은구간 = (a = '') =>
    `COALESCE((SELECT c_.last_login_at FROM companies c_ WHERE c_.id = ${a}company_id), ${a}created_at) DESC NULLS LAST, ` +
    `md5(${a}id::text || CURRENT_DATE::text)`

  const listQuery = active ? `
    SELECT j.id, j.title, j.job_type, j.company_id, j.company_name, j.brand_name, j.logo_url, j.cover_images, j.signboard_url, j.company_type,
           j.location, j.work_type, j.employment_type, j.salary_min, j.salary_max, j.salary_type,
           j.experience_level, j.is_featured, j.deadline, j.created_at, j.categories, j.benefit_tags,
           j.company_plan
    FROM v_active_jobs j
    LEFT JOIN (
      SELECT
        job_posting_id,
        COUNT(*) AS total_apps,
        COUNT(viewed_at) AS viewed_apps,
        CASE WHEN COUNT(*) > 0
          THEN COUNT(viewed_at)::float / COUNT(*)
          ELSE 0.5
        END AS view_rate
      FROM applications
      GROUP BY job_posting_id
    ) app_stats ON app_stats.job_posting_id = j.id
    ${whereClause}
    ORDER BY ${activeOrderBy}
    LIMIT $${idx++} OFFSET $${idx++}
  ` : `
    SELECT id, title, job_type, company_id, company_name, brand_name, logo_url, cover_images, signboard_url, company_type,
           location, work_type, employment_type, salary_min, salary_max, salary_type,
           experience_level, is_featured, deadline, created_at, categories, benefit_tags,
           company_plan
    FROM v_active_jobs
    ${whereClause}
    ORDER BY ${sortNew ? "is_sample NULLS FIRST, created_at DESC" : `is_sample NULLS FIRST, ${노출등급()}, ${같은구간()}`}
    LIMIT $${idx++} OFFSET $${idx++}
  `

  params.push(limit, offset)
  const countQuery = active
    ? `SELECT COUNT(*)::int AS total FROM v_active_jobs j ${whereClause}`
    : `SELECT COUNT(*)::int AS total FROM v_active_jobs ${whereClause}`
  const countParams = params.slice(0, params.length - 2)

  const [listRes, countRes] = await Promise.all([
    pool.query(listQuery, params),
    pool.query(countQuery, countParams)
  ])

  return ok(listRes.rows, 200, {
    page,
    limit,
    total: countRes.rows[0].total
  })
}