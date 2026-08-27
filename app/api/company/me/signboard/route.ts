export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { supabaseAdmin } from "@/lib/supabase";
import { shrinkImage } from "@/lib/imageShrink";

const BUCKET = "company-logos"; // 기존 버킷 재사용 (signboard/ 경로로 구분)
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// 매장 간판 사진 업로드 — 이미 브라우저에서 정사각형으로 크롭해 보낸다.
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
      const existing = await client.query(
        `SELECT signboard_url FROM companies WHERE id = $1`,
        [companyId]
      );
      const oldUrl = existing.rows[0]?.signboard_url;
      if (oldUrl) {
        const oldPath = oldUrl.split(`/${BUCKET}/`)[1];
        if (oldPath) {
          await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
        }
      }

      const 줄인 = await shrinkImage(Buffer.from(await file.arrayBuffer()), file.type);
      const fileName = `signboard/${companyId}/${Date.now()}.${줄인.ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fileName, 줄인.buf, {
          contentType: 줄인.contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[company signboard upload]", uploadError);
        return err("FILE_004", "업로드에 실패했습니다.");
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      await client.query(
        `UPDATE companies SET signboard_url = $1 WHERE id = $2`,
        [publicUrl, companyId]
      );

      return ok({ signboard_url: publicUrl });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[company signboard upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}

// 매장 간판 사진 삭제
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
      `SELECT signboard_url FROM companies WHERE id = $1`,
      [companyId]
    );
    const oldUrl = res.rows[0]?.signboard_url;
    if (oldUrl) {
      const oldPath = oldUrl.split(`/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
      }
    }
    await client.query(
      `UPDATE companies SET signboard_url = NULL WHERE id = $1`,
      [companyId]
    );
    return ok({ deleted: true });
  } catch (e) {
    console.error("[company signboard delete]", e);
    return err("FILE_006", "삭제 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}
