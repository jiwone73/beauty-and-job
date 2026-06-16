export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "company-logos"; // 기존 버킷 재사용 (cover/ 경로로 구분)
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// 공고 노출 이미지(cover) 업로드 — 1장만 저장
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
  if (payload.owner_type !== "company") {
    return err("AUTH_002", "기업 권한이 필요합니다.", 403);
  }
  const companyId = payload.sub;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("FILE_001", "파일이 없습니다.");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return err("FILE_002", "JPG, PNG, WebP 이미지만 업로드 가능합니다.");
    }
    if (file.size > MAX_SIZE) {
      return err("FILE_003", "파일 크기는 2MB 이하여야 합니다.");
    }

    const client = await pool.connect();
    try {
      // 기존 cover 삭제 (스토리지에서)
      const existing = await client.query(
        `SELECT cover_images FROM companies WHERE id = $1`,
        [companyId]
      );
      const oldCovers = existing.rows[0]?.cover_images;
      if (Array.isArray(oldCovers) && oldCovers[0]?.url) {
        const oldPath = oldCovers[0].url.split(`/${BUCKET}/`)[1];
        if (oldPath) {
          await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
        }
      }

      const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
      const fileName = `cover/${companyId}/${Date.now()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fileName, arrayBuffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("[company cover upload]", uploadError);
        return err("FILE_004", "업로드에 실패했습니다.");
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      const coverImages = [{ url: publicUrl, name: file.name }];

      await client.query(
        `UPDATE companies SET cover_images = $1 WHERE id = $2`,
        [JSON.stringify(coverImages), companyId]
      );

      return ok({ cover_images: coverImages });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[company cover upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}

// 공고 노출 이미지 삭제
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
  if (payload.owner_type !== "company") {
    return err("AUTH_002", "기업 권한이 필요합니다.", 403);
  }
  const companyId = payload.sub;

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT cover_images FROM companies WHERE id = $1`,
      [companyId]
    );
    const oldCovers = res.rows[0]?.cover_images;
    if (Array.isArray(oldCovers) && oldCovers[0]?.url) {
      const oldPath = oldCovers[0].url.split(`/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
      }
    }
    await client.query(
      `UPDATE companies SET cover_images = '[]'::jsonb WHERE id = $1`,
      [companyId]
    );
    return ok({ deleted: true });
  } catch (e) {
    console.error("[company cover delete]", e);
    return err("FILE_006", "삭제 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}