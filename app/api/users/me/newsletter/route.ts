export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 현재 뉴스레터 구독 상태 조회
export async function GET(req: NextRequest) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const r = await pool.query(
    `SELECT 1 FROM newsletter_subscribers
      WHERE email = (SELECT email FROM users WHERE id = $1)
        AND is_active = true
      LIMIT 1`,
    [auth!.sub]
  );
  return ok({ subscribed: (r.rowCount ?? 0) > 0 });
}

// 뉴스레터 구독 on/off
export async function PUT(req: NextRequest) {
  const { auth, res } = requireAuth(req, "user");
  if (res) return res;
  const { subscribe } = await req.json();
  if (subscribe) {
    await pool.query(
      `INSERT INTO newsletter_subscribers (email, source, is_active)
       SELECT email, 'profile', true FROM users WHERE id = $1
       ON CONFLICT (email) DO UPDATE SET is_active = true`,
      [auth!.sub]
    );
  } else {
    await pool.query(
      `UPDATE newsletter_subscribers SET is_active = false
        WHERE email = (SELECT email FROM users WHERE id = $1)`,
      [auth!.sub]
    );
  }
  return ok({ subscribed: !!subscribe });
}