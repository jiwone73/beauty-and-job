import pool from "@/lib/db";
import { findJobsForCompany } from "@/lib/external/findByCompany";

// 브랜드명으로 채용사이트를 훑어 채용유무를 갱신한다.
// 관리자 화면의 업데이트 버튼과 매일 도는 크론이 같은 코드를 쓴다.

/** 검색용 정규화: 괄호(영문·구버전명) 제거 → 대표 브랜드명만 ("리안헤어 (RIAHN)" → "리안헤어") */
export function coreName(brand: string): string {
  const cut = brand.replace(/[\(（].*$/g, "").replace(/\s*\/.*$/g, "").trim();
  return cut || brand.trim();
}

export type HiringTarget = { id: string; brand_name: string };

/**
 * 업체를 하나씩(순차) 조회해 is_hiring·found_jobs·found_count·last_checked_at 을 갱신한다.
 *
 * maxPages 는 사이트마다 몇 쪽까지 볼지다.
 *  · 관리자가 직접 누를 때는 3쪽 — 활성공고 "총 건수"까지 정확히 세야 한다.
 *  · 매일 도는 크론은 1쪽 — 새 공고는 늘 첫 쪽에 올라오므로 이걸로 충분하고,
 *    업체당 요청이 24번에서 8번으로 줄어 상대 사이트에 부담이 훨씬 적다.
 * gapMs 는 업체 사이 쉬는 시간이다. 쉬지 않고 이어 붙이면 한 사이트에 몰아치게 된다.
 */
export async function checkHiringFor(
  targets: HiringTarget[],
  opts: { maxPages?: number; gapMs?: number; deadlineMs?: number } = {}
): Promise<{ updated: any[]; hiring: number; jobs: number; newly: number }> {
  const maxPages = opts.maxPages ?? 3;
  const gapMs = opts.gapMs ?? 0;
  // 무료 요금제는 함수가 60초에서 끊긴다. 시간이 다 되면 남은 업체는 건드리지 않고
  // 끝낸다 — 확인한 지 오래된 순으로 뽑으므로 다음 날 자연히 그 업체 차례가 온다.
  const startedAt = Date.now();
  const deadlineMs = opts.deadlineMs ?? 0;

  const client = await pool.connect();
  const updated: any[] = [];
  let hiringCnt = 0;
  let jobCnt = 0;
  let newCnt = 0;
  try {
    for (let i = 0; i < targets.length; i++) {
      if (deadlineMs && Date.now() - startedAt > deadlineMs) break;
      const row = targets[i];
      let jobs: { idx: number; title: string; url: string; source: string }[] = [];
      try {
        const r = await findJobsForCompany(coreName(row.brand_name), {
          maxPages,
          strict: true,
          verifyOpen: true, // 제목에 마감 표시가 있는 공고는 뺀다
        });
        jobs = r.jobs;
      } catch {
        jobs = [];
      }
      // 지난번에 없던 공고에 "처음 본 날"을 찍어 둔다. 화면에서 NEW 를 붙이는 근거다.
      // 이미 있던 공고는 그 날짜를 그대로 물려주고, 날짜가 없던 옛 자료는 비워 둔다
      // (언제 올라왔는지 모르는 것을 새 공고라 부를 수는 없다).
      const prev = (await client.query(`SELECT found_jobs FROM target_companies WHERE id = $1`, [row.id])).rows[0];
      const prevJobs: any[] = Array.isArray(prev?.found_jobs) ? prev.found_jobs : [];
      const prevSeen = new Map<string, string>();
      for (const j of prevJobs) if (j?.url) prevSeen.set(j.url, j.first_seen || "");
      const today = new Date().toISOString().slice(0, 10);
      const marked = jobs.map((j) => ({
        ...j,
        first_seen: prevSeen.has(j.url) ? prevSeen.get(j.url) || "" : today,
      }));
      const newly = marked.filter((j) => !prevSeen.has(j.url)).length;

      const hiring = jobs.length > 0 ? "채용중" : "없음";
      if (jobs.length) { hiringCnt++; jobCnt += jobs.length; }
      newCnt += newly;
      const up = await client.query(
        `UPDATE target_companies
            SET is_hiring = $1, found_jobs = $2::jsonb, found_count = $3, last_checked_at = now()
          WHERE id = $4 RETURNING *`,
        [hiring, JSON.stringify(marked), jobs.length, row.id]
      );
      if (up.rows.length) updated.push(up.rows[0]);
      if (gapMs && i < targets.length - 1) await new Promise((r) => setTimeout(r, gapMs));
    }
  } finally {
    client.release();
  }
  return { updated, hiring: hiringCnt, jobs: jobCnt, newly: newCnt };
}
