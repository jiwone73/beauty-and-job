import pool from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";
import { 첨부최대개수, 첨부최대크기, 확장자표 } from "@/lib/inquiryFileLimits";

export { 첨부최대개수, 첨부최대크기, 붙일수있는확장자 } from "@/lib/inquiryFileLimits";

/** 문의 첨부는 비공개 버킷에 둔다 — 주소를 아는 사람이 바로 열지 못한다. */
export const 문의첨부버킷 = "inquiry-files";

function 확장자(이름: string) {
  const 조각 = (이름 || "").split(".");
  return 조각.length < 2 ? "" : 조각.pop()!.toLowerCase();
}

export type 문의갈래 = "support" | "ad";

/** 올린 파일을 버킷에 두고 어느 문의의 것인지 적어 둔다.
 *  한 개라도 실패하면 그 파일만 건너뛴다 — 문의 자체는 이미 접수됐으므로
 *  파일 때문에 접수를 되돌리지 않는다. */
export async function 첨부저장(갈래: 문의갈래, 문의번호: number, 파일들: File[]) {
  let 저장됨 = 0;
  for (const 파일 of 파일들.slice(0, 첨부최대개수)) {
    const 확 = 확장자(파일.name);
    const 타입 = 확장자표[확];
    if (!타입 || 파일.size > 첨부최대크기) continue;

    const 경로 = `${갈래}/${문의번호}/${Date.now()}-${저장됨}.${확}`;
    const { error } = await supabaseAdmin.storage
      .from(문의첨부버킷)
      .upload(경로, await 파일.arrayBuffer(), { contentType: 타입, upsert: false });
    if (error) {
      console.error("[문의 첨부 올리기]", 경로, error);
      continue;
    }
    await pool.query(
      `INSERT INTO inquiry_files (kind, inquiry_id, path, file_name, file_size)
       VALUES ($1, $2, $3, $4, $5)`,
      [갈래, 문의번호, 경로, 파일.name, 파일.size]
    );
    저장됨++;
  }
  return 저장됨;
}

/** 요청 몸통에서 값과 파일을 꺼낸다. 파일을 붙이지 않는 화면은 여태처럼
 *  JSON 으로 보내므로 둘 다 받는다. */
export async function 몸통읽기(req: Request): Promise<{ 값: any; 파일들: File[] }> {
  const 종류 = req.headers.get("content-type") || "";
  if (!종류.includes("multipart/form-data")) {
    return { 값: await req.json(), 파일들: [] };
  }
  const 폼 = await req.formData();
  const 값 = JSON.parse(String(폼.get("payload") || "{}"));
  const 파일들 = 폼.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  return { 값, 파일들 };
}
