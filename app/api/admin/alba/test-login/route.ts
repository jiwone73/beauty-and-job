export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { signAccessToken } from "@/lib/jwt";

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
  const email = String(body?.email || "").trim().toLowerCase();
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
    // 비회원 시험용 — 토큰 없이 회사 이름만 돌려준다(그 이름으로 검색 목록에서 찾아 보게).
    if (body?.이름만) return ok({ kind: "company", company_name: c.company_name });
    // 기업 로그인과 같은 문턱 — 막힌 계정은 들어갈 수 없다.
    if (c.status === "PENDING" || c.status === "SUSPENDED" || c.status === "REJECTED") {
      return err("CO_001", "로그인할 수 없는 상태의 계정이에요.", 403);
    }
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
