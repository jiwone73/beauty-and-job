import pool from "@/lib/db";
import { 플랜, 플랜인가, type PlanId } from "@/lib/companyPlans";

export type 이용권정보 = {
  /** 유료 기간 안에 있을 때의 등급. 기간이 지났거나 비면 null(= 베이직) */
  plan: PlanId | null;
  /** YYYY-MM-DD. 유료였던 적이 없으면 null */
  paidUntil: string | null;
};

/**
 * 이 기업이 지금 무엇을 샀는가.
 *
 * 기간이 지나면 등급을 지워서 돌려준다 — 부르는 쪽이 날짜를 또 견주지
 * 않게 한다. 등급 칸에 값이 남아 있어도 기간 밖이면 베이직이다.
 */
export async function 이용권(companyId: string): Promise<이용권정보> {
  const { rows } = await pool.query(
    `SELECT plan, to_char(paid_until, 'YYYY-MM-DD') AS paid_until,
            (paid_until IS NOT NULL AND paid_until >= CURRENT_DATE) AS 유효
       FROM companies WHERE id = $1`,
    [companyId]
  );
  const r = rows[0];
  if (!r) return { plan: null, paidUntil: null };
  const plan = r.유효 && 플랜인가(r.plan) ? (r.plan as PlanId) : null;
  return { plan, paidUntil: r.paid_until ?? null };
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
 * (companies.plan)이 말한다. 기간이 지나면 저절로 베이직으로 떨어진다.
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
