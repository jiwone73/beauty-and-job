import pool from "@/lib/db";
import { 플랜, 스타트, 플랜인가, type PlanId } from "@/lib/companyPlans";

export type 이용권정보 = {
  /** 유료 기간 안에 있을 때의 등급. 기간이 지났거나 비면 null(= 스타트) */
  plan: PlanId | null;
  /** YYYY-MM-DD. 유료였던 적이 없으면 null. 이 날까지가 이용 기간이다(이 날 포함) */
  paidUntil: string | null;
  /** 오늘을 넣어 앞으로 며칠을 더 쓰는가. 마지막 날이 1, 기간 밖이면 0 */
  남은일: number;
  /** 무료 체험이 끝나는 날(YYYY-MM-DD). 아직 시작 전이면 null */
  체험끝: string | null;
  /** 지금이 무료 체험 기간 안인가 */
  체험중: boolean;
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
            GREATEST(0, (paid_until - CURRENT_DATE) + 1) AS 남은일,
            to_char(trial_until, 'YYYY-MM-DD') AS trial_until,
            (trial_until IS NOT NULL AND trial_until >= CURRENT_DATE) AS 체험중
       FROM companies WHERE id = $1`,
    [companyId]
  );
  const r = rows[0];
  if (!r) return { plan: null, paidUntil: null, 남은일: 0, 체험끝: null, 체험중: false };
  const plan = r.유효 && 플랜인가(r.plan) ? (r.plan as PlanId) : null;
  return {
    plan,
    paidUntil: r.paid_until ?? null,
    남은일: plan ? Number(r.남은일) : 0,
    체험끝: r.trial_until ?? null,
    체험중: !!r.체험중,
  };
}

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
 * 무료 체험을 아직 안 썼으면 지금 시작한다 — 끝나는 날을 돌려준다.
 *
 * 가입한 날이 아니라 **첫 공고를 거는 날**부터 센다. 가입만 해 두고 며칠 뒤에
 * 들어온 사람이 체험을 이미 까먹은 채로 시작하면 써 보지도 못하고 끝난다.
 *
 * 이미 시작했으면 그 날짜를 그대로 돌려준다(끝났어도). 한 번 쓴 체험은 다시
 * 시작되지 않는다.
 */
export async function 체험시작(companyId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `UPDATE companies
        SET trial_until = COALESCE(trial_until, CURRENT_DATE + ($2::int - 1)),
            updated_at = now()
      WHERE id = $1
      RETURNING to_char(trial_until, 'YYYY-MM-DD') AS trial_until`,
    [companyId, 스타트.게재일]
  );
  return rows[0]?.trial_until ?? null;
}

/**
 * 이 공고를 지금 걸면 언제까지 목록에 남는가(YYYY-MM-DD).
 *
 * 유료는 이용권이 끝나는 날까지, 무료는 등록일로부터 이레다. 공고를 처음 걸 때와
 * 마감한 것을 다시 열 때가 같은 규칙을 써야 한다 — 한쪽만 고치면 그쪽이 뒷문이 된다.
 */
/** 한국 날짜 YYYY-MM-DD. 서버는 UTC 라 자정부터 아침 아홉 시까지는 아직 어제다. */
export const 오늘날짜 = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);

export function 게재종료일(plan: PlanId | null, paidUntil: string | null, trialUntil: string | null): string | null {
  if (plan && paidUntil) return paidUntil;
  // 무료 공고는 체험이 끝나는 날까지다. 건건이 이레가 아니라 계정의 이레라,
  // 체험 중에 올린 공고는 몇 건이든 같은 날 함께 내려간다 — 그 날이 라이트를
  // 사는 날이 된다.
  return trialUntil;
}

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

/**
 * 재직 매장 가리기 — 매장 이름은 지우고 직책만 남긴다.
 * 「반티바 · 매니저」 → 「매니저로 일하는 중」. 판단에 필요한 것은 직책이고,
 * 어느 매장인지는 연락할 수 있게 된 다음에 알면 된다.
 */
export function 재직가리기(직책?: string | null): string | null {
  const p = (직책 || "").trim();
  return p ? `${p}로 일하는 중` : null;
}
