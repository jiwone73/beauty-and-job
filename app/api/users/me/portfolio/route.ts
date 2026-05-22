export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "portfolios";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// 포트폴리오 업로드
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
    if (file.type !== "application/pdf") return err("FILE_002", "PDF 파일만 업로드 가능합니다.");
    if (file.size > MAX_SIZE) return err("FILE_003", "파일 크기는 5MB 이하여야 합니다.");

    const client = await pool.connect();
    try {
      const existing = await client.query(
        `SELECT portfolio_url FROM users WHERE id = $1`,
        [userId]
      );
      const oldUrl = existing.rows[0]?.portfolio_url;
      if (oldUrl) {
        const oldPath = oldUrl.split(`/${BUCKET}/`)[1];
        if (oldPath) {
          await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
        }
      }

      const fileName = `${userId}/${Date.now()}.pdf`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(fileName, arrayBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("[portfolio upload]", uploadError);
        return err("FILE_004", "업로드에 실패했습니다.");
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      await client.query(
        `UPDATE users SET portfolio_url = $1, portfolio_filename = $2, portfolio_uploaded_at = NOW() WHERE id = $3`,
        [publicUrl, file.name, userId]
      );

      return ok({
        portfolio_url: publicUrl,
        portfolio_filename: file.name,
      });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[portfolio upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}

// 포트폴리오 삭제
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
      `SELECT portfolio_url FROM users WHERE id = $1`,
      [userId]
    );
    const oldUrl = res.rows[0]?.portfolio_url;
    if (oldUrl) {
      const oldPath = oldUrl.split(`/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseAdmin.storage.from(BUCKET).remove([oldPath]);
      }
    }

    await client.query(
      `UPDATE users SET portfolio_url = NULL, portfolio_filename = NULL, portfolio_uploaded_at = NULL WHERE id = $1`,
      [userId]
    );

    return ok({ deleted: true });
  } catch (e) {
    console.error("[portfolio delete]", e);
    return err("FILE_006", "삭제 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}