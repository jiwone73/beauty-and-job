export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { signAccessToken } from "@/lib/jwt";
import { 기록 } from "@/lib/activity";

// 알바가 테스트 계정으로 메인 사이트에 들어가는 입구.
//
// 관리자 로그인과 회원 로그인은 별개라, 알바가 메인 사이트로 넘어가면 알바가 아니라 그
// 브라우저에 로그인돼 있던 회원(또는 비로그인)으로 보인다. 테스트를 하려면 비밀번호를 알아야
// 했는데, 공용 비밀번호를 화면에 적어 둘 수는 없다. 그래서 관리자 확인을 거쳐 테스트 계정에만
// 회원 토큰을 내준다.
//
// **테스트 계정만** 연다 — 이메일이 정확히 아래 모양일 때만. 실제 가입자 계정으로는 이 길로
// 들어갈 수 없다. 이 규칙을 넓히지 말 것(관리자가 임의 회원으로 들어가는 문이 된다).
const 테스트계정 = /^btwk2026\+(st|of|us|uo)\d{2,3}@gmail\.com$/;

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  let email = String(body?.email || "").trim().toLowerCase();
  // 「이벤트 대상 기업」 — 이벤트 체험 중인 테스트 기업 가운데 **가장 오래 로그인하지 않은 곳**으로 들어간다.
  // 누를 때마다 접속 시각이 갱신되니 자연스럽게 돌아가며, 알바는 번호를 고를 필요가 없다
  // (이벤트에는 상품 등급이 없다). 뽑는 범위도 테스트 계정 모양으로만 좁힌다.
  if (body?.이벤트) {
    const pick = await pool.query(
      `SELECT email FROM companies
        WHERE plan_source = 'EVENT' AND status = 'ACTIVE'
          AND is_test_account = true AND email LIKE 'btwk2026+%'
        ORDER BY last_login_at ASC NULLS FIRST, email
        LIMIT 1`
    );
    if (pick.rowCount === 0) return err("NOT_FOUND", "이벤트 대상 테스트 기업이 아직 없어요.", 404);
    email = String(pick.rows[0].email).toLowerCase();
  }
  const m = 테스트계정.exec(email);
  if (!m) return err("BAD_REQUEST", "테스트 계정이 아니에요.", 400);

  // st·of 는 기업, us·uo 는 개인이다.
  if (m[1] === "st" || m[1] === "of") {
    const r = await pool.query(
      `SELECT id, company_name, brand_name, email, status, logo_url, company_type, phone
         FROM companies WHERE email = $1`,
      [email]
    );
    if (r.rowCount === 0) return err("NOT_FOUND", "계정을 찾을 수 없어요.", 404);
    const c = r.rows[0];
    // 기업 로그인과 같은 문턱 — 막힌 계정은 들어갈 수 없다.
    if (c.status === "PENDING" || c.status === "SUSPENDED" || c.status === "REJECTED") {
      return err("CO_001", "로그인할 수 없는 상태의 계정이에요.", 403);
    }
    // 실제 로그인과 같이 접속 시각을 남긴다 — 노출 순서(같은 구간 안은 최근 로그인 순)를 접속하기로
    // 시험하려면 필요하다. 이 길은 위에서 테스트 계정만 걸러 낸 뒤라 실제 회원 기록은 건드리지 않는다.
    await pool.query(`UPDATE companies SET last_login_at = now() WHERE id = $1`, [c.id]);
    await 기록({ type: "company", id: c.id }, "LOGIN_DAY");
    const access_token = signAccessToken({ sub: c.id, owner_type: "company", role: "co_master" });
    return ok({ kind: "company", access_token, company: c });
  }

  const r = await pool.query(
    `SELECT id, email, name, phone, status, job_type, office_job_areas FROM users WHERE email = $1`,
    [email]
  );
  if (r.rowCount === 0) return err("NOT_FOUND", "계정을 찾을 수 없어요.", 404);
  const u = r.rows[0];
  if (u.status !== "ACTIVE") return err("USER_003", "비활성화된 계정이에요.", 403);
  const access_token = signAccessToken({ sub: u.id, owner_type: "user", role: "user" });
  return ok({ kind: "user", access_token, user: u });
}
