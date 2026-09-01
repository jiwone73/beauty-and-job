export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 제안 스레드의 대화. 매장과 구직자가 같은 실을 쓴다 — 그래서 owner 를 지정하지 않고
// 받은 뒤에 이 제안의 당사자인지 따진다. 남의 스레드는 404 로 돌려보낸다(있는지
// 없는지도 알려 주지 않는다).
async function 당사자(req: NextRequest, proposalId: string) {
  const { auth, res } = requireAuth(req);
  if (res) return { auth: null, 쪽: null as null, res };
  const { rows } = await pool.query(
    `SELECT company_id, user_id FROM proposals WHERE id = $1`,
    [proposalId]
  );
  if (!rows.length) return { auth: null, 쪽: null as null, res: err("PROP_MSG_001", "제안을 찾을 수 없습니다.", 404) };
  const r = rows[0];
  if (auth!.owner_type === "user" && r.user_id === auth!.sub) return { auth, 쪽: "USER" as const, res: null };
  if (auth!.owner_type === "company" && r.company_id === auth!.sub) return { auth, 쪽: "COMPANY" as const, res: null };
  return { auth: null, 쪽: null as null, res: err("PROP_MSG_001", "제안을 찾을 수 없습니다.", 404) };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { 쪽, res } = await 당사자(req, params.id);
  if (res) return res;
  try {
    const { rows } = await pool.query(
      `SELECT id, sender, kind, body, appointment_at, appointment_status, created_at
         FROM proposal_messages WHERE proposal_id = $1 ORDER BY created_at`,
      [params.id]
    );
    // 상대가 보낸 것을 읽음으로 표시. 구직자에게는 이 값을 내보내지 않는다 —
    // 읽고 답 안 한 것이 드러나면 서로 감정만 상한다.
    await pool.query(
      `UPDATE proposal_messages SET read_at = NOW()
        WHERE proposal_id = $1 AND sender <> $2 AND read_at IS NULL`,
      [params.id, 쪽]
    ).catch(() => {});
    return ok({ me: 쪽, messages: rows });
  } catch (e: any) {
    console.error("[proposal messages GET]", e);
    return err("PROP_MSG_002", "불러오지 못했습니다.", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { 쪽, res } = await 당사자(req, params.id);
  if (res) return res;
  try {
    const b = await req.json().catch(() => ({}));
    const kind = b?.kind === "APPOINTMENT" ? "APPOINTMENT" : "TEXT";
    const body = String(b?.body || "").trim().slice(0, 1000);
    const at = b?.appointmentAt ? new Date(b.appointmentAt) : null;

    if (kind === "TEXT" && !body) return err("PROP_MSG_003", "보낼 내용을 적어주세요.", 400);
    if (kind === "APPOINTMENT") {
      if (!at || isNaN(at.getTime())) return err("PROP_MSG_003", "약속 시간을 골라주세요.", 400);
      if (at.getTime() < Date.now()) return err("PROP_MSG_003", "지난 시간으로는 잡을 수 없어요.", 400);
    }

    const { rows } = await pool.query(
      `INSERT INTO proposal_messages (proposal_id, sender, kind, body, appointment_at, appointment_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, sender, kind, body, appointment_at, appointment_status, created_at`,
      [params.id, 쪽, kind, body || null, kind === "APPOINTMENT" ? at : null,
       kind === "APPOINTMENT" ? "PROPOSED" : null]
    );

    await pool.query(`UPDATE proposals SET last_message_at = NOW() WHERE id = $1`, [params.id]).catch(() => {});
    await 알림(params.id, 쪽!, kind === "APPOINTMENT" ? "약속" : body);
    return ok(rows[0], 201);
  } catch (e: any) {
    console.error("[proposal messages POST]", e);
    return err("PROP_MSG_002", "보내지 못했습니다.", 500);
  }
}

// 상대에게 알린다. 알림이 안 가면 대화가 끊긴 줄도 모른다.
async function 알림(proposalId: string, 보낸쪽: "USER" | "COMPANY", 미리보기: string) {
  const { rows } = await pool.query(
    `SELECT p.company_id, p.user_id,
            (SELECT name FROM users WHERE id = p.user_id) AS user_name,
            (SELECT COALESCE(brand_name, company_name) FROM companies WHERE id = p.company_id) AS co_name
       FROM proposals p WHERE p.id = $1`,
    [proposalId]
  );
  if (!rows.length) return;
  const r = rows[0];
  const 줄임 = 미리보기.length > 40 ? `${미리보기.slice(0, 40)}…` : 미리보기;
  if (보낸쪽 === "USER") {
    await pool.query(
      `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
       VALUES ($1, 'PROPOSAL_INTEREST', $2, $3, $4, 'proposal')`,
      [r.company_id, `${r.user_name || "구직자"}님이 답했어요`, 줄임, proposalId]
    ).catch((e) => console.error("[proposal msg notify company]", e));
  } else {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, 'PROPOSAL', $2, $3, $4, 'proposal')`,
      [r.user_id, `${r.co_name || "매장"}에서 답했어요`, 줄임, proposalId]
    ).catch((e) => console.error("[proposal msg notify user]", e));
  }
}
