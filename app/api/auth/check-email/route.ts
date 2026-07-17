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
  const scope = url.searchParams.get("scope") === "company" ? "company" : "user";

  if (!EMAIL_RE.test(email)) return err("VALIDATION_001", "올바른 이메일 형식이 아닙니다.", 400);

  const table = scope === "company" ? "companies" : "users";
  const r = await pool.query(`SELECT 1 FROM ${table} WHERE email = $1 LIMIT 1`, [email]);

  return ok({ available: (r.rowCount ?? 0) === 0 });
}
