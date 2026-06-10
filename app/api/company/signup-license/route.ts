export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

const BUCKET = "business-licenses";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

// 가입 시 사업자등록증 업로드 (비인증 — 아직 계정 생성 전이므로 토큰 없음)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("FILE_001", "파일이 없습니다.");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return err("FILE_002", "JPG, PNG, WebP, PDF 파일만 업로드 가능합니다.");
    }
    if (file.size > MAX_SIZE) {
      return err("FILE_003", "파일 크기는 5MB 이하여야 합니다.");
    }

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
      "image/webp": "webp", "application/pdf": "pdf",
    };
    const ext = extMap[file.type] || "bin";
    const path = `pending/${randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[signup-license upload]", uploadError);
      return err("FILE_004", "업로드에 실패했습니다.");
    }

    return ok({ path });
  } catch (e) {
    console.error("[signup-license upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}