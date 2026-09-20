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

/** 어디에 붙은 파일인가. report 는 테스트 리포트의 화면 사진이다 —
 *  저장하는 방식이 같아 문의 첨부와 같은 자리를 쓴다. *_reply 는 관리자가
 *  답장 메일에 붙인 파일이다 — 문의 온 글의 첨부와 갈래를 나눠 담는다. */
export type 문의갈래 = "support" | "ad" | "report" | "support_reply" | "ad_reply";

/** 올린 파일을 버킷에 두고 어느 문의의 것인지 적어 둔다.
 *  한 개라도 실패하면 그 파일만 건너뛴다 — 문의 자체는 이미 접수됐으므로
 *  파일 때문에 접수를 되돌리지 않는다. */
export async function 첨부저장(갈래: 문의갈래, 문의번호: string | number, 파일들: File[]) {
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

/** 답장 메일에 붙인 파일(base64)을 올려 남긴다. 이메일 발송에 쓴 값을
 *  그대로 받는다 — 관리자가 답장을 쓸 때는 브라우저 File 이 아니라
 *  base64 로 이미 바꿔 보내오기 때문이다. */
export async function 답변첨부저장(
  갈래: "ad_reply" | "support_reply",
  문의번호: string | number,
  첨부들: { filename: string; content: string }[]
) {
  let 저장됨 = 0;
  for (const 첨부 of (첨부들 || []).slice(0, 첨부최대개수)) {
    if (!첨부?.filename || !첨부?.content) continue;
    const 확 = 확장자(첨부.filename);
    const 타입 = 확장자표[확];
    const 버퍼 = Buffer.from(첨부.content, "base64");
    if (!타입 || 버퍼.length > 첨부최대크기) continue;

    const 경로 = `${갈래}/${문의번호}/${Date.now()}-${저장됨}.${확}`;
    const { error } = await supabaseAdmin.storage
      .from(문의첨부버킷)
      .upload(경로, 버퍼, { contentType: 타입, upsert: false });
    if (error) {
      console.error("[답변 첨부 올리기]", 경로, error);
      continue;
    }
    await pool.query(
      `INSERT INTO inquiry_files (kind, inquiry_id, path, file_name, file_size)
       VALUES ($1, $2, $3, $4, $5)`,
      [갈래, 문의번호, 경로, 첨부.filename, 버퍼.length]
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
