export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendProposalEmail } from "@/lib/email";
import { 인재열람가능 } from "@/lib/companyEntitlement";

const MAX_MESSAGE = 1000;

// 인재검색에서 후보자에게 채용공고를 제안 — 알림 + 이메일로만 전달한다(채팅 없음).
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const jobPostingId = String(body?.jobPostingId || "").trim();
  const message = String(body?.message || "").trim();
  if (!jobPostingId) return err("VALIDATION_001", "제안할 공고를 선택해주세요.", 400);
  if (!message) return err("VALIDATION_002", "제안 메시지를 입력해주세요.", 400);
  if (message.length > MAX_MESSAGE) return err("VALIDATION_003", `메시지는 ${MAX_MESSAGE}자 이내로 입력해주세요.`, 400);

  // 화면에서 막는 것만으로는 이 API 를 직접 부르면 그대로 넘어간다.
  // 공고가 곧 입장권이라는 규칙을 여기서도 지킨다.
  if (!(await 인재열람가능(auth!.sub))) {
    return err("PROPOSAL_005", "진행중인 공고가 있어야 제안할 수 있습니다.", 403);
  }

  const client = await pool.connect();
  try {
    const jobRes = await client.query(
      `SELECT title FROM job_postings WHERE id = $1 AND company_id = $2`,
      [jobPostingId, auth!.sub]
    );
    if (jobRes.rowCount === 0) {
      return err("JOB_001", "공고를 찾을 수 없거나 권한이 없습니다.", 404);
    }
    const jobTitle = jobRes.rows[0].title;

    const userRes = await client.query(
      `SELECT u.id, u.name, u.email, u.notification_settings
       FROM users u
       JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = $1 AND u.status = 'ACTIVE' AND up.job_search_status <> 'CLOSED'
         AND NOT EXISTS (
           SELECT 1 FROM user_company_blocks b WHERE b.user_id = u.id AND b.company_id = $2
         )`,
      [params.userId, auth!.sub]
    );
    if (userRes.rowCount === 0) {
      return err("USER_001", "제안할 수 없는 후보자입니다.", 404);
    }
    const target = userRes.rows[0];

    const coRes = await client.query(`SELECT company_name FROM companies WHERE id = $1`, [auth!.sub]);
    const companyName = coRes.rows[0]?.company_name || "기업";

    // 남는 기록. 알림은 지워질 수 있어 여기가 제안의 원본이다.
    await client.query(
      `INSERT INTO proposals (company_id, user_id, job_posting_id, message)
       VALUES ($1, $2, $3, $4)`,
      [auth!.sub, params.userId, jobPostingId, message]
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, 'PROPOSAL', $2, $3, $4, 'job_posting')`,
      [
        target.id,
        `${companyName}에서 제안을 보냈어요`,
        `${companyName}에서 '${jobTitle}' 공고를 제안했어요.${message ? `\n\n"${message}"` : ""}`,
        jobPostingId,
      ]
    );

    if (target.email) {
      sendProposalEmail(target.email, target.name || "회원", jobTitle, companyName, message, jobPostingId)
        .catch((e) => console.error("[email] 제안 발송 실패", e));
    }

    return ok({ sent: true });
  } catch (e: any) {
    console.error("[talent propose]", e);
    return err("PROPOSAL_001", "제안 전송에 실패했습니다: " + e.message, 500);
  } finally {
    client.release();
  }
}
