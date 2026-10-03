import pool from "@/lib/db";
import { 플랜, 스타트, 플랜인가, type PlanId } from "@/lib/companyPlans";
import { 이벤트설정읽기 } from "@/lib/eventShowcase";

export type 이용권정보 = {
  /** 유료 기간 안에 있을 때의 등급. 기간이 지났거나 비면 null(= 스타트) */
  plan: PlanId | null;
  /** YYYY-MM-DD. 유료였던 적이 없으면 null. 이 날까지가 이용 기간이다(이 날 포함) */
  paidUntil: string | null;
  /** 오늘을 넣어 앞으로 며칠을 더 쓰는가. 마지막 날이 1, 기간 밖이면 0 */
  남은일: number;
};

/**
 * 이 기업이 지금 무엇을 샀는가.
 *
 * 기간이 지나면 등급을 지워서 돌려준다 — 부르는 쪽이 날짜를 또 견주지
 * 않게 한다. 등급 칸에 값이 남아 있어도 기간 밖이면 스타트이다.
 */
export async function 이용권(companyId: string): Promise<이용권정보> {
  const { rows } = await pool.query(
    `SELECT plan, to_char(paid_until, 'YYYY-MM-DD') AS paid_until,
            (paid_until IS NOT NULL AND paid_until >= CURRENT_DATE) AS 유효,
            -- 오늘을 넣어 센다. 30일권을 산 날은 30, 마지막 날은 1이다.
            -- 날짜 빼기를 서버(UTC)에서 하면 오전 아홉 시까지 하루가 어긋난다.
            GREATEST(0, (paid_until - CURRENT_DATE) + 1) AS 남은일
       FROM companies WHERE id = $1`,
    [companyId]
  );
  const r = rows[0];
  if (!r) return { plan: null, paidUntil: null, 남은일: 0 };
  const plan = r.유효 && 플랜인가(r.plan) ? (r.plan as PlanId) : null;
  return {
    plan,
    paidUntil: r.paid_until ?? null,
    남은일: plan ? Number(r.남은일) : 0,
  };
}

/** YYYY-MM-DD 에 개월 수를 더하고 하루를 뺀다(가입한 날을 넣어 세므로 3개월 = 석 달 뒤 전날). */
export function 개월더하기(날짜: string, 개월: number): string {
  const [y, m, d] = 날짜.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + 개월, d));
  // 31일에 가입해 한 달 뒤가 없는 날이면 JS 가 다음 달로 넘긴다 — 그달 말일로 되돌린다.
  if (t.getUTCDate() !== d) t.setUTCDate(0);
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

/**
 * 이벤트 무료 체험 — 이벤트 기간에 가입한 기업에게 설정한 등급(프리미엄)을 **승인일**부터
 * 설정한 개월 수만큼 준다. 등급은 새로 만든 값이 아니라 **진짜 이용권**(plan·paid_until)이다 —
 * 그래서 끝나는 날 일반 이용권 만료와 똑같은 길로 스타트가 된다. 이 길이 곧 유료화 전환의 길이다.
 * 이용권의 출처는 plan_source('EVENT')에 남겨 구매한 것과 가른다.
 *
 * 승인되는 곳(자동 승인이면 가입 처리 app/api/auth/company/signup, 운영자 승인이면 app/api/admin/companies
 * PATCH)에서 부르고, 놓친 경우를 위해 공고를 올리는 길목(POST, 재등록 PATCH)에서도 부른다. 이미 유효한 이용권이 있으면 건드리지 않는다.
 * 설정에 months 가 없으면 아무것도 하지 않는다 — 스위치를 끄는 것은 months 를 빼는 것이다.
 *
 * 메인 이벤트 채용관(app/api/jobs/showcase/route.ts)과 같은 조건(가입일·오늘이 다 설정의
 * from~to 안)을 쓴다 — 한쪽만 기준이 다르면 메인에는 떴는데 검색 목록 자리는 스타트인 경우가 생긴다.
 */
