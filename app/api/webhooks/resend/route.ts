export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import pool from "@/lib/db";

// Resend(Svix) 웹훅 서명 검증
function verifySvix(secret: string, id: string, ts: string, sigHeader: string, body: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${ts}.${body}`;
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");
  const sigs = sigHeader.split(" ").map((s) => (s.includes(",") ? s.split(",")[1] : s));
  return sigs.some((s) => {
    const a = Buffer.from(s);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

// 반송(bounce)·스팸신고(complaint) 발생 주소는 발송 대상에서 자동 제외
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const body = await req.text();
  const id = req.headers.get("svix-id") || "";
  const ts = req.headers.get("svix-timestamp") || "";
  const sig = req.headers.get("svix-signature") || "";

  if (!secret || !verifySvix(secret, id, ts, sig, body)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = event?.type;
  if (type === "email.bounced" || type === "email.complained") {
    const to = event?.data?.to;
    const addrs: string[] = Array.isArray(to) ? to : to ? [to] : [];
    for (const a of addrs) {
      if (a) {
        await pool.query(
          `UPDATE users SET email_bounced = true WHERE lower(email) = lower($1)`,
          [a]
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
