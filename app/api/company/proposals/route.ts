export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { 제안분야들 } from "@/lib/positionLine";
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
      `SELECT p.id, p.created_at, p.read_at, p.interested_at, p.interest_message, p.declined_at, p.canceled_at, p.position_index, p.note,
              u.id AS user_id, u.name AS user_name, u.avatar_url, u.avatar_public,
              -- 누구인지 알아야 「이 사람에게 왜 보냈더라」가 풀린다. 이름만으로는
              -- 열 명 중 누구였는지 떠오르지 않는다. 인재검색 카드가 쓰는 값과
              -- 같은 것들이다 — 이미 열람한 사람들이라 새로 여는 정보가 아니다.
              u.gender,
              CASE WHEN u.birth_date IS NULL THEN NULL
                   ELSE EXTRACT(YEAR FROM AGE(u.birth_date))::int END AS age,
              up.sub_job, up.main_job_group,
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
                  AND ap.status <> 'WITHDRAWN') AS applied_at,
              -- 표가 공고별로 묶이므로 어느 공고인지 알아야 한다.
              p.job_posting_id,
              jp.status AS job_status,
              jp.deadline AS job_deadline,
              -- 보낸 제안 위쪽 공고 머리에 쓸 값들(기간·조건 줄).
              jp.created_at AS job_created_at,
              jp.positions AS job_positions,
              jp.job_type,
              jp.employment_type AS job_employment_type,
              jp.experience_level AS job_experience_level,
              jp.categories AS job_categories,
              jp.headcount AS job_headcount,
              -- 마지막으로 무슨 일이 있었나. 표의 「최근 활동」 열이 이걸 적는다.
              (SELECT m.created_at FROM proposal_messages m
                WHERE m.proposal_id = p.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
              (SELECT count(*) FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'TEXT')::int AS message_count,
              -- 잡힌 면접. 약속을 서로 받아들인 것만 센다.
              (SELECT m.appointment_at FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'APPOINTMENT'
                  AND m.appointment_status = 'ACCEPTED'
                ORDER BY m.appointment_at DESC LIMIT 1) AS appointment_at,
              -- 채용까지 갔는가. 지원서 상태가 최종합격이면 그것이 제안의 끝이다.
              (SELECT ap.status FROM applications ap
                WHERE ap.user_id = p.user_id AND ap.job_posting_id = p.job_posting_id
                  AND ap.status <> 'WITHDRAWN'
                ORDER BY ap.applied_at DESC LIMIT 1) AS application_status
         FROM proposals p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
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
      declinedAt: r.declined_at || null,
      canceledAt: r.canceled_at || null,
      // 어느 자리로 보낸 제안인지. 공고에 모집분야가 여럿이면 이게 없으면
      // 매장도 누구에게 무엇을 제안했는지 알 수 없다. 옛 제안은 비어 있어
      // 그때는 공고의 분야를 전부 적는다.
      positionLine: 제안분야들(r.job_positions, r.position_index,
        (r.job_type || "") === "OFFICE").join(" / ") || null,
      interestMessage: r.interest_message,
      userId: r.user_id,
      userName: r.user_name,
      // 사진만 감춘 사람은 아예 내려보내지 않는다 — 화면에서 가리면 응답에 남는다.
      avatarUrl: r.avatar_public === false ? null : r.avatar_url,
      gender: r.gender || null,
      age: r.age ?? null,
      // 직군은 소분류가 먼저다 — 「속눈썹·반영구 아티스트」가 「네일·속눈썹」보다 말이 된다.
      subJob: r.sub_job || r.main_job_group || null,
      jobTitle: r.job_title,
      lastSender: r.last_sender,
      blocked: r.blocked,
      appliedAt: r.applied_at || null,
      note: r.note || "",
      jobPostingId: r.job_posting_id || null,
      jobStatus: r.job_status || null,
      jobDeadline: r.job_deadline || null,
      jobCreatedAt: r.job_created_at || null,
      jobPositions: r.job_positions || null,
      jobEmploymentType: r.job_employment_type || null,
      jobExperienceLevel: r.job_experience_level || null,
      jobCategories: r.job_categories || null,
      jobHeadcount: r.job_headcount ?? null,
      lastMessageAt: r.last_message_at || null,
      messageCount: r.message_count || 0,
      appointmentAt: r.appointment_at || null,
      applicationStatus: r.application_status || null,
    })));
  } catch (e: any) {
    console.error("[company proposals]", e);
    return err("SERVER_001", "불러오지 못했습니다.", 500);
  }
}

// 메모 저장. 매장이 자기가 나중에 보려고 적는 한 줄이라 상대에게는 안 보인다.
export async function PATCH(req: NextRequest) {
  const { auth, res } = requireAuth(req, "company");
  if (res) return res;
  try {
    const b = await req.json().catch(() => ({}));
    const id = String(b?.id || "").trim();
    if (!id) return err("VALIDATION_001", "제안을 찾을 수 없습니다.", 400);
    const note = String(b?.note ?? "").slice(0, 200);
    // 남의 제안을 고치지 못하게 회사까지 함께 본다.
    const { rowCount } = await pool.query(
      `UPDATE proposals SET note = NULLIF($3, '') WHERE id = $1 AND company_id = $2`,
      [id, auth!.sub, note]
    );
    if (!rowCount) return err("PROP_001", "제안을 찾을 수 없습니다.", 404);
    return ok({ id, note });
  } catch (e: any) {
    console.error("[company proposal note]", e);
    return err("SERVER_001", "저장하지 못했습니다.", 500);
  }
}
