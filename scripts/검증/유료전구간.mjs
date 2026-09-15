// 유료서비스 전 구간 검증 — 주문 → 입금 확인 → 채용관 노출 → 만료.
// 실제 서울 DB 에 테스트 기업을 하나 만들고, 끝에 지운다.
import { q, done, env } from './q.mjs'
import jwt from 'jsonwebtoken'

const BASE = 'http://localhost:3000'
const 표시 = '[검증]'
let 통과 = 0, 실패 = 0
const 결과 = []
function 본다(이름, 맞나, 설명 = '') {
  if (맞나) { 통과++; console.log(`  ✓ ${이름}`) }
  else { 실패++; console.log(`  ✗ ${이름} ${설명}`); 결과.push(`${이름} ${설명}`) }
}
const 토큰 = (sub, owner_type) => jwt.sign({ sub, owner_type, role: owner_type }, env.JWT_SECRET, { expiresIn: '1h' })
async function 부른다(path, { method = 'GET', token, body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, ok: j?.success, data: j?.data, code: j?.error?.code, msg: j?.error?.message }
}
const 날 = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// ── 준비 ────────────────────────────────────────────────────────────
const [{ id: 기업 }] = await q(
  `INSERT INTO companies (company_name, company_type, status, is_member)
   VALUES ($1, 'STORE', 'ACTIVE', true) RETURNING id`, [표시 + ' 검증용 기업'])
const 기업토큰 = 토큰(기업, 'company')
const 관리자토큰 = 토큰('00000000-0000-0000-0000-000000000000', 'admin')
const [원래스위치] = await q(`SELECT value FROM app_settings WHERE key='plan_sales'`)
console.log(`테스트 기업 ${기업} / plan_sales=${원래스위치?.value}`)

const 공고내기 = (n) => 부른다('/api/company/jobs', { method: 'POST', token: 기업토큰,
  body: { title: `${표시} 공고 ${n}`, job_type: 'STORE', description: '검증용' } })

