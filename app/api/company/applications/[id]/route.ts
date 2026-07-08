export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { sendResumeViewedEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";


const RESUME_BUCKET = "resumes";

// 지원자 단건 조회 (상세)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;
  const result = await pool.query(
    `SELECT a.id, a.status, a.applied_at, a.viewed_at, a.cover_letter, a.note, a.resume_snapshot,
            a.user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
            u.job_type AS user_job_type, u.portfolio_url, u.portfolio_filename,
            u.avatar_url AS user_avatar_url, u.notification_settings,
            u.gender AS user_gender, u.birth_date AS user_birth_date,
            u.region_sido AS user_region_sido, u.region_sigungu AS user_region_sigungu,
            u.address_road AS user_address_road, u.address_detail AS user_address_detail,
            a.job_posting_id, jp.title AS job_title,
            a.resume_file_url, a.resume_file_name, a.resume_file_size
     FROM applications a
     JOIN users u ON u.id = a.user_id
     JOIN job_postings jp ON jp.id = a.job_posting_id
     WHERE a.id = $1 AND jp.company_id = $2`,
    [params.id, auth!.sub]
  );
  if (result.rowCount === 0) {
    return err("APP_002", "지원 내역을 찾을 수 없습니다.", 404);
  }
  // 처음 조회 시 viewed_at 자동 기록 + 구직자에게 열람 알림
  if (!result.rows[0].viewed_at) {
    pool.query(
      `UPDATE applications SET viewed_at = NOW() WHERE id = $1`,
      [params.id]
    ).catch((e) => console.error("[viewed_at update]", e));

    (async () => {
      try {
        const co = await pool.query(
          `SELECT company_name FROM companies WHERE id = $1`,
          [auth!.sub]
        );
        const companyName = co.rows[0]?.company_name || "기업";
        const row = result.rows[0];
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
           VALUES ($1, 'APP_VIEWED', $2, $3, $4, 'application')`,
          [
            row.user_id,
            "기업이 내 지원서를 확인했어요",
            `${companyName}에서 '${row.job_title}' 지원서를 열람했어요.`,
            row.id,
          ]
        );

        const settings = row.notification_settings || {};
        if (row.user_email && settings.resume_viewed !== false) {
          const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
          const viewedAt = `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, "0")}.${String(kst.getUTCDate()).padStart(2, "0")} ${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
          sendResumeViewedEmail(row.user_email, row.user_name || "회원", row.job_title, companyName, viewedAt)
            .catch((e) => console.error("[email] 열람 알림 발송 실패", e));
        }
      } catch (e) {
        console.error("[notification] APP_VIEWED 생성 실패", e);
      }
    })();
  }

  const row = result.rows[0];
  const snap = row.resume_snapshot;

  // 첨부 이력서 파일 (지원 시점 박제본) → 비공개 버킷, 매번 signed URL 새로 발급
  let resumeFilePreviewUrl: string | null = null;
  if (row.resume_file_url) {
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(row.resume_file_url, 300);
    if (signedError) {
      console.error("[applicant resume-file signed url]", signedError);
    } else {
      resumeFilePreviewUrl = signedData.signedUrl;
    }
  }

  // 지원 시점 스냅샷이 있으면 박제본을 그대로 반환 (현재 이력서 조회 생략)
  if (snap && (snap.profile || snap.careers)) {
    return ok({
      ...row,
      is_snapshot: true,
      resume_file_preview_url: resumeFilePreviewUrl,
      resume: {
        profile: snap.profile || {},
        careers: snap.careers || [],
        educations: snap.educations || [],
        experiences: snap.experiences || [],
        languages: snap.languages || [],
        links: snap.links || [],
        certificates: snap.certificates || [],
      },
    });
  }

  // 스냅샷이 없는 옛 지원 건 → 현재 이력서로 폴백
  const appUserId = row.user_id;
  const [profile, careers, educations, experiences, languages, links, certificates] = await Promise.all([
    pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [appUserId]),
    pool.query(`SELECT * FROM user_careers WHERE user_id = $1 ORDER BY start_date DESC`, [appUserId]),
    pool.query(`SELECT * FROM user_educations WHERE user_id = $1 ORDER BY start_date DESC`, [appUserId]),
    pool.query(`SELECT * FROM user_experiences WHERE user_id = $1 ORDER BY created_at DESC`, [appUserId]),
    pool.query(`SELECT * FROM user_languages WHERE user_id = $1 ORDER BY created_at`, [appUserId]),
    pool.query(`SELECT * FROM user_links WHERE user_id = $1 ORDER BY created_at`, [appUserId]),
    pool.query(`SELECT * FROM user_certificates WHERE user_id = $1 ORDER BY issued_ym DESC`, [appUserId]),
  ]);

  return ok({
    ...row,
    is_snapshot: false,
    resume_file_preview_url: resumeFilePreviewUrl,
    resume: {
      profile: profile.rows[0] || {},
      careers: careers.rows,
      educations: educations.rows,
      experiences: experiences.rows,
      languages: languages.rows,
      links: links.rows,
      certificates: certificates.rows,
    },
  });
}

// 지원자 상태/메모 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));

  const allowedFields = ["status", "note", "hidden_by_company"];
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      values.push(body[field]);
    }
  }

  if (updates.length === 0) {
    return err("VALIDATION_001", "수정할 항목이 없습니다.", 400);
  }

  updates.push(`updated_at = NOW()`);
  values.push(params.id, auth!.sub);

  const query = `
    UPDATE applications a
    SET ${updates.join(", ")}
    FROM job_postings jp
    WHERE a.id = $${idx++}
      AND a.job_posting_id = jp.id
      AND jp.company_id = $${idx++}
    RETURNING a.id, a.status, a.note, a.updated_at
  `;

  let result;
  try {
    result = await pool.query(query, values);
  } catch (e: any) {
    console.error("[PATCH application]", e);
    return err("APP_003", e?.message || "상태 변경에 실패했습니다.", 400);
  }

  if (result.rowCount === 0) {
    return err("APP_002", "지원 내역을 찾을 수 없거나 권한이 없습니다.", 404);
  }
  return ok(result.rows[0]);
}
