export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 제안 열어봄 표시. 기업 쪽 성과(제안→열람)가 여기서 나온다.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  try {
    const { rowCount } = await pool.query(
      `UPDATE proposals SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
      [params.id, auth!.sub]
    );
    return ok({ read: true, updated: rowCount });
  } catch (e: any) {
    console.error("[proposal PATCH]", e);
    return err("PROPOSAL_003", "처리에 실패했습니다.", 500);
  }
}

// 「관심 있어요」. 수락/거절이 아니라 한 방향이다 — 관심이 있으면 누르고,
// 없으면 그냥 둔다. 기업에는 누른 사람만 보이고 거절은 통보되지 않는다.
// 이걸 누르면 기업이 내 연락처를 볼 수 있게 되고, 기업에 알림이 간다.
// 그다음은 기업이 전화하면 된다 — 이 업계 채용은 통화로 정해진다.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  try {
    // 관심은 대개 조건부다 — "주 4일 가능한가요" 한마디가 다음 통화를 짧게 만든다.
    // 선택이라 안 적고 보내도 관심은 전해진다.
    const body = await req.json().catch(() => ({}));
    const 한마디 = String(body?.message || "").trim().slice(0, 300) || null;

    // 이미 누른 것은 그대로 둔다(누른 시각이 뒤로 밀리지 않게).
    const { rows } = await pool.query(
      `UPDATE proposals p
          SET interested_at = COALESCE(p.interested_at, NOW()),
              interest_message = COALESCE(p.interest_message, $3)
        WHERE p.id = $1 AND p.user_id = $2
      RETURNING p.company_id, p.interested_at, p.interest_message,
                (SELECT title FROM job_postings WHERE id = p.job_posting_id) AS job_title,
                (SELECT name FROM users WHERE id = p.user_id) AS user_name`,
      [params.id, auth!.sub, 한마디]
    );
    if (!rows.length) return err("PROPOSAL_005", "제안을 찾을 수 없습니다.", 404);

    const r = rows[0];
    // 알림은 처음 누를 때 한 번만. 다시 눌러도 기업을 두 번 부르지 않는다.
    if (r.interested_at) {
      await pool.query(
        `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
         SELECT $1, 'PROPOSAL_INTEREST', $2, $3, $4, 'proposal'
          WHERE NOT EXISTS (
            SELECT 1 FROM notifications
             WHERE company_id = $1 AND related_id = $4 AND related_type = 'proposal')`,
        [
          r.company_id,
          `${r.user_name || "구직자"}님이 관심을 보였어요`,
          r.interest_message
            ? `${r.user_name || "구직자"}님: "${r.interest_message}"`
            : `${r.user_name || "구직자"}님이 '${r.job_title || "제안하신 공고"}'에 관심 있어요. 연락처를 확인할 수 있어요.`,
          params.id,
        ]
      ).catch((e) => console.error("[proposal interest notify]", e));
    }
    return ok({ interested: true });
  } catch (e: any) {
    console.error("[proposal POST]", e);
    return err("PROPOSAL_005", "처리에 실패했습니다.", 500);
  }
}

// 목록에서 치우기. 기업에는 알리지 않는다 — 거절 통보는 좁은 업계에서
// 서로에게 부담이고, 기업이 할 수 있는 일도 없다. 열람 여부까지만 보여준다.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;
  try {
    await pool.query(
      `UPDATE proposals SET hidden_at = NOW() WHERE id = $1 AND user_id = $2`,
      [params.id, auth!.sub]
    );
    return ok({ hidden: true });
  } catch (e: any) {
    console.error("[proposal DELETE]", e);
    return err("PROPOSAL_004", "처리에 실패했습니다.", 500);
  }
}