try {
// ── 1. 스타트(무료 체험) ────────────────────────────────────────────
console.log('\n1. 스타트 — 라이트 30일 체험')
{
  const p = await 부른다('/api/company/me/plan', { token: 기업토큰 })
  본다('이용권이 스타트(plan=null)', p.data?.plan === null, JSON.stringify(p.data))
  본다('공고를 걸기 전에는 체험이 시작되지 않는다', p.data?.체험끝 == null, String(p.data?.체험끝))

  const 낸것 = []
  for (let i = 1; i <= 6; i++) 낸것.push(await 공고내기(i))
  본다('무료로도 건수를 안 막는다(여섯 건 다 걸린다)', 낸것.every(r => r.ok === true),
       낸것.map(r => r.status + ':' + (r.code || '')).join(' '))

  const [c] = await q(`SELECT to_char(trial_until,'YYYY-MM-DD') t FROM companies WHERE id=$1`, [기업])
  본다('첫 공고를 거는 날 체험이 시작된다(오늘 + 29)', c.t === 날(29), `${c.t} vs ${날(29)}`)

  const [{ a: 처음, b: 끝 }] = await q(
    `SELECT to_char(MIN(listed_until),'YYYY-MM-DD') a, to_char(MAX(listed_until),'YYYY-MM-DD') b
       FROM job_postings WHERE company_id=$1 AND status='ACTIVE'`, [기업])
  본다('무료 공고는 모두 체험 끝나는 날까지다', 처음 === 날(29) && 끝 === 날(29), `${처음} ~ ${끝}`)

  const p2 = await 부른다('/api/company/me/plan', { token: 기업토큰 })
  본다('내 이용권에 체험 남은 날이 보인다', p2.data?.체험중 === true && p2.data?.체험남은일 === 30,
       JSON.stringify({ 중: p2.data?.체험중, 남은: p2.data?.체험남은일 }))

  // 체험이 끝나면 못 건다.
  // 하루가 지난 것처럼 민다. 공고의 게재 종료일은 걸 때 체험 끝나는 날로
  // 박혔으므로 같이 민다 — 실제로는 날짜가 흐르며 둘이 함께 지난다.
  await q(`UPDATE companies SET trial_until = CURRENT_DATE - 1 WHERE id=$1`, [기업])
  await q(`UPDATE job_postings SET listed_until = CURRENT_DATE - 1 WHERE company_id=$1`, [기업])
  const 막힘 = await 공고내기(7)
  본다('체험이 끝나면 무료로는 못 건다(PLAN_001)', 막힘.status === 403 && 막힘.code === 'PLAN_001',
       `${막힘.status} ${막힘.code}`)
  const [v] = await q(`SELECT COUNT(*)::int n FROM v_active_jobs WHERE company_id=$1`, [기업])
  본다('체험이 끝나면 걸어 둔 공고가 함께 내려간다', v.n === 0, `${v.n}건 남음`)
  await q(`UPDATE companies SET trial_until = CURRENT_DATE + 29 WHERE id=$1`, [기업])
  await q(`UPDATE job_postings SET listed_until = CURRENT_DATE + 29 WHERE company_id=$1`, [기업])
}

// ── 2. 주문 ────────────────────────────────────────────────────────
console.log('\n2. 주문 — 지금 파는 것은 라이트뿐')
let 주문id
{
  await q(`UPDATE app_settings SET value='off' WHERE key='plan_sales'`)
  const 닫힘 = await 부른다('/api/company/orders', { method: 'POST', token: 기업토큰,
    body: { plan: 'LIGHT', days: 30, depositor: '검증' } })
  본다('판매 꺼져 있으면 주문이 막힌다(PLAN_010)', 닫힘.status === 403 && 닫힘.code === 'PLAN_010',
       `${닫힘.status} ${닫힘.code}`)

  await q(`UPDATE app_settings SET value='on' WHERE key='plan_sales'`)

  const 준비중것 = await 부른다('/api/company/orders', { method: 'POST', token: 기업토큰,
    body: { plan: 'STANDARD', days: 30, depositor: '검증' } })
  본다('아직 안 여는 상품은 주문이 막힌다(PLAN_013)', 준비중것.status === 403 && 준비중것.code === 'PLAN_013',
       `${준비중것.status} ${준비중것.code}`)

  const 주문 = await 부른다('/api/company/orders', { method: 'POST', token: 기업토큰,
    body: { plan: 'LIGHT', days: 30, depositor: '검증' } })
  본다('라이트 주문이 들어간다', 주문.ok === true, `${주문.status} ${주문.code}`)
  본다('금액을 서버가 다시 계산한다(49,000)', 주문.data?.amount === 49000, String(주문.data?.amount))
  주문id = 주문.data?.id

  const 값속임 = await 부른다('/api/company/orders', { method: 'POST', token: 기업토큰,
    body: { plan: 'LIGHT', days: 30, depositor: '검증', amount: 100 } })
  본다('입금대기 중에는 또 못 낸다(PLAN_012)', 값속임.status === 409 && 값속임.code === 'PLAN_012',
       `${값속임.status} ${값속임.code}`)

  const 엉터리 = await 부른다('/api/company/orders', { method: 'POST', token: 기업토큰,
    body: { plan: 'GOLD', days: 31, depositor: '' } })
  본다('없는 플랜은 거른다', 엉터리.status === 400, String(엉터리.status))

  const 남 = await 부른다('/api/company/orders', { method: 'POST', body: { plan: 'LIGHT', days: 30, depositor: 'x' } })
  본다('로그인 없이는 주문 못 한다', 남.status === 401, String(남.status))
}

// ── 3. 입금 확인 ────────────────────────────────────────────────────
console.log('\n3. 입금 확인')
{
  const 남 = await 부른다('/api/admin/orders', { method: 'PATCH', token: 기업토큰, body: { id: 주문id, action: 'confirm' } })
  본다('기업 토큰으로는 입금 확인 못 한다', 남.status === 403, String(남.status))

  const c = await 부른다('/api/admin/orders', { method: 'PATCH', token: 관리자토큰, body: { id: 주문id, action: 'confirm' } })
  본다('입금 확인이 된다', c.ok === true, `${c.status} ${c.code}`)
  본다('마지막 이용일이 오늘부터 30일째(오늘+29)', c.data?.paidUntil === 날(29), `${c.data?.paidUntil} vs ${날(29)}`)

  const [co] = await q(`SELECT plan, to_char(paid_until,'YYYY-MM-DD') pu FROM companies WHERE id=$1`, [기업])
  본다('기업 등급이 LIGHT 로 붙는다', co.plan === 'LIGHT' && co.pu === 날(29), JSON.stringify(co))

  const [j] = await q(`SELECT to_char(MIN(listed_until),'YYYY-MM-DD') a, to_char(MAX(listed_until),'YYYY-MM-DD') b
                         FROM job_postings WHERE company_id=$1 AND status='ACTIVE'`, [기업])
  본다('걸려 있던 공고 게재일도 같이 밀린다', j.a === 날(29) && j.b === 날(29), JSON.stringify(j))

  const [주문행] = await q(`SELECT to_char(applied_from,'YYYY-MM-DD') f, to_char(applied_until,'YYYY-MM-DD') u
                              FROM company_orders WHERE id=$1`, [주문id])
  본다('영수증에 적용 기간이 오늘부터 마지막 날까지로 남는다',
       주문행.f === 날(0) && 주문행.u === 날(29), JSON.stringify(주문행))

  const 두번 = await 부른다('/api/admin/orders', { method: 'PATCH', token: 관리자토큰, body: { id: 주문id, action: 'confirm' } })
  본다('같은 주문을 두 번 확인할 수 없다(ORDER_002)', 두번.status === 409 && 두번.code === 'ORDER_002',
       `${두번.status} ${두번.code}`)

  const p = await 부른다('/api/company/me/plan', { token: 기업토큰 })
  본다('내 이용권이 라이트로 보인다', p.data?.plan === 'LIGHT' && p.data?.남은일 === 30,
       JSON.stringify(p.data))
}

// ── 4. 유료 동안 ────────────────────────────────────────────────────
console.log('\n4. 유료 기간 동안')
{
  const r = await 공고내기(6)
  본다('유료로 바꾼 뒤에도 걸린다', r.ok === true, `${r.status} ${r.code}`)
  const [j] = await q(`SELECT to_char(listed_until,'YYYY-MM-DD') lu FROM job_postings
                        WHERE company_id=$1 ORDER BY created_at DESC LIMIT 1`, [기업])
  본다('새 공고 게재일이 이용권 만료일과 같다', j.lu === 날(29), `${j.lu} vs ${날(29)}`)

  // 하향 금지는 스탠다드를 쓰는 중일 때 보인다. 스탠다드는 아직 안 파는 상품이라
  // 주문으로는 그 상태를 만들 수 없어 등급만 세워 놓고 본다.
  await q(`UPDATE companies SET plan='STANDARD' WHERE id=$1`, [기업])
  const 아래 = await 부른다('/api/company/orders', { method: 'POST', token: 기업토큰,
    body: { plan: 'LIGHT', days: 30, depositor: '검증' } })
  본다('이용 중에 더 낮은 등급은 못 산다(PLAN_011)', 아래.status === 409 && 아래.code === 'PLAN_011',
       `${아래.status} ${아래.code}`)
}

// ── 5. 인재 열람·제안 ───────────────────────────────────────────────
console.log('\n5. 인재 열람·제안')
{
  const 아무개 = '00000000-0000-0000-0000-000000000001'
  const s2 = await 부른다('/api/company/talent?limit=1', { token: 기업토큰 })
  본다('스탠다드는 인재 목록이 열린다', s2.status === 200, `${s2.status} ${s2.code}`)
  const 한명 = (s2.data?.talents ?? s2.data?.items ?? s2.data)?.[0]
  본다('스탠다드는 이름이 안 가려진다', !!한명 && !String(한명.name ?? '').includes('○'),
       JSON.stringify(한명 && { name: 한명.name, phone: 한명.phone }))
  const 제안S = await 부른다(`/api/company/talent/${아무개}/propose`, { method: 'POST', token: 기업토큰,
    body: { jobPostingId: 아무개, message: '검증' } })
  본다('스탠다드는 제안 문이 열려 있다', 제안S.code !== 'PROPOSAL_005', `${제안S.status} ${제안S.code}`)

  await q(`UPDATE companies SET plan='LIGHT' WHERE id=$1`, [기업])
  const l = await 부른다('/api/company/talent?limit=1', { token: 기업토큰 })
  const 라이트한명 = (l.data?.talents ?? l.data?.items ?? l.data)?.[0]
  본다('라이트는 이름이 가려진다',
       !!라이트한명 && (라이트한명.name === null || String(라이트한명.name).includes('○')),
       JSON.stringify(라이트한명 && { name: 라이트한명.name, phone: 라이트한명.phone }))
  const 제안L = await 부른다(`/api/company/talent/${아무개}/propose`, { method: 'POST', token: 기업토큰,
    body: { jobPostingId: 아무개, message: '검증' } })
  본다('라이트는 제안이 막힌다(PROPOSAL_005)', 제안L.status === 403 && 제안L.code === 'PROPOSAL_005',
       `${제안L.status} ${제안L.code}`)
  await q(`UPDATE companies SET plan='STANDARD' WHERE id=$1`, [기업])
}

// ── 6. 채용관 노출 ──────────────────────────────────────────────────
console.log('\n6. 메인 채용관')
{
  await q(`UPDATE job_postings SET main_impressions=0 WHERE company_id=$1`, [기업])
  const g = await 부른다('/api/jobs/showcase?tier=STANDARD')
  본다('스탠다드관이 25칸이다', g.data?.slots === 25, String(g.data?.slots))
  본다('스탠다드관 한 줄이 5칸이다', g.data?.cols === 5, String(g.data?.cols))
  const 내것 = (g.data?.items ?? []).filter(x => x.company_id === 기업)
  본다('산 공고가 채용관에 뜬다', 내것.length > 0, `내 것 ${내것.length}건 / 전체 ${g.data?.items?.length}`)
  본다('산 공고는 filler 가 아니다', 내것.every(x => !x.filler), '')

  const pg2 = await 부른다('/api/jobs/showcase?tier=PREMIUM')
  본다('프리미엄관이 8칸이다', pg2.data?.slots === 8, String(pg2.data?.slots))
  본다('스탠다드 공고는 프리미엄관의 판 자리에 안 든다',
       (pg2.data?.items ?? []).filter(x => x.company_id === 기업 && !x.filler).length === 0, '')

  const ids = 내것.slice(0, 3).map(x => x.id)
  const before = await q(`SELECT COALESCE(SUM(main_impressions),0)::int s FROM job_postings WHERE id=ANY($1::uuid[])`, [ids])
  await 부른다('/api/jobs/showcase', { method: 'POST', body: { ids, 표: g.data?.표 } })
  const 표없이 = await 부른다('/api/jobs/showcase', { method: 'POST', body: { ids } })
  본다('표 없이 보낸 것은 안 센다', 표없이.data?.counted === 0, String(표없이.data?.counted))
  const after = await q(`SELECT COALESCE(SUM(main_impressions),0)::int s FROM job_postings WHERE id=ANY($1::uuid[])`, [ids])
  본다('뜬 만큼 노출 수가 는다', after[0].s === before[0].s + ids.length, `${before[0].s} → ${after[0].s}`)

  await q(`UPDATE job_postings SET main_impressions=9999 WHERE company_id=$1`, [기업])
  const g2 = await 부른다('/api/jobs/showcase?tier=STANDARD')
  const 순 = (g2.data?.items ?? []).map(x => x.company_id === 기업)
  const 판것 = (g2.data?.items ?? []).filter(x => !x.filler)
  본다('많이 노출된 것이 뒤로 간다',
       판것.length <= 1 || 순.indexOf(true) >= 판것.findIndex(x => x.company_id !== 기업),
       `내 자리 ${순.indexOf(true)} / 판 자리 ${판것.length}`)
  await q(`UPDATE job_postings SET main_impressions=0 WHERE company_id=$1`, [기업])

  const p = await 부른다('/api/company/me/plan', { token: 기업토큰 })
  본다('내 이용권 화면에 노출 수가 나온다', typeof p.data?.노출 === 'number', JSON.stringify(p.data))
}

// ── 7. 만료 ────────────────────────────────────────────────────────
console.log('\n7. 만료')
{
  // 이용권도 체험도 지난 상태. 체험은 가입 뒤 한 번뿐이라 유료가 끝나도
  // 다시 살아나지 않는다.
  await q(`UPDATE companies SET paid_until = CURRENT_DATE - 1, trial_until = CURRENT_DATE - 1 WHERE id=$1`, [기업])
  await q(`UPDATE job_postings SET listed_until = CURRENT_DATE - 1 WHERE company_id=$1`, [기업])

  const p = await 부른다('/api/company/me/plan', { token: 기업토큰 })
  본다('이용권이 스타트로 떨어진다', p.data?.plan === null, JSON.stringify(p.data))
  본다('진행 중 공고가 0건으로 센다', p.data?.진행중 === 0, String(p.data?.진행중))

  const [v] = await q(`SELECT COUNT(*)::int n FROM v_active_jobs WHERE company_id=$1`, [기업])
  본다('목록에서 내려간다(v_active_jobs)', v.n === 0, `${v.n}건 남음`)

  const g = await 부른다('/api/jobs/showcase?tier=STANDARD')
  본다('채용관에서 사라진다', (g.data?.items ?? []).every(x => x.company_id !== 기업), '')

  const l = await 부른다('/api/talents?limit=1', { token: 기업토큰 })
  const 한명 = l.data?.items?.[0] ?? l.data?.[0]
  본다('인재 연락처가 다시 잠긴다', !한명 || 한명.name === null || String(한명.name).includes('○'),
       JSON.stringify(한명 && { name: 한명.name }))

  const 새공고 = await 공고내기(7)
  본다('체험을 이미 쓴 곳은 만료 뒤 무료로 못 건다', 새공고.status === 403 && 새공고.code === 'PLAN_001',
       `${새공고.status} ${새공고.code}`)
}

// ── 8. 뒷문 ────────────────────────────────────────────────────────
console.log('\n8. 뒷문')
{
  await q(`UPDATE companies SET trial_until = CURRENT_DATE + 29 WHERE id=$1`, [기업])

  // 임시저장으로 넣고 상태만 ACTIVE 로 바꾸면 게재 기간을 건너뛰는가.
  const d = await 부른다('/api/company/jobs', { method: 'POST', token: 기업토큰,
    body: { title: `${표시} 임시저장`, job_type: 'STORE', status: 'DRAFT' } })
  const 임시 = d.data?.id
  const 펴기 = await 부른다(`/api/company/jobs/${임시}`, { method: 'PATCH', token: 기업토큰,
    body: { status: 'ACTIVE' } })
  const [dj] = await q(`SELECT status::text status, to_char(listed_until,'YYYY-MM-DD') lu FROM job_postings WHERE id=$1`, [임시])
  본다('임시저장을 펴면 게재 종료일이 붙는다', dj?.lu === 날(29),
       `status=${dj?.status} listed_until=${dj?.lu} (${펴기.status})`)

  await q(`UPDATE companies SET trial_until = CURRENT_DATE - 1 WHERE id=$1`, [기업])
  const d2 = await 부른다('/api/company/jobs', { method: 'POST', token: 기업토큰,
    body: { title: `${표시} 임시저장2`, job_type: 'STORE', status: 'DRAFT' } })
  const 막힘2 = await 부른다(`/api/company/jobs/${d2.data?.id}`, { method: 'PATCH', token: 기업토큰,
    body: { status: 'ACTIVE' } })
  본다('체험이 끝났으면 임시저장도 못 편다', 막힘2.status === 403 && 막힘2.code === 'PLAN_001',
       `${막힘2.status} ${막힘2.code}`)
  await q(`UPDATE companies SET trial_until = CURRENT_DATE + 29 WHERE id=$1`, [기업])

  // 노출 수 — 로그인 없이 아무 공고나 올릴 수 있는가.
  const [남의것] = await q(`SELECT id, main_impressions FROM job_postings
                              WHERE company_id <> $1 AND status='ACTIVE' LIMIT 1`, [기업])
  const 훔친표 = (await 부른다('/api/jobs/showcase?tier=STANDARD')).data?.표
  await 부른다('/api/jobs/showcase', { method: 'POST', body: { ids: [남의것.id], 표: 훔친표 } })
  const [뒤] = await q(`SELECT main_impressions FROM job_postings WHERE id=$1`, [남의것.id])
  본다('노출 수는 아무나 못 올린다',
       String(뒤.main_impressions) === String(남의것.main_impressions),
       `${남의것.main_impressions} → ${뒤.main_impressions}`)
  await q(`UPDATE job_postings SET main_impressions=$2 WHERE id=$1`, [남의것.id, 남의것.main_impressions])
}

} finally {
  await q(`UPDATE app_settings SET value=$1 WHERE key='plan_sales'`, [원래스위치?.value ?? 'off'])
  await q(`DELETE FROM job_postings WHERE company_id=$1`, [기업])
  await q(`DELETE FROM companies WHERE id=$1`, [기업])
  const [남] = await q(`SELECT COUNT(*)::int n FROM job_postings WHERE company_id=$1`, [기업])
  console.log(`\n정리: 테스트 기업 삭제(남은 공고 ${남.n}건), plan_sales=${원래스위치?.value}`)
}

console.log(`\n────────  통과 ${통과} · 실패 ${실패}`)
if (결과.length) console.log(결과.map(x => ' ✗ ' + x).join('\n'))
await done()
