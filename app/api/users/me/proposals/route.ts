export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { 제안분야들, 근무조건3행들 } from "@/lib/positionLine";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 받은 제안 목록.
//   공고 조건과 내 희망 조건을 함께 내려보내, 화면에서 "희망 지역과 같아요" 같은
//   맞는 점을 붙일 수 있게 한다 — 기업이 따로 쓰지 않아도 제안이 나를 보고 온
//   것처럼 읽힌다.
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "user");
  if (authErr) return authErr;

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.message, p.read_at, p.interested_at, p.created_at,
              p.declined_at, p.canceled_at, p.decline_reason, p.position_index,
              p.job_posting_id,
              c.company_name, c.brand_name,
              -- 받은제안 표의 "기업" 칸 — 보낸제안 표의 "인재" 칸과 같은 자리(1행
              -- 매장명, 2행 업종, 3행 지역). "받은제안은 보낸제안 테이블을 그대로
              -- 가져오면 되. 인재만 기업으로 바꾸면 되지."
              c.logo_url AS company_logo_url, c.industry AS company_industry,
              c.region_sido AS company_region_sido, c.region_sigungu AS company_region_sigungu,
              -- 마지막으로 누가 말했나 — 진행상황 칸의 "매장 답변대기"/"답변 필요"를 가른다.
              (SELECT sender FROM proposal_messages m
                WHERE m.proposal_id = p.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender,
              (SELECT m.created_at FROM proposal_messages m
                WHERE m.proposal_id = p.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
              -- "진행중" 탭의 최근 대화 미리보기 — 글(TEXT)만 본다, 약속 카드는
              -- 한 줄로 미리 보여줄 말이 없다.
              (SELECT m.body FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'TEXT'
                ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
              jp.title AS job_title, jp.status AS job_status, jp.deadline,
              jp.location, jp.employment_type, jp.salary_type, jp.salary_min, jp.salary_max,
              jp.contact_methods, jp.job_type, jp.positions, jp.created_at AS job_created_at,
              -- 지금 무슨 일까지 갔는가. 카드 오른쪽 상태와 단추가 이걸로 정해진다.
              (SELECT count(*) FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'TEXT')::int AS message_count,
              (SELECT m.appointment_at FROM proposal_messages m
                WHERE m.proposal_id = p.id AND m.kind = 'APPOINTMENT'
                  AND m.appointment_status = 'ACCEPTED'
                ORDER BY m.appointment_at DESC LIMIT 1) AS appointment_at,
              up.region_prefer, up.work_type_prefer
       FROM proposals p
       JOIN companies c    ON c.id  = p.company_id
       JOIN job_postings jp ON jp.id = p.job_posting_id
       LEFT JOIN user_profiles up ON up.user_id = p.user_id
       WHERE p.user_id = $1 AND p.hidden_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [auth!.sub]
    );

    const unread = rows.filter((r) => !r.read_at).length;
    // 모집분야는 공고 상세와 같은 규칙으로 한 줄로 편다(lib/positionLine).
    const 목록 = rows.map((r) => {
      const 조건행들 = 근무조건3행들(r.positions, r.position_index);
      // 자리를 못 골라 모집분야 전부를 이어붙일 때, 분야마다 조건이 같으면
      // 겹치는 값이 그대로 반복됐다 — 보낸제안 표와 같은 규칙으로 한 번만 남긴다.
      const 겹침없이 = (xs: string[]) => [...new Set(xs.filter(Boolean))].join(" / ") || null;
      return {
        ...r,
        positionLines: 제안분야들(r.positions, r.position_index, (r.job_type || "") === "OFFICE"),
        // 근무조건(요일·시간·급여) — 보낸제안 표의 근무조건 칸과 같은 규칙.
        workConditionDay: 겹침없이(조건행들.map((x) => x.요일)),
        workConditionTime: 겹침없이(조건행들.map((x) => x.시간)),
        workConditionSalary: 겹침없이(조건행들.map((x) => x.급여)),
      };
    });
    return ok({ proposals: 목록, unread });
  } catch (e: any) {
    console.error("[proposals GET]", e);
    return err("PROPOSAL_002", "제안을 불러오지 못했습니다: " + e.message, 500);
  }
}