export async function 이벤트체험부여(
  companyId: string,
  /** 점검용 — 오늘을 바꿔 끼운다(가입 기간 안팎을 시험할 때). 평소에는 쓰지 않는다. */
  옵션: { 오늘?: string } = {}
): Promise<{ plan: PlanId; paidUntil: string } | null> {
  const 설정 = await 이벤트설정읽기();
  // 설정에 months 가 없으면 체험이 꺼진 것이다(유료화 스위치). 옛 방식(라이트 30일)은 없앴다.
  if (!설정?.months || 설정.months <= 0) return null;
  const 오늘 = 옵션.오늘 ?? 오늘날짜();

  const { rows } = await pool.query(
    `SELECT to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS 가입일, plan_source, status::text AS status FROM companies WHERE id = $1`,
    [companyId]
  );
  const 가입일 = rows[0]?.가입일;
  // 대상은 이벤트 가입 기간(from~to)에 가입한 기업이다. 승인이 가입 기간이 지난 뒤에 나도 가입일이 기간 안이면 받는다.
  if (!가입일 || 가입일 < 설정.from || 가입일 > 설정.to) return null;
  // 승인(상태 ACTIVE)이 되어야 시작한다 — 체험 기간은 **승인일**부터 센다(승인 대기 중에는 아직 쓸 수 없으니 기간이 흐르면 안 된다).
  if (rows[0]?.status !== "ACTIVE") return null;
  // 구매한 이용권은 건드리지 않는다. 이벤트로 받은 것이 이미 있으면 다시 주지 않는다.
  if (rows[0]?.plan_source === "PURCHASE" || rows[0]?.plan_source === "EVENT") return null;
  if ((await 이용권(companyId)).plan) return null;

  const plan: PlanId = 설정.plan && 플랜인가(설정.plan) ? 설정.plan : "LIGHT";
  const paidUntil = 개월더하기(오늘, 설정.months); // 오늘 = 승인일(승인되는 날 또는 승인된 기업이 처음 쓰는 날)
  await pool.query(
    `UPDATE companies SET plan = $2, paid_until = $3, plan_source = 'EVENT' WHERE id = $1`,
    [companyId, plan, paidUntil]
  );
  return { plan, paidUntil };
}

/** 옛 이름 — 호출하는 곳이 많아 남겨 둔다. */
export const 이벤트라이트부여 = 이벤트체험부여;

/** 세워 둔 기간 — 상품 하나치 */
export type 보관칸 = { days: number; until: string };
/** 상품별 보관함. 만료된 칸은 빠진 채로 온다. */
export type 보관함 = Partial<Record<PlanId, 보관칸>>;

/** 보관함 raw(jsonb)에서 살아 있는 칸만 추린다. */
export function 보관읽기(raw: unknown, 오늘: string): 보관함 {
  const 함: 보관함 = {};
  if (!raw || typeof raw !== "object") return 함;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!플랜인가(k) || !v || typeof v !== "object") continue;
    const { days, until } = v as { days?: unknown; until?: unknown };
    const d = Number(days);
    // 보관일이 지난 칸은 없는 것으로 본다. 지우지는 않는다 — 언제 무엇이
    // 소멸했는지는 남아 있어야 나중에 설명할 수 있다.
    if (d > 0 && typeof until === "string" && until >= 오늘) 함[k] = { days: d, until };
  }
  return 함;
}

/**
 * 이 기업이 상품마다 며칠씩 세워 두었는가.
 *
 * 라이트에서 남은 것은 라이트로만 쓴다. 그래서 칸도 상품마다 따로다 —
 * 하나로 합쳐 두면 라이트를 세워 둔 채 스탠다드를 세울 자리가 없다.
 */
export async function 보관(companyId: string): Promise<보관함> {
  const { rows } = await pool.query(
    `SELECT kept, to_char(CURRENT_DATE, 'YYYY-MM-DD') AS 오늘 FROM companies WHERE id = $1`,
    [companyId]
  );
  return rows[0] ? 보관읽기(rows[0].kept, rows[0].오늘) : {};
}

/** 이 상품을 살 때 보관분이 며칠 얹히는가. 다른 상품 칸은 건드리지 않는다. */
export const 보관더할일 = (함: 보관함, 살플랜: PlanId): number => 함[살플랜]?.days ?? 0;

/** 보관함에 며칠을 더한 결과. 더한 칸은 만료일이 오늘부터 다시 센다. */
export function 보관더하기(함: 보관함, plan: PlanId, days: number, 만료: string): 보관함 {
  if (days <= 0) return 함;
  return { ...함, [plan]: { days: (함[plan]?.days ?? 0) + days, until: 만료 } };
}

/**
 * 무료(스타트)로 지금 몇 건을 걸어 두었고 몇 건을 더 걸 수 있는가.
 *
 * **동시에 몇 건**이지 통틀어 몇 번이 아니다. 게재기간이 무기한이라 한 번
 * 올린 공고는 마감하기 전까지 안 내려간다 — 총량으로 세면 한 번 쓴 곳은
 * 영영 못 걸게 된다. 막는 것이 아니라 한 번에 하나만 걸게 하는 것이 목적이다.
 */
