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
  // 어느 자리로 제안하는가. 공고에 모집분야가 여럿이면 골라야 하고, 하나뿐이면
  // 화면이 알아서 0을 보낸다 — 뻔한 것을 매번 고르게 하지 않는다.
  const positionIndex = Number.isInteger(body?.positionIndex) ? Number(body.positionIndex) : null;
  if (!jobPostingId) return err("VALIDATION_001", "제안할 공고를 선택해주세요.", 400);
  if (!message) return err("VALIDATION_002", "제안 메시지를 입력해주세요.", 400);
  if (message.length > MAX_MESSAGE) return err("VALIDATION_003", `메시지는 ${MAX_MESSAGE}자 이내로 입력해주세요.`, 400);

  // 화면에서 막는 것만으로는 이 API 를 직접 부르면 그대로 넘어간다.
  //
  // 문이 둘이다. 유료 상품에 가입했는가(개인정보를 볼 수 있는가), 그리고
  // 이 제안에 붙일 공고가 실제로 열려 있는가. 앞은 값을 낸 사람인지고,
  // 뒤는 받는 사람이 근무지·급여를 보고 판단할 것이 있는지다 — 마감된 공고로
  // 제안이 오면 받은 사람은 확인할 길이 없다.
  if (!(await 인재열람가능(auth!.sub))) {
    return err("PROPOSAL_005", "유료 상품에 가입해야 제안할 수 있습니다.", 403);
  }

  const client = await pool.connect();
  try {
    const jobRes = await client.query(
      `SELECT title, positions FROM job_postings
        WHERE id = $1 AND company_id = $2 AND status = 'ACTIVE'
          AND (deadline IS NULL OR deadline >= CURRENT_DATE)`,
      [jobPostingId, auth!.sub]
    );
    if (jobRes.rowCount === 0) {
      return err("JOB_001", "진행 중인 공고에만 제안할 수 있어요. 공고가 마감되었는지 확인해 주세요.", 404);
    }
    const jobTitle = jobRes.rows[0].title;
    // 그 공고에 실제로 있는 자리인지 본다. 없는 번호가 들어오면 구직자 화면에
    // 아무것도 안 뜨거나 엉뚱한 자리가 뜬다.
    const 자리들 = Array.isArray(jobRes.rows[0].positions)
      ? jobRes.rows[0].positions.filter((x: any) => x && x.category) : [];
    let 고른자리: number | null = positionIndex;
    if (고른자리 !== null && !자리들[고른자리]) {
      await client.query("ROLLBACK");
      return err("JOB_002", "그 공고에 없는 모집분야예요.", 400);
    }
    // 자리가 하나뿐이면 고르고 말고가 없다.
    if (고른자리 === null && 자리들.length === 1) 고른자리 = 0;

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
    // 구직자가 '기업 채용 제안받기'를 꺼 두었으면 보내지 않는다.
    //   안 건드린 사람은 켜진 것으로 본다(!== false) — 이력서 열람 메일과 같은 규칙이고,
    //   설정이 생겼다고 이미 쓰던 사람의 동작이 바뀌지 않는다.
    if (target.notification_settings?.agent === false) {
      return err("PROPOSAL_002", "이 후보자는 채용 제안을 받지 않도록 설정했습니다.", 403);
    }

    const coRes = await client.query(`SELECT company_name FROM companies WHERE id = $1`, [auth!.sub]);
    const companyName = coRes.rows[0]?.company_name || "기업";

    // 같은 공고로 같은 사람에게는 한 번만 보낸다. 동시에 다섯 번 보내니 다섯 건이
    // 그대로 들어가 받는 사람이 알림·메일을 다섯 번 받았다. 먼저 보고, 그 틈으로
    // 겹쳐 들어온 것은 표의 유일 조건이 막는다 — 막힌 것도 같은 말로 답한다.
    const 보낸적 = await client.query(
      `SELECT 1 FROM proposals WHERE company_id = $1 AND user_id = $2 AND job_posting_id = $3`,
      [auth!.sub, params.userId, jobPostingId]
    );
    if ((보낸적.rowCount ?? 0) > 0) {
      return err("PROPOSAL_006", "이 공고로 이미 제안을 보냈어요.", 409);
    }

    // 남는 기록. 알림은 지워질 수 있어 여기가 제안의 원본이다.
    const 넣음 = await client.query(
      `INSERT INTO proposals (company_id, user_id, job_posting_id, message, position_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [auth!.sub, params.userId, jobPostingId, message, 고른자리]
    ).then(() => true).catch((e: any) => {
      if (e?.code === "23505") return false;
      throw e;
    });
    if (!넣음) {
      await client.query("ROLLBACK").catch(() => {});
      return err("PROPOSAL_006", "이 공고로 이미 제안을 보냈어요.", 409);
    }

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

    // 공고 없이 담아 둔 사람이면 스크랩도 이 공고로 옮긴다. 제안은 보냈는데 스크랩
    // 목록에는 계속 「공고 없이 담은 사람」으로 남아, 아직 공고가 없는 사람처럼 보였다.
    // 이 공고로도 이미 담아 두었으면 공고 없는 쪽만 지운다. 다른 공고로 담아 둔 것은
    // 건드리지 않는다. 옮기다 실패해도 제안은 이미 나갔으니 막지 않는다.
    let scrapJobIds: string[] | undefined;
    try {
      await client.query(
        `DELETE FROM company_talent_scraps
          WHERE company_id = $1 AND user_id = $2 AND job_posting_id IS NULL
            AND EXISTS (SELECT 1 FROM company_talent_scraps s
                         WHERE s.company_id = $1 AND s.user_id = $2 AND s.job_posting_id = $3)`,
        [auth!.sub, params.userId, jobPostingId]
      );
      await client.query(
        `UPDATE company_talent_scraps SET job_posting_id = $3
          WHERE company_id = $1 AND user_id = $2 AND job_posting_id IS NULL`,
        [auth!.sub, params.userId, jobPostingId]
      );
      const 담은 = await client.query(
        `SELECT COALESCE(job_posting_id::text, 'none') AS j FROM company_talent_scraps
          WHERE company_id = $1 AND user_id = $2`,
        [auth!.sub, params.userId]
      );
      scrapJobIds = 담은.rows.map((x: any) => x.j);
    } catch (e) {
      console.error("[talent propose] 스크랩 옮기기 실패", e);
    }

    if (target.email) {
      sendProposalEmail(target.email, target.name || "회원", jobTitle, companyName, message, jobPostingId)
        .catch((e) => console.error("[email] 제안 발송 실패", e));
    }

    return ok({ sent: true, scrapJobIds });
  } catch (e: any) {
    console.error("[talent propose]", e);
    return err("PROPOSAL_001", "제안 전송에 실패했습니다: " + e.message, 500);
  } finally {
    client.release();
  }
}
