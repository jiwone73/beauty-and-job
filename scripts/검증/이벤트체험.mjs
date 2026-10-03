// 이벤트 무료 체험 + 등급별 기능 + 스위치 검증.
// `npm run dev` 를 띄워 두고 `node scripts/검증/이벤트체험.mjs` — 서울 DB 에 `[검증]` 표를 단 기업을 만들어
// 시험하고 끝에 지운다. event_showcase 설정을 잠깐 바꿨다가 원래대로 돌려놓는다.
// 중간에 끊겼으면 README 의 정리 SQL 을 돌린다(아래 정리() 가 지우는 것과 같다).
import { q, done, env } from './q.mjs'
import jwt from 'jsonwebtoken'

const BASE = 'http://localhost:3000'
const 표시 = '[검증]'
let 통과 = 0, 실패 = 0
const 결과 = []
const 본다 = (이름, 맞나, 설명 = '') => {
  if (맞나) { 통과++; console.log(`  ✓ ${이름}`) } else { 실패++; console.log(`  ✗ ${이름} ${설명}`); 결과.push(`${이름} ${설명}`) }
}
const 토큰 = (sub, owner_type) => jwt.sign({ sub, owner_type, role: owner_type === 'company' ? 'co_master' : owner_type }, env.JWT_SECRET, { expiresIn: '1h' })
async function 부른다(path, { method = 'GET', token, body } = {}) {
  const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, ok: j?.success, data: j?.data, code: j?.error?.code, msg: j?.error?.message }
}
const 날 = (n) => { const d = new Date(Date.now() + 9 * 36e5); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const 개월 = (날짜, n) => { const [y, m, d] = 날짜.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + n, d)); if (t.getUTCDate() !== d) t.setUTCDate(0); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10) }

const [원래설정] = await q(`SELECT value FROM app_settings WHERE key='event_showcase'`)
const 원래값 = 원래설정.value
const 설정쓰기 = (o) => q(`UPDATE app_settings SET value=$1 WHERE key='event_showcase'`, [JSON.stringify(o)])
const 기본설정 = { ...JSON.parse(원래값), from: 날(-10), to: 날(30), until: 날(130), months: 3, plan: 'PREMIUM' }
const [사람] = await q(`SELECT id, name, phone FROM users WHERE email='btwk2026+us02@gmail.com'`)

const 만든 = {}
// 가입일을 이벤트 가입 기간 밖(400일 전)으로 둔다 — 안에 있으면 이벤트 체험을 받아 버려 스타트·구매 등급 시험이 흐려진다.
// 이벤트 기업(E)만 가입일이 오늘이다.
const 기업만들기 = async (이름, plan, source, 오래전 = true) => {
  const [r] = await q(`INSERT INTO companies (company_name, company_type, status, is_member, plan, paid_until, plan_source, created_at)
     VALUES ($1,'STORE','ACTIVE',true,$2,$3,$4, ${오래전 ? "now() - interval '400 days'" : 'now()'}) RETURNING id`, [`${표시} ${이름}`, plan, plan ? 날(60) : null, source])
  만든[이름] = { id: r.id, 토큰: 토큰(r.id, 'company') }
  return 만든[이름]
}
const 정리 = async () => {
  const ids = Object.values(만든).map((x) => x.id)
  if (ids.length) {
    await q(`DELETE FROM activity_events WHERE actor_id = ANY($1::uuid[])`, [ids])
    await q(`DELETE FROM job_postings WHERE company_id = ANY($1::uuid[])`, [ids])
    await q(`DELETE FROM companies WHERE id = ANY($1::uuid[])`, [ids])
  }
  await q(`UPDATE app_settings SET value=$1 WHERE key='event_showcase'`, [원래값])
}

