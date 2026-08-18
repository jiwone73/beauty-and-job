import pool from "@/lib/db";
import { normalizeSourceUrl } from "@/lib/sourceUrl";

// 원문이 내려간 공고를 우리 쪽에서도 마감시킨다.
//
// 목록에서 안 보인다고 바로 내리면 안 된다. 검색이 한 번 헛돌거나 순위가 밀려도
// 안 보이기 때문이다. 그래서 "목록에서 사라졌다"는 후보로만 쓰고, 원문 주소를
// 직접 열어 정말 없어졌는지 확인한 것만 마감시킨다.
//
// 지우지 않고 마감(CLOSED)으로 둔다. 구직자에게는 안 보이지만 관리자는 무엇이
// 왜 내려갔는지 볼 수 있어야 하고, 잘못 내렸을 때 되돌릴 수 있어야 한다.

// 로그인해야 글이 보이는 곳. 밖에서 열면 살아 있는 글이든 지워진 글이든
// 똑같은 껍데기가 온다(맨사 카페로 확인: 32,913 vs 32,921바이트, 내용 동일).
// 그러니 이런 주소는 열어 봐야 알 수 없다 — 나이로 판단한다.
export const LOGIN_WALLED = /cafe\.naver\.com|instagram\.com|band\.us|facebook\.com|blog\.naver\.com\/PostView/i;

// 로그인 벽 뒤 공고를 몇 날까지 살려 둘지. 외부 공고의 평균 수명이 34일이라
// 그보다 넉넉히 잡았다. 너무 짧으면 살아 있는 공고를 내리게 된다.
export const WALLED_MAX_AGE_DAYS = 45;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** 제목에서 그 공고를 알아볼 만한 낱말을 뽑는다(한글·영문·숫자 4자 이상). */
function titleKeys(title: string): string[] {
  return (title.match(/[가-힣A-Za-z0-9]{4,}/g) || [])
    .filter((w) => !/^(디자이너|모집합니다|채용합니다|구합니다|스탭|스태프|인턴|매장|직원)$/.test(w))
    .slice(0, 6);
}

/** 원문이 사라졌거나 마감 표시가 붙었는지 — 확실할 때만 true */
async function isGone(url: string, title = ""): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "ko,en;q=0.8" } });
    clearTimeout(t);
    // 404/410 은 글이 지워진 것. 그 밖의 오류(500·타임아웃 등)는 사이트 사정일 수
    // 있으니 건드리지 않는다 — 애매하면 그냥 두는 편이 낫다.
    if (r.status === 404 || r.status === 410) return true;
    if (!r.ok) return false;

    const buf = Buffer.from(await r.arrayBuffer());
    let h = new TextDecoder("utf-8").decode(buf);
    if ((h.match(/�/g)?.length || 0) > 5) { try { h = new TextDecoder("euc-kr").decode(buf); } catch { /* keep */ } }

    // 사이트가 "지워진 글"이라고 말해 주는 경우
    if (/마감된\s*채용/.test(h) && /조회할\s*수\s*없|history\.back/.test(h)) return true;
    if (/삭제(?:되었|된)\s*(?:글|게시물|공고)|존재하지\s*않는\s*(?:글|게시물|공고)/.test(h)) return true;
    // 공고가 살아 있는데 제목만 완료 표시로 바뀐 경우
    if (/(?:채용|모집|충원|구인)\s*완료|마감\s*(?:되었|됐|완료)/.test(h.slice(0, 4000))) return true;

    // 사이트가 "없는 글"에도 200과 함께 빈 껍데기 페이지를 주는 곳이 있다
    // (헤어인잡은 날짜가 "( ~ 월 일까지 )"로 비어 있는 틀만 돌려준다).
    // 그런 경우를 가리려면 그 페이지에 이 공고 제목이 실제로 있는지 보면 된다.
    // 제목을 알아볼 낱말이 하나도 없으면 그 글은 거기 없는 것이다.
    const keys = LOGIN_WALLED.test(url) ? [] : titleKeys(title);
    if (keys.length >= 2) {
      const plain = h.replace(/<[^>]+>/g, " ");
      if (!keys.some((k) => plain.includes(k))) return true;
    }
    return false;
  } catch {
    return false; // 못 열었다고 마감으로 보지 않는다
  }
}

