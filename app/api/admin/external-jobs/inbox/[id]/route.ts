export const dynamic = "force-dynamic";
// 그림을 여러 장 받아 옮기느라 시간이 걸린다 — 배포 기본값으로는 끊긴다.
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { rehostImages } from "@/lib/external/rehost";

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

  // 남의 그림은 우리 저장소로 옮겨 둔다.
  //
  // 헤어인잡은 다른 사이트에서 <img> 로 부르면 403 으로 막는다. 서버에서 받으면
  // 멀쩡한데 화면에서만 깨진다 — 등록 폼에 원본 주소를 그대로 태우면 배너가
  // 빈 네모로 뜬다.
  //
  // 목록을 긁어 받은함에 담는 길은 옮기기를 하지 않는다(긁을 때마다 수십 장을
  // 옮기면 느리고, 등록하지 않을 공고까지 저장소에 쌓인다). 그래서 폼이 값을
  // 가져가는 이 자리에서 한다 — 실제로 등록하려고 연 건만 옮긴다.
  const 옮길것 = (키: string) => {
    const v = (parsed as any)[키];
    return Array.isArray(v) ? v.filter((u: any) => /^https?:\/\//i.test(String(u))) : [];
  };
  const 배너 = 옮길것("images");
  const 상세 = 옮길것("_detailImagesRaw");
  const 남의것 = (arr: string[]) => arr.some((u) => !/supabase/i.test(u));
  if ((parsed as any)._rehost && (남의것(배너) || 남의것(상세))) {
    const referer = (parsed as any)._rehostReferer || r.rows[0].url || "";
    try {
      const [새배너, 새상세] = await Promise.all([
        배너.length ? rehostImages(배너, referer) : Promise.resolve([]),
        상세.length ? rehostImages(상세, referer) : Promise.resolve([]),
      ]);
      if (새배너.length) (parsed as any).images = 새배너;
      if (새상세.length) (parsed as any)._detailImagesRaw = 새상세;
      if (새배너.length || 새상세.length) {
        // 옮긴 주소를 받은함에도 적어 둔다 — 다음에 열 때 또 옮기지 않는다.
        await pool.query(
          `UPDATE external_job_inbox SET parsed = $2 WHERE id = $1`,
          [params.id, parsed]
        ).catch((e) => console.error("[inbox rehost 되적기]", e));
      }
    } catch (e) {
      console.error("[inbox rehost]", e);
      // 옮기기가 실패해도 폼은 열려야 한다 — 그림만 깨진 채로 나머지를 채운다.
    }
  }

  // 원문 주소는 공고에 남겨야 한다 — 값이 맞는지 대조하고, 아직 뽑는지 확인할 때 쓴다.
  // ai_parsed 는 폼이 「제대로 읽었다」로 알아듣는 표시다. 목록에 담긴 것은 이미
  // 파서가 읽어 낸 것이라, 이게 없으면 폼이 「AI 정리에 실패했다」고 알린다.
  return ok({ ...parsed, ai_parsed: true, source_url: r.rows[0].url });
}
