export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "resumes";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SIGNED_URL_EXPIRY = 300; // 5분

// 확장자 → contentType 매핑 (MIME 값이 아니라 파일명 확장자 기준으로 판단)
const EXT_CONTENT_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// 파일명에서 소문자 확장자 추출
function getExt(fileName: string): string {
  const parts = (fileName || "").split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

// 이력서 파일 업로드
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }

  if (payload.owner_type !== "user") {
    return err("AUTH_002", "사용자 권한이 필요합니다.", 403);
  }

  const userId = payload.sub;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return err("FILE_001", "파일이 없습니다.");

    // ✅ MIME(file.type) 대신 확장자로 검증 — 브라우저/OS가 MIME을 비워 보내도 통과
    const ext = getExt(file.name);
    if (!EXT_CONTENT_TYPE[ext]) {
      return err("FILE_002", "PDF, DOC, DOCX 파일만 업로드 가능합니다.");
    }
    if (file.size > MAX_SIZE) return err("FILE_003", "파일 크기는 5MB 이하여야 합니다.");

    // contentType도 확장자 기준으로 결정 (file.type이 비어도 안전)
    const contentType = EXT_CONTENT_TYPE[ext];

    const client = await pool.connect();
    try {
      // 기존 파일 있으면 삭제 (경로는 비공개 버킷 내부 경로로 저장돼 있음)
      const existing = await client.query(
        `SELECT resume_file_url FROM users WHERE id = $1`,
        [userId]
      );
      const oldPath = existing.rows[0]?.resume_file_url;
      if (oldPath) {
        await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
      }

      const filePath = `${userId}/${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[resume-file upload]", uploadError);
        return err("FILE_004", "업로드에 실패했습니다.");
      }

      // 비공개 버킷이므로 public URL이 아닌 "내부 경로"만 저장
      await client.query(
        `UPDATE users SET resume_file_url = $1, resume_file_name = $2, resume_file_size = $3, resume_file_uploaded_at = NOW() WHERE id = $4`,
        [filePath, file.name, file.size, userId]
      );

      // 업로드 직후 미리보기용 signed URL도 함께 발급해서 반환
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

      if (signedError) {
        console.error("[resume-file signed url]", signedError);
      }

      return ok({
        resume_file_name: file.name,
        resume_file_size: file.size,
        preview_url: signedData?.signedUrl || null,
      });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[resume-file upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}

// 이력서 파일 미리보기 URL 재발급 (링크 만료 시 재요청용)
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }

  if (payload.owner_type !== "user") {
    return err("AUTH_002", "사용자 권한이 필요합니다.", 403);
  }

  const userId = payload.sub;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT resume_file_url, resume_file_name, resume_file_size FROM users WHERE id = $1`,
      [userId]
    );
    const row = res.rows[0];
    if (!row?.resume_file_url) {
      return ok({ resume_file_name: null, resume_file_size: null, preview_url: null });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(row.resume_file_url, SIGNED_URL_EXPIRY);

    if (signedError) {
      console.error("[resume-file signed url]", signedError);
      return err("FILE_007", "파일 조회에 실패했습니다.", 500);
    }

    return ok({
      resume_file_name: row.resume_file_name,
      resume_file_size: row.resume_file_size,
      preview_url: signedData.signedUrl,
    });
  } finally {
    client.release();
  }
}

// 이력서 파일 삭제
export async function DELETE(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return err("AUTH_001", "인증이 필요합니다.", 401);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return err("AUTH_001", "유효하지 않은 토큰입니다.", 401);
  }

  if (payload.owner_type !== "user") {
    return err("AUTH_002", "사용자 권한이 필요합니다.", 403);
  }

  const userId = payload.sub;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT resume_file_url FROM users WHERE id = $1`,
      [userId]
    );
    const oldPath = res.rows[0]?.resume_file_url;
    if (oldPath) {
      await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
    }

    await client.query(
      `UPDATE users SET resume_file_url = NULL, resume_file_name = NULL, resume_file_size = NULL, resume_file_uploaded_at = NULL WHERE id = $1`,
      [userId]
    );

    return ok({ deleted: true });
  } catch (e) {
    console.error("[resume-file delete]", e);
    return err("FILE_006", "삭제 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}