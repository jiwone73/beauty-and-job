export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";
import { 문의첨부버킷 } from "@/lib/inquiryFiles";

/** 첨부 한 개를 여는 주소를 끊어 준다. 버킷이 비공개라 주소는 1분만 산다.
 *  파일을 그대로 흘려보내지 않는 까닭은, 관리자 화면이 토큰을 머리에 실어
 *  보내기 때문이다 — <a href> 로는 그 머리를 붙일 수 없다. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const r = await pool.query(`SELECT path, file_name FROM inquiry_files WHERE id = $1`, [params.id]);
  if (r.rowCount === 0) return err("FILE_404", "파일을 찾을 수 없습니다.", 404);

  const { data, error } = await supabaseAdmin.storage
    .from(문의첨부버킷)
    .createSignedUrl(r.rows[0].path, 60, { download: r.rows[0].file_name });
  if (error || !data) {
    console.error("[문의 첨부 주소]", error);
    return err("FILE_500", "파일을 여는 데 실패했습니다.", 500);
  }
  return ok({ url: data.signedUrl, file_name: r.rows[0].file_name });
}
