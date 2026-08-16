export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 이메일 중복 확인 (가입 폼 실시간 검사용)
// ?email=...&scope=user|company
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim();
  if (!EMAIL_RE.test(email)) return err("VALIDATION_001", "올바른 이메일 형식이 아닙니다.", 400);

  // 이메일은 개인(users)·기업(companies) 통틀어 유일해야 함
  const [rUser, rComp] = await Promise.all([
    pool.query(
      `SELECT (password_hash IS NOT NULL) AS has_password,
              (kakao_id IS NOT NULL) AS kakao,
              (naver_id IS NOT NULL) AS naver
         FROM users WHERE email = $1 LIMIT 1`,
      [email]
    ),
    pool.query(`SELECT 1 FROM companies WHERE email = $1 LIMIT 1`, [email]),
  ]);
  const asUser = (rUser.rowCount ?? 0) > 0;
  const asCompany = (rComp.rowCount ?? 0) > 0;

  // 로그인 화면이 다음 단계를 정하려면 '누구의 계정인지'와 '비밀번호가 있는지'를 알아야 한다.
  //  · 기업 계정이면 기업 로그인으로 보낸다
  //  · 소셜로만 만든 계정이면 비밀번호 칸 대신 그 소셜 버튼을 보여 준다
  const u = rUser.rows[0] || {};
  return ok({
    available: !asUser && !asCompany,
    kind: asUser ? "user" : asCompany ? "company" : "none",
    hasPassword: asUser ? !!u.has_password : false,
    providers: asUser ? ["kakao", "naver"].filter((k) => u[k]) : [],
  });
}
