export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

/** 받아 둔 공고 한 건. 등록 폼이 값을 채울 때 쓴다.
 *
 *  폼이 원문을 다시 읽지 않는다 — 「업데이트」할 때 이미 읽어 두었다.
 *  같은 글을 두 번 읽을 이유가 없고, 두 번 읽으면 그 사이 원문이 바뀌었을 때
 *  목록에 보이던 값과 폼에 채워지는 값이 달라진다. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const r = await pool.query(
    `SELECT url, parsed FROM external_job_inbox WHERE id = $1`, [params.id]);
  if (!r.rowCount) return err("INBOX_005", "받아 둔 공고를 찾을 수 없어요.", 404);
  const parsed = r.rows[0].parsed || {};
  // 원문 주소는 공고에 남겨야 한다 — 값이 맞는지 대조하고, 아직 뽑는지 확인할 때 쓴다.
  // ai_parsed 는 폼이 「제대로 읽었다」로 알아듣는 표시다. 목록에 담긴 것은 이미
  // 파서가 읽어 낸 것이라, 이게 없으면 폼이 「AI 정리에 실패했다」고 알린다.
  return ok({ ...parsed, ai_parsed: true, source_url: r.rows[0].url });
}