export async function 무료칸(companyId: string): Promise<{ 쓴것: number; 남은것: number }> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM v_active_jobs WHERE company_id = $1`, [companyId]);
  const 쓴것 = Number(rows[0]?.n ?? 0);
  return { 쓴것, 남은것: Math.max(0, 스타트.무료건수 - 쓴것) };
}

/** 한국 날짜 YYYY-MM-DD. 서버는 UTC 라 자정부터 아침 아홉 시까지는 아직 어제다. */
export const 오늘날짜 = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);

/**
 * 이 기업이 인재의 개인정보(이름·연락처·사진·자기소개서·재직 매장)를 볼 수 있고
 * 제안을 보낼 수 있는가.
 *
 * 인재 목록과 경력·직군·희망조건은 기업회원이면 누구나 보되, 개인정보는 유료
 * 기간 안에 있는 곳에만 연다. 제안도 같은 문이다 — 개인정보를 못 보는 곳이
 * 보내는 제안은 받는 사람이 판단할 것이 없고, 그런 제안이 쌓이면 인재가 제안
 * 알림을 아예 안 열게 된다.
 *
 * 유료 여부는 날짜 하나(companies.paid_until)로 보고, 무엇을 샀는지는 등급
 * (companies.plan)이 말한다. 기간이 지나면 저절로 스타트으로 떨어진다.
 * 라이트는 공고를 위한 상품이라 이 문을 열지 않는다 — 인재를 여는 것은
 * 스탠다드부터다(lib/companyPlans.ts 의 `인재열람`).
 */
export async function 인재열람가능(companyId: string): Promise<boolean> {
  const { plan } = await 이용권(companyId);
  return !!plan && 플랜[plan].인재열람;
}

/**
 * 이 사람이 이 기업의 공고에 지원했는가(지원 취소는 빼고).
 *
 * 무료 기업회원에게 인재의 이름·연락처가 열리는 단 하나의 경우다. 지원은 본인이
 * 그 매장에 자기 이력서를 직접 낸 것이라, 유료 여부와 상관없이 지원자 관리에서
 * 실명으로 본다. 제안을 수락한 것은 여기 들지 않는다 — 수락은 「더 얘기해 보자」지
 * 이력서를 낸 것이 아니다.
 */
export async function 회사에지원함(companyId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM applications a JOIN job_postings j ON j.id = a.job_posting_id
      WHERE a.user_id = $2 AND j.company_id = $1 AND a.status <> 'WITHDRAWN' LIMIT 1`,
    [companyId, userId]
  );
  return rows.length > 0;
}

/** SQL 조각 — 위와 같은 뜻. userCol 은 사람 id 칸, companyRef 는 기업 id(자리표나 칸). */
export const 지원함SQL = (userCol: string, companyRef: string) =>
  `EXISTS (SELECT 1 FROM applications a_ JOIN job_postings j_ ON j_.id = a_.job_posting_id
            WHERE a_.user_id = ${userCol} AND j_.company_id = ${companyRef} AND a_.status <> 'WITHDRAWN')`;

/** 잠겼을 때 화면에 대신 보여줄 값. 서버에서 지워 보낸다 — 화면에서만 가리면
 *  응답에 남아 개발자 도구로 그대로 보인다. */
export const 잠긴값 = null;

/**
 * 이름 가리기 — 하지원 → 하○○.
 *
 * 과금 때문만이 아니다. 미용 업계는 바닥이 좁고, 재직 중인 디자이너가 몰래
 * 알아보는 것이 이 판의 현실이다. 「하지원 · 반티바 재직」이 그대로 뜨면 지금
 * 다니는 매장 사장님도 그것을 본다. 이름과 재직 매장은 실제로 연락할 수 있는
 * 곳에만 연다(원티드도 제안을 수락하기 전까지 '김 OO'로 둔다).
 */
export function 이름가리기(name?: string | null): string {
  const n = (name || "").trim();
  if (!n) return "";
  if (n.length <= 1) return n;
  return n[0] + "○".repeat(n.length - 1);
}

/** 받침 있으면 "으로", 없거나 ㄹ받침이면 "로" — "왁싱로"처럼 붙는 것을 막는다. */
function 로으로(word: string): "로" | "으로" {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "으로";
  const 받침 = (code - 0xac00) % 28;
  return 받침 === 0 || 받침 === 8 ? "로" : "으로";
}

/**
 * 재직 매장 가리기 — 매장 이름은 지우고 직책만 남긴다.
 * 「반티바 · 매니저」 → 「매니저로 일하는 중」. 판단에 필요한 것은 직책이고,
 * 어느 매장인지는 연락할 수 있게 된 다음에 알면 된다.
 */
export function 재직가리기(직책?: string | null): string | null {
  const p = (직책 || "").trim();
  return p ? `${p}${로으로(p)} 일하는 중` : null;
}
