export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "avatars";
const MAX_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// 프로필 사진 업로드
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
    if (!ALLOWED_TYPES.includes(file.type)) {
      return err("FILE_002", "JPG, PNG, WebP 이미지만 업로드 가능합니다.");
    }
    if (file.size > MAX_SIZE) {
      return err("FILE_003", "파일 크기는 1MB 이하여야 합니다.");
    }

    const client = await pool.connect();
    try {
      // 기존 사진 있으면 삭제
      const existing = await client.query(
        `SELECT avatar_url FROM users WHERE id = $1`,
        [userId]
      );
      const oldUrl = existing.rows[0]?.avatar_url;
      if (oldUrl) {
        const oldPath = oldUrl.split(`/${BUCKET}/`)[1];
        if (oldPath) {
          await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
        }
      }

      // 새 파일 업로드 (확장자 유지)
      const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fileName, arrayBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("[avatar upload]", uploadError);
        return err("FILE_004", "업로드에 실패했습니다.");
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      await client.query(
        `UPDATE users SET avatar_url = $1 WHERE id = $2`,
        [publicUrl, userId]
      );

      return ok({ avatar_url: publicUrl });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[avatar upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}

// 프로필 사진 삭제
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
      `SELECT avatar_url FROM users WHERE id = $1`,
      [userId]
    );
    const oldUrl = res.rows[0]?.avatar_url;
    if (oldUrl) {
      const oldPath = oldUrl.split(`/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
      }
    }

    await client.query(
      `UPDATE users SET avatar_url = NULL WHERE id = $1`,
      [userId]
    );

    return ok({ deleted: true });
  } catch (e) {
    console.error("[avatar delete]", e);
    return err("FILE_006", "삭제 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}