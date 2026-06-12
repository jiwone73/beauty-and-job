export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendNewsletterEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-and-job.vercel.app";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 인증: 어드민 또는 cron
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const { res: authErr } = requireAuth(req, "admin");
    if (authErr) return authErr;
  }

  const { searchParams } = new URL(req.url);
  const onlyEmail = searchParams.get("onlyEmail"); // 있으면 테스트 발송

  const nl = await pool.query(
    `SELECT id, title, content_html, status FROM newsletters WHERE id = $1`,
    [params.id]
  );
  if (nl.rowCount === 0) return err("NL_001", "뉴스레터를 찾을 수 없습니다.", 404);
  const newsletter = nl.rows[0];

  // 발송 대상
  let targets: string[];
  if (onlyEmail) {
    targets = [onlyEmail];
  } else {
    if (newsletter.status === "sent") {
      return err("NL_002", "이미 발송된 뉴스레터입니다.", 400);
    }
    const subs = await pool.query(
      `SELECT email FROM newsletter_subscribers WHERE is_active = true`
    );
    targets = subs.rows.map((r: any) => r.email);
  }
  if (targets.length === 0) return err("NL_003", "발송 대상이 없습니다.", 400);

  const subject = `(광고) ${newsletter.title}`;
  let sent = 0;
  for (const email of targets) {
    const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
    const html = (newsletter.content_html || "").replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubUrl);
    try {
      await sendNewsletterEmail(email, subject, html);
      sent++;
    } catch (e) {
      console.error("[newsletter send]", email, e);
    }
  }

  // 전체 발송일 때만 sent 처리 (테스트는 상태 안 바꿈)
  if (!onlyEmail) {
    await pool.query(
      `UPDATE newsletters SET status = 'sent', sent_at = NOW(), sent_count = $2 WHERE id = $1`,
      [params.id, sent]
    );
  }

  return ok({ sent, total: targets.length, test: !!onlyEmail });
}