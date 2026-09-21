import pool from "@/lib/db";

/**
 * 지금 기업에게 하는 이벤트 하나 — 서버에서 읽는다.
 *
 * 브라우저에서 받아 오던 때는 첫 그림이 한 번 깜빡였다. 첫 칠에서는 이벤트가
 * 없는 줄 알고 원래 배너와 원래 제목을 그리고, 잠시 뒤 답이 오면 그때 갈아
 * 끼웠기 때문이다. 서버가 정해서 내려주면 처음부터 맞는 것이 그려진다.
 */
export type 기업이벤트 = {
  id: string;
  title: string;
  /** 좁은 자리에 거는 짧은 제목. 없으면 title */
  short_title: string | null;
  /** 「10월 12일 ~ 11월 30일」. 본문 맺는말에서 뽑는다 */
  기간: string | null;
};

/** 본문 어딘가에 적힌 두 날짜를 집어 기간으로 만든다. 못 찾으면 null. */
function 기간뽑기(body: string): string | null {
  const m = body.match(/(\d+월\s*\d+일)[^\d]*?(\d+월\s*\d+일)/);
  return m ? `${m[1]} ~ ${m[2]}` : null;
}

export async function 기업이벤트읽기(): Promise<기업이벤트 | null> {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, short_title, body
         FROM notices
        WHERE type = 'event' AND status = 'published'
          AND (target = 'company' OR target = 'all')
        ORDER BY (target = 'company') DESC, is_pinned DESC,
                 COALESCE(published_at, created_at) DESC
        LIMIT 1`
    );
    const r = rows[0];
    if (!r) return null;
    return { id: r.id, title: r.title, short_title: r.short_title, 기간: 기간뽑기(r.body || "") };
  } catch {
    // 못 읽으면 이벤트가 없는 것으로 본다 — 화면이 무너지는 것보다 낫다.
    return null;
  }
}
