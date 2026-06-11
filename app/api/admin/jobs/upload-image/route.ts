export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "job-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// 공고 상세 이미지 업로드 (관리자)
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin');
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("FILE_001", "파일이 없습니다.");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return err("FILE_002", "JPG, PNG, WebP 이미지만 업로드 가능합니다.");
    }
    if (file.size > MAX_SIZE) {
      return err("FILE_003", "파일 크기는 5MB 이하여야 합니다.");
    }

    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const fileName = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("[admin job image upload]", uploadError);
      return err("FILE_004", "업로드에 실패했습니다.");
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
    return ok({ url: urlData.publicUrl, name: file.name });
  } catch (e) {
    console.error("[admin job image upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했습니다.", 500);
  }
}