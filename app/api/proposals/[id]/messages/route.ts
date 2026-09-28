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
    `SELECT p.company_id, p.user_id, p.created_at, p.interested_at, p.declined_at, p.canceled_at,
            EXISTS (SELECT 1 FROM user_company_blocks b
                     WHERE b.user_id = p.user_id AND b.company_id = p.company_id) AS blocked,
            -- 약속 장소의 기본값. 그 공고의 근무지가 먼저고, 없으면 매장 주소다.
            --   지점이 여럿인 매장은 근무지를 work_locations 에 따로 담는다. 그것도
            --   보지 않으면 지점 공고인데 본점 주소로 약속을 보내게 된다.
            COALESCE(
              NULLIF(TRIM(jp.address), ''),
              NULLIF(TRIM(CONCAT_WS(' ',
                jp.work_locations -> 0 ->> 'address',
                NULLIF(jp.work_locations -> 0 ->> 'detail', ''))), ''),
              NULLIF(TRIM(c.address), ''),
              NULLIF(TRIM(CONCAT_WS(' ', c.region_sido, c.region_sigungu)), '')
            ) AS 기본장소,
            COALESCE(c.brand_name, c.company_name) AS 매장명
       FROM proposals p
       LEFT JOIN job_postings jp ON jp.id = p.job_posting_id
       LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.id = $1`,
    [proposalId]
  );
  if (!rows.length) return { auth: null, 쪽: null as null, res: err("PROP_MSG_001", "제안을 찾을 수 없습니다.", 404) };
  const r = rows[0];
  if (auth!.owner_type === "user" && r.user_id === auth!.sub) return { auth, 쪽: "USER" as const, res: null, 제안: r };
  if (auth!.owner_type === "company" && r.company_id === auth!.sub) return { auth, 쪽: "COMPANY" as const, res: null, 제안: r };
  return { auth: null, 쪽: null as null, res: err("PROP_MSG_001", "제안을 찾을 수 없습니다.", 404) };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { 쪽, res, 제안 } = await 당사자(req, params.id);
  if (res) return res;
  try {
    const { rows } = await pool.query(
      `SELECT id, sender, kind, body, appointment_at, appointment_place, appointment_status, created_at
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
    return ok({
      me: 쪽,
      messages: rows,
      blocked: !!제안?.blocked,
      expired: false,
      기본장소: 제안?.기본장소 || null,
      매장명: 제안?.매장명 || null,
    });
  } catch (e: any) {
    console.error("[proposal messages GET]", e);
    return err("PROP_MSG_002", "불러오지 못했습니다.", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { 쪽, res, 제안 } = await 당사자(req, params.id);
  if (res) return res;
  // 차단된 사이에는 말이 오가지 않는다. 읽기는 남겨 둔다 — 지난 대화까지
  // 사라지면 무슨 일이 있었는지 확인할 길이 없다.
  if (제안?.blocked) return err("PROP_MSG_005", "더 이상 대화할 수 없어요.", 403);
  // 매장은 제안을 보낸 순간부터 말을 걸 수 있다 — 수락을 기다리지 않는다
  // ("제안하기가 완료되면 수락전이라도 채팅을 할수 있게 해줘"). 전에는 상대가
  // 받아들여야 열렸는데(PROP_MSG_007), 그 규칙을 없앤다. 다만 상대가 거절했거나
  // 매장이 거뒀으면 끝난 제안이라 계속 막는다("상대가 거절을 하면 막아야지").
  if (제안?.declined_at) return err("PROP_MSG_007", "구직자가 제안을 거절했어요.", 400);
  if (제안?.canceled_at) return err("PROP_MSG_007", "거둔 제안이에요.", 400);
  try {
    const b = await req.json().catch(() => ({}));
    const kind = b?.kind === "APPOINTMENT" ? "APPOINTMENT" : "TEXT";
    const body = String(b?.body || "").trim().slice(0, 1000);
    const at = b?.appointmentAt ? new Date(b.appointmentAt) : null;
    const 장소 = String(b?.place || "").trim().slice(0, 200) || 제안?.기본장소 || null;

    if (kind === "TEXT" && !body) return err("PROP_MSG_003", "보낼 내용을 적어주세요.", 400);
    if (kind === "APPOINTMENT") {
      // 최종 일정은 매장이 정한다 — 그날 예약이 몇 개인지, 누가 나오는지는 매장만
      // 안다. 장소도 그 공고의 근무지라 구직자가 고칠 값이 아니다. 구직자는 묻고
      // (메시지) 답한다(좋아요·어려워요). 화면에서만 감추면 API 를 직접 부르면
      // 그대로 들어오므로 여기서 막는다.
      if (쪽 !== "COMPANY") return err("PROP_MSG_007", "면접 일정은 매장이 보냅니다.", 403);
      if (!at || isNaN(at.getTime())) return err("PROP_MSG_003", "약속 시간을 골라주세요.", 400);
      if (at.getTime() < Date.now()) return err("PROP_MSG_003", "지난 시간으로는 잡을 수 없어요.", 400);
    }

    const { rows } = await pool.query(
      `INSERT INTO proposal_messages (proposal_id, sender, kind, body, appointment_at, appointment_place, appointment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, sender, kind, body, appointment_at, appointment_place, appointment_status, created_at`,
      [params.id, 쪽, kind, body || null, kind === "APPOINTMENT" ? at : null,
       kind === "APPOINTMENT" ? 장소 : null,
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
    // 기업 쪽 종 알림에는 더 안 남긴다 — 구직자가 보낸 채팅 메시지는 이제 헤더의
    // 채팅 아이콘(제안·스크랩의 미답변 대화 수, unanswered_chats)이 전담한다
    // ("채팅아이콘은 말그대로 채팅메시지, 그외는 종에 넣으면 되고" — 같은 일이
    // 두 아이콘에 겹쳐 뜨면 안 된다는 요청). 관심을 처음 보인 순간(interest, 위
    // proposals/[id]/route.ts)은 메시지가 아니라 그대로 종에 남는다.
  } else {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
       VALUES ($1, 'PROPOSAL', $2, $3, $4, 'proposal')`,
      [r.user_id, `${r.co_name || "매장"}에서 답했어요`, 줄임, proposalId]
    ).catch((e) => console.error("[proposal msg notify user]", e));
  }
}