try {
  await 설정쓰기(기본설정)
  const S = await 기업만들기('스타트', null, null)
  const L = await 기업만들기('라이트', 'LIGHT', 'PURCHASE')
  const T = await 기업만들기('스탠다드', 'STANDARD', 'PURCHASE')
  const P = await 기업만들기('프리미엄', 'PREMIUM', 'PURCHASE')
  const E = await 기업만들기('이벤트', null, null, false)

  console.log('\n1. 이벤트 무료 체험 부여')
  const 공고 = (c, n) => 부른다('/api/company/jobs', { method: 'POST', token: c.토큰, body: { title: `${표시} ${n}`, job_type: 'STORE', description: '검증용' } })
  const e1 = await 공고(E, '이벤트 공고')
  본다('이벤트 기간 가입 기업이 공고를 올리면 등록된다', e1.status === 201, `status=${e1.status} ${e1.msg}`)
  const [e행] = await q(`SELECT plan, plan_source, paid_until FROM companies WHERE id=$1`, [E.id])
  본다('프리미엄을 받는다', e행.plan === 'PREMIUM', JSON.stringify(e행))
  본다('출처가 EVENT 로 남는다', e행.plan_source === 'EVENT')
  본다('종료일이 가입일 + 3개월 − 1일이다', e행.paid_until === 개월(날(0), 3), `${e행.paid_until} / ${개월(날(0), 3)}`)
  const 늦은설정 = { ...기본설정, from: 날(-60), to: 날(-30) }
  await 설정쓰기(늦은설정)
  const [늦] = await q(`INSERT INTO companies (company_name, company_type, status, is_member) VALUES ($1,'STORE','ACTIVE',true) RETURNING id`, [`${표시} 마감후가입`])
  만든['마감후가입'] = { id: 늦.id, 토큰: 토큰(늦.id, 'company') }
  const 늦공고 = await 공고(만든['마감후가입'], '마감 후 가입 공고')
  const [늦행] = await q(`SELECT plan FROM companies WHERE id=$1`, [늦.id])
  본다('가입 기간이 지난 뒤 가입한 기업은 체험이 없다(스타트)', 늦행.plan === null, JSON.stringify(늦행))
  await 설정쓰기(기본설정)

  console.log('\n1-2. 체험은 승인일부터 센다')
  const 관리자 = jwt.sign({ sub: '00000000-0000-0000-0000-000000000000', owner_type: 'admin', role: 'admin' }, env.JWT_SECRET, { expiresIn: '1h' })
  // 5일 전에 가입했지만 아직 승인 대기(PENDING)인 기업 — 가입일은 이벤트 가입 기간 안이다.
  const [대기] = await q(`INSERT INTO companies (company_name, company_type, status, is_member, created_at)
     VALUES ($1,'STORE','PENDING',true, now() - interval '5 days') RETURNING id`, [`${표시} 승인대기`])
  만든['승인대기'] = { id: 대기.id, 토큰: 토큰(대기.id, 'company') }
  const 대기후 = await q(`SELECT plan FROM companies WHERE id=$1`, [대기.id])
  본다('승인 대기 중에는 체험이 시작되지 않는다', 대기후[0].plan === null)
  const 승인 = await 부른다('/api/admin/companies', { method: 'PATCH', token: 관리자, body: { id: 대기.id, status: 'ACTIVE' } })
  본다('운영자가 승인한다', 승인.status === 200, `status=${승인.status} ${승인.msg}`)
  const [승인행] = await q(`SELECT plan, plan_source, paid_until FROM companies WHERE id=$1`, [대기.id])
  본다('승인하는 날 프리미엄이 시작된다', 승인행.plan === 'PREMIUM' && 승인행.plan_source === 'EVENT', JSON.stringify(승인행))
  본다('종료일이 가입일(5일 전)이 아니라 승인일 + 3개월 − 1일이다', 승인행.paid_until === 개월(날(0), 3), `${승인행.paid_until} / ${개월(날(0), 3)}`)
  const 정지 = await 부른다('/api/admin/companies', { method: 'PATCH', token: 관리자, body: { id: 대기.id, status: 'SUSPENDED' } })
  const 다시 = await 부른다('/api/admin/companies', { method: 'PATCH', token: 관리자, body: { id: 대기.id, status: 'ACTIVE' } })
  const [다시행] = await q(`SELECT paid_until FROM companies WHERE id=$1`, [대기.id])
  본다('정지 후 다시 승인해도 기간이 다시 시작되지 않는다(한 번만)', 정지.status === 200 && 다시.status === 200 && 다시행.paid_until === 승인행.paid_until)

  console.log('\n2. 등급 × 기능 — 인재 열람 (스탠다드부터)')
  const 열람 = async (c) => {
    const r = await 부른다(`/api/company/talent/${사람.id}/resume`, { token: c.토큰 })
    const u = r.data?.user
    return { ok: r.ok, 풀림: !!u && u.name === 사람.name && (u.phone || '') === (사람.phone || '') }
  }
  const 열람결과 = { S: await 열람(S), L: await 열람(L), T: await 열람(T), P: await 열람(P), E: await 열람(E) }
  본다('스타트는 이름·연락처가 가려진다', 열람결과.S.ok && !열람결과.S.풀림, JSON.stringify(열람결과.S))
  본다('라이트는 가려진다', 열람결과.L.ok && !열람결과.L.풀림, JSON.stringify(열람결과.L))
  본다('스탠다드는 열린다', 열람결과.T.풀림, JSON.stringify(열람결과.T))
  본다('프리미엄은 열린다', 열람결과.P.풀림, JSON.stringify(열람결과.P))
  본다('이벤트로 받은 프리미엄도 열린다', 열람결과.E.풀림, JSON.stringify(열람결과.E))

  console.log('\n3. 등급 × 기능 — 공고 등록 건수')
  const s1 = await 공고(S, '스타트 1'); const s2 = await 공고(S, '스타트 2')
  본다('스타트는 한 번에 1건', s1.status === 201 && s2.status === 403 && s2.code === 'PLAN_001', `${s1.status}/${s2.status}`)
  const l1 = await 공고(L, '라이트 1'); const l2 = await 공고(L, '라이트 2')
  본다('라이트는 여러 건', l1.status === 201 && l2.status === 201, `${l1.status}/${l2.status}`)
  await 공고(T, '스탠다드 1'); await 공고(P, '프리미엄 1')

  console.log('\n4. 검색 목록 노출 순서 (등급 → 같은 등급 안은 최근 로그인)')
  await q(`UPDATE companies SET last_login_at = now() WHERE id = $1`, [P.id])
  await q(`UPDATE companies SET last_login_at = now() - interval '2 days' WHERE id = $1`, [E.id])
  const 목록 = await 부른다(`/api/jobs?q=${encodeURIComponent(표시)}&limit=50`)
  const 제목들 = (목록.data?.items || 목록.data || []).map((j) => j.title)
  const 위치 = (키) => 제목들.findIndex((t) => t.includes(키))
  본다('프리미엄이 스탠다드보다 위', 위치('프리미엄 1') !== -1 && 위치('프리미엄 1') < 위치('스탠다드 1'), JSON.stringify(제목들))
  본다('스탠다드가 라이트보다 위', 위치('스탠다드 1') !== -1 && 위치('스탠다드 1') < 위치('라이트 1'))
  본다('같은 프리미엄이면 최근 로그인이 위(구매 P > 이벤트 E)', 위치('프리미엄 1') < 위치('이벤트 공고'))
  본다('스타트(회원전용)는 비회원 목록에 없다', 위치('스타트 1') === -1)

  console.log('\n5. 메인 채용관 (이벤트 기간 = 줄서기)')
  const 프리관 = await 부른다('/api/jobs/showcase?tier=PREMIUM')
  const 프리제목 = (프리관.data?.items || []).filter((x) => !x.filler).map((x) => x.title)
  본다('이벤트 기업 공고가 프리미엄관에 오른다', 프리제목.some((t) => t.includes('이벤트 공고')), JSON.stringify(프리제목))
  본다('구매한 프리미엄(P)은 이 기간엔 줄서기 대상이 아니다', !프리제목.some((t) => t.includes('프리미엄 1')))
  const 스탠관 = await 부른다('/api/jobs/showcase?tier=STANDARD')
  본다('스탠다드관에는 같은 기업이 겹쳐 나오지 않는다', !(스탠관.data?.items || []).filter((x) => !x.filler).some((x) => x.title.includes('이벤트 공고')))

  console.log('\n6. 상품소개 표시 (스위치)')
  const 계획켬 = await 부른다('/api/plans')
  본다('켜짐: 체험 정보가 내려온다', 계획켬.data?.trial?.months === 3 && 계획켬.data?.trial?.plan === 'PREMIUM', JSON.stringify(계획켬.data?.trial))

  console.log('\n7. 만료 — 이용권과 같은 길로 스타트가 된다')
  await q(`UPDATE companies SET paid_until = $2 WHERE id=$1`, [E.id, 날(-1)])
  const 열람만료 = await 열람(E)
  본다('종료일이 지나면 인재 열람이 닫힌다', 열람만료.ok && !열람만료.풀림, JSON.stringify(열람만료))
  const 프리관만료 = await 부른다('/api/jobs/showcase?tier=PREMIUM')
  본다('종료일이 지나면 메인 줄서기에서 빠진다', !(프리관만료.data?.items || []).filter((x) => !x.filler).some((x) => x.title.includes('이벤트 공고')))
  await q(`UPDATE companies SET paid_until = $2 WHERE id=$1`, [E.id, 날(60)])

  console.log('\n8. 스위치 끄기(유료화) — 설정에서 months 를 빼면 원래 방식')
  const { months, plan, ...꺼짐 } = 기본설정
  await 설정쓰기(꺼짐)
  const 계획끔 = await 부른다('/api/plans')
  본다('꺼짐: 체험 정보가 없다', 계획끔.data?.trial === null, JSON.stringify(계획끔.data?.trial))
  const 프리관끔 = await 부른다('/api/jobs/showcase?tier=PREMIUM')
  const 프리끔제목 = (프리관끔.data?.items || []).filter((x) => !x.filler).map((x) => x.title)
  본다('꺼짐: 산 프리미엄 자리가 원래 방식(구매 등급)으로 돌아온다', 프리끔제목.some((t) => t.includes('프리미엄 1')), JSON.stringify(프리끔제목))
  const 새로 = await q(`INSERT INTO companies (company_name, company_type, status, is_member) VALUES ($1,'STORE','ACTIVE',true) RETURNING id`, [`${표시} 꺼진뒤가입`])
  만든['꺼진뒤가입'] = { id: 새로[0].id, 토큰: 토큰(새로[0].id, 'company') }
  await 공고(만든['꺼진뒤가입'], '꺼진 뒤 가입 공고')
  const [꺼진행] = await q(`SELECT plan FROM companies WHERE id=$1`, [새로[0].id])
  본다('꺼짐: 새로 가입한 기업은 체험 없이 스타트', 꺼진행.plan === null, JSON.stringify(꺼진행))
  await 설정쓰기(기본설정)

  console.log('\n9. 활동 기록')
  await 부른다(`/api/company/jobs/${e1.data?.id}`, { method: 'PATCH', token: E.토큰, body: { title: `${표시} 이벤트 공고 수정` } })
  await 부른다('/api/company/talent?jobType=STORE', { token: E.토큰 })
  await 부른다(`/api/jobs/${e1.data?.id}`)
  await new Promise((r) => setTimeout(r, 800))
  const 기록 = await q(`SELECT kind, count(*)::int n FROM activity_events WHERE actor_id=$1 GROUP BY kind`, [E.id])
  const 수 = Object.fromEntries(기록.map((x) => [x.kind, x.n]))
  본다('공고 등록 기록', 수.JOB_CREATE === 1, JSON.stringify(수))
  본다('공고 수정 기록', (수.JOB_EDIT || 0) >= 1)
  본다('인재검색 기록', (수.TALENT_SEARCH || 0) >= 1)
  본다('이력서 열람 기록', (수.RESUME_VIEW || 0) >= 1)
  본다('공고 조회 기록', (수.JOB_VIEW || 0) >= 1)
} catch (e) {
  실패++; console.error('검증 중 오류', e); 결과.push(String(e))
} finally {
  await 정리()
  await done()
}
console.log(`\n통과 ${통과} · 실패 ${실패}`)
if (실패) { console.log(결과.join('\n')); process.exit(1) }
