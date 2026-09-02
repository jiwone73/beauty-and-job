export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 매장이 보낸 제안 목록.
//
// 지금까지 볼 데가 없었다. 누구에게 언제 보냈는지, 읽기는 했는지, 며칠 남았는지를
// 알려면 인재 목록을 뒤져야 했다 — 7일 기한을 정해 놓고 정작 그 기한을 보는
// 화면이 없었다.
export async function GET(req: NextRequest) {
  const { auth, res } = requireAuth(req, "company");
  if (res) return res;
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.created_at, p.read_at, p.interested_at, p.interest_message,
              u.id AS user_id, u.name AS user_name, u.avatar_url, u.avatar_public,
              jp.title AS job_title,
              -- 상대가 마지막으로 말을 걸었는데 아직 답하지 않았는가
              (SELECT sender FROM proposal_messages m
                WHERE m.proposal_id = p.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
              EXISTS (SELECT 1 FROM user_company_blocks b
                       WHERE b.user_id = p.user_id AND b.company_id = p.company_id) AS blocked,
              -- 제안의 끝. 대화까지 갔는데 지원을 했는지 안 했는지가 이 화면에
              -- 없어서, 보낸 제안이 채용으로 이어졌는지를 볼 데가 없었다.
              (SELECT MIN(ap.applied_at) FROM applications ap
                WHERE ap.user_id = p.user_id AND ap.job_posting_id = p.job_posting_id
                  AND ap.status <> 'WITHDRAWN') AS applied_at
         FROM proposals p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN job_postings jp ON jp.id = p.job_posting_id
        WHERE p.company_id = $1
        ORDER BY p.created_at DESC
        LIMIT 200`,
      [auth!.sub]
    );
    return ok(rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      readAt: r.read_at,
      interestedAt: r.interested_at,
      interestMessage: r.interest_message,
      userId: r.user_id,
      userName: r.user_name,
      // 사진만 감춘 사람은 아예 내려보내지 않는다 — 화면에서 가리면 응답에 남는다.
      avatarUrl: r.avatar_public === false ? null : r.avatar_url,
      jobTitle: r.job_title,
      lastSender: r.last_sender,
      blocked: r.blocked,
      appliedAt: r.applied_at || null,
    })));
  } catch (e: any) {
    console.error("[company proposals]", e);
    return err("SERVER_001", "불러오지 못했습니다.", 500);
  }
}
