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

  // 예전에 받아 둔 것은 급여가 원 단위(2,500,000)로 그대로 남아 있을 수 있다.
  // 지금 파서는 만원 단위로 정리해서 주지만(구조화 파서 수정 전 받은함에 쌓인
  // 것들은 고쳐지지 않는다), 폼은 이 값을 만원으로 믿고 10000을 곱해 저장한다 —
  // 그러면 정수 범위를 넘어(25,000,000,000) 등록이 그대로 실패한다.
  // "월급 220만원"을 넘어설 리 없는 값(10억=100000만원)보다 크면 원 단위로 보고 되돌린다.
  // 같은 소스 URL로 「불러오기」를 다시 누르면 지금 파서가 다시 만원으로 주므로
  // 그때는 이 보정이 필요 없다 — 여기 받은함 값만 옛 형식일 수 있다.
  const 급여단위보정 = (salaryType: any) => {
    const 원단위형태 = salaryType === "HOURLY" || salaryType === "DAILY";
    if (원단위형태) return;
    for (const 키 of ["salary_amount", "salary_amount_max"]) {
      const v = Number((parsed as any)[키]);
      if (v > 100000) (parsed as any)[키] = Math.round(v / 10000);
    }
  };
  급여단위보정((parsed as any).salary_type);

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

  // 상세요강 그림은 이름을 바꿔서 내보낸다.
  //
  // 파서는 상세 포스터를 "_detailImagesRaw" 에 담는데, 폼이 읽는 칸은 "detail_images" 다.
  // 주소를 넣어 불러오는 길(파싱 라우트)은 재호스팅하면서 이름을 바꿔 주는데, 목록에서
  // 골라 들어오는 이 길만 그 변환을 빠뜨리고 있었다. 그래서 상세 그림을 멀쩡히 들고도
  // 폼에는 한 장도 안 실렸다 — 받은함에 담긴 헤어인잡 33건·셀렉미 36건이 그랬다.
  const 상세그림 = (parsed as any)._detailImagesRaw;
  const 내보낼것: any = { ...parsed };
  delete 내보낼것._detailImagesRaw;
  if (Array.isArray(상세그림) && 상세그림.length) 내보낼것.detail_images = 상세그림;

  // 원문 주소는 공고에 남겨야 한다 — 값이 맞는지 대조하고, 아직 뽑는지 확인할 때 쓴다.
  // ai_parsed 는 폼이 「제대로 읽었다」로 알아듣는 표시다. 목록에 담긴 것은 이미
  // 파서가 읽어 낸 것이라, 이게 없으면 폼이 「AI 정리에 실패했다」고 알린다.
  return ok({ ...내보낼것, ai_parsed: true, source_url: r.rows[0].url });
}
