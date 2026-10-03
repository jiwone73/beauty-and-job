export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { 이용권, 무료칸, 이벤트라이트부여 } from "@/lib/companyEntitlement";
import { 무료소진안내 } from "@/lib/companyPlans";
import { 기록 } from "@/lib/activity";

// 공고 단건 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const result = await pool.query(
    `SELECT * FROM job_postings WHERE id = $1 AND company_id = $2`,
    [params.id, auth!.sub]
  );

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
  }
  return ok(result.rows[0]);
}

// 공고 수정 (상태 변경 포함)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  // 수정 가능한 필드 목록 (whitelist 방식 - 보안)
  //
  // 폼이 보내는 값은 하나도 빠짐없이 여기 있어야 한다. 빠진 칸은 저장이 조용히
  // 무시되고, 그러면 미리보기에는 새 값이 공고에는 옛 값이 남는다 — 폼 = 미리보기 =
  // 실제공고가 그 자리에서 깨진다. 등록(POST)이 넣는 칸과 같은 목록을 쓴다.
  const allowedFields = [
    "title", "job_type", "description", "requirements", "preferred_qualifications",
    "benefits", "employment_type", "benefit_tags", "salary_min", "salary_max", "salary_type",
    "salary_text",
    "location", "address", "work_locations", "work_type", "experience_level",
    "deadline", "status", "categories", "detail_images",
    "hiring_process",
    "work_days", "work_time", "work_time_slots", "work_period",
    "headcount", "headcount_text", "contact_methods", "responsibilities", "education",
    "gender_preference", "positions",
    "cover_images", "source_url",
    // 지원방법 — 「뷰티워크 온라인지원」이냐 바깥 주소냐.
    "apply_method", "external_apply_url",
    // 접수담당자
    "external_contact_name", "external_contact_phone", "external_contact_email",
    "external_contact_kakao",
    // 칸마다 가릴지 — 적어는 두되 구직자에게 보일지는 따로 고른다.
    "contact_name_hidden", "contact_phone_hidden", "contact_email_hidden", "contact_kakao_hidden",
  ];

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;
  const jsonbFields = ["detail_images", "hiring_process", "positions", "work_locations", "cover_images"];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      // null 은 그대로 NULL 로 넣는다. JSON.stringify(null) 은 "null" 이라
      // 「값 없음」이 아니라 JSON null 이 저장돼 읽는 쪽이 갈린다.
      values.push(jsonbFields.includes(field) && body[field] !== null
        ? JSON.stringify(body[field]) : body[field]);
    }
  }

  if (updates.length === 0) {
    return err("VALIDATION_001", "수정할 항목이 없습니다.", 400);
  }

  // 상태가 CLOSED로 변경되면 closed_at 자동 설정
  if (body.status === "CLOSED") {
    updates.push(`closed_at = NOW()`);
  }

  // 다시 거는 것은 새로 거는 것과 같다.
  //
  // 임시저장을 펴거나 마감한 공고를 다시 여는 길이 여기밖에 없다 — 무료 한 건
  // 한도는 등록(POST)과 같은 함수로 여기서도 똑같이 센다. 노출 여부 자체는
  // v_active_jobs가 status·deadline만 보고 그때그때 정하니, 여기서 따로
  // 날짜를 잡아 둘 것이 없다("게제기간은 없고 공고 마감일하고 이용기간이
  // 있겠지", 2026-10-02).
  let 재등록 = false;
  if (body.status === "ACTIVE") {
    const 지금 = await pool.query(
      `SELECT status::text AS status FROM job_postings WHERE id = $1 AND company_id = $2`,
      [params.id, auth!.sub]
    );
    if (지금.rowCount === 0) return err("JOB_001", "공고를 찾을 수 없거나 권한이 없습니다.", 404);
    if (지금.rows[0].status !== "ACTIVE") {
      재등록 = true;
      let { plan } = await 이용권(auth!.sub);
      // 임시저장을 펴거나 마감했던 공고를 다시 거는 자리다. 이벤트 기간에
      // 가입한 곳이 여기서 처음 거는 거면 라이트로 바뀐다(등록 POST와 같은 길).
      if (!plan) {
        const 이벤트혜택 = await 이벤트라이트부여(auth!.sub);
        if (이벤트혜택) plan = 이벤트혜택.plan;
      }
      // 무료는 한 번에 한 건이라, 다른 공고가 이미 걸려 있으면 막는다.
      if (!plan) {
        const { 남은것 } = await 무료칸(auth!.sub);
        if (남은것 <= 0) return err("PLAN_001", 무료소진안내, 403);
      }
      updates.push(`closed_at = NULL`);
    }
  }

  updates.push(`updated_at = NOW()`);

  values.push(params.id, auth!.sub);
  const query = `
    UPDATE job_postings
    SET ${updates.join(", ")}
    WHERE id = $${idx++} AND company_id = $${idx++}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없거나 권한이 없습니다.", 404);
  }
  // 마감·임시저장 공고를 다시 걸면 재등록, 그 밖의 수정은 수정으로 남긴다.
  기록({ type: "company", id: auth!.sub }, 재등록 ? "JOB_REPOST" : "JOB_EDIT", params.id);
  return ok(result.rows[0]);
}

// 공고 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  let result;
  try {
    result = await pool.query(
      `DELETE FROM job_postings WHERE id = $1 AND company_id = $2 RETURNING id`,
      [params.id, auth!.sub]
    );
  } catch (e: any) {
    // 지원 이력이 남은 공고는 통째로 지우면 그 지원자 기록까지 같이 사라진다
    // (외래키가 막아 준다) — 마감으로 돌리라고 안내한다. 원인을 못 알리면
    // 빈 응답으로 500만 떨어져 화면엔 "삭제 중 오류가 발생했습니다"만 뜬다.
    if (e?.code === "23503") {
      return err("JOB_002", "지원자가 있는 공고는 삭제할 수 없습니다. 마감으로 내려 주세요.", 409);
    }
    throw e;
  }

  if (result.rowCount === 0) {
    return err("JOB_001", "공고를 찾을 수 없거나 권한이 없습니다.", 404);
  }
  return ok({ deleted: true });
}