/**
 * candidates: 이번 갱신에서 목록에 안 잡힌 원문 주소들.
 * 그중 우리가 올린 활성 공고가 있는 것만 원문을 열어 보고, 정말 없어졌으면 마감시킨다.
 */
export async function closeGoneJobs(
  candidates: string[],
  opts: { max?: number } = {}
): Promise<{ checked: number; closed: { id: string; title: string; url: string }[] }> {
  const max = opts.max ?? 10;
  const norm = [...new Set(candidates.map((u) => normalizeSourceUrl(u)).filter(Boolean))];
  if (!norm.length) return { checked: 0, closed: [] };

  // 원문 주소가 우리 공고와 이어져 있고 아직 살아 있는 것만 확인 대상.
  const { rows } = await pool.query(
    `SELECT id, title, source_url FROM job_postings
      WHERE status = 'ACTIVE' AND source_url IS NOT NULL AND source_url <> ''`
  );
  const mine = rows.filter((r: any) => norm.includes(normalizeSourceUrl(r.source_url))).slice(0, max);

  const closed: { id: string; title: string; url: string }[] = [];
  for (const j of mine) {
    if (!(await isGone(j.source_url, j.title))) continue;
    await pool.query(`UPDATE job_postings SET status = 'CLOSED', updated_at = now() WHERE id = $1`, [j.id]);
    closed.push({ id: j.id, title: j.title, url: j.source_url });
  }
  return { checked: mine.length, closed };
}

/**
 * 원문 주소를 가진 활성 공고를, 확인 안 된 지 오래된 순으로 돌아가며 살핀다.
 * 외부업체 리스트에 없는 곳(카페·인스타에서 옮겨 온 개인 매장)까지 덮기 위한 것이다.
 *
 * 읽을 수 있는 사이트는 원문을 열어 보고, 로그인 벽 뒤라 열어 봐야 알 수 없는 곳은
 * 나이로 판단한다 — 사람을 다 뽑은 공고가 몇 달씩 남아 지원자를 헛걸음시키는 것보다
 * 낫다고 봤다. 마감으로만 두므로 관리자가 되살릴 수 있다.
 */
export async function sweepSourceUrls(
  opts: { max?: number; deadlineAt?: number } = {}
): Promise<{ checked: number; closed: { title: string; why: string }[] }> {
  const max = opts.max ?? 10;
  const { rows } = await pool.query(
    `SELECT id, title, source_url, created_at FROM job_postings
      WHERE status = 'ACTIVE' AND source_url IS NOT NULL AND source_url <> ''
      ORDER BY source_checked_at ASC NULLS FIRST
      LIMIT $1`,
    [max]
  );

  const closed: { title: string; why: string }[] = [];
  let checked = 0;
  for (const j of rows) {
    if (opts.deadlineAt && Date.now() > opts.deadlineAt) break;
    checked++;
    let why = "";
    if (LOGIN_WALLED.test(j.source_url)) {
      const days = (Date.now() - new Date(j.created_at).getTime()) / 86400000;
      if (days > WALLED_MAX_AGE_DAYS) why = `올린 지 ${Math.round(days)}일 지남`;
    } else if (await isGone(j.source_url, j.title)) {
      why = "원문이 내려감";
    }
    if (why) {
      await pool.query(`UPDATE job_postings SET status = 'CLOSED', updated_at = now() WHERE id = $1`, [j.id]);
      closed.push({ title: j.title, why });
    }
    // 마감시켰든 아니든 본 시각은 남긴다 — 그래야 다음엔 다른 공고 차례가 온다.
    await pool.query(`UPDATE job_postings SET source_checked_at = now() WHERE id = $1`, [j.id]);
  }
  return { checked, closed };
}
