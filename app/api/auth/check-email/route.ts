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
    pool.query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [email]),
    pool.query(`SELECT 1 FROM companies WHERE email = $1 LIMIT 1`, [email]),
  ]);
  const taken = (rUser.rowCount ?? 0) > 0 || (rComp.rowCount ?? 0) > 0;

  return ok({ available: !taken });
}
