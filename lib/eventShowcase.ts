import pool from "@/lib/db";

/**
 * 이벤트 채용관 설정. app_settings.event_showcase 에 이렇게 둔다.
 *
 *   {"from":"2026-10-12","to":"2026-10-31","until":"2026-11-30","title":"오픈이벤트 채용관"}
 *
 * from~to 사이에 가입하고 그 사이에 공고를 올린 곳이 대상이고, until 까지
 * 그 줄을 세운다. 설정이 없거나 until 이 지났으면 줄 자체가 안 생긴다 —
 * 이벤트가 끝나면 값 하나만 지우면 된다.
 */
export type 이벤트설정 = { from: string; to: string; until: string; title?: string };

export async function 이벤트설정읽기(): Promise<이벤트설정 | null> {
  try {
    const { rows } = await pool.query(
      `SELECT value, to_char(CURRENT_DATE, 'YYYY-MM-DD') AS 오늘
         FROM app_settings WHERE key = 'event_showcase'`);
    if (!rows[0]?.value) return null;
    const v = JSON.parse(rows[0].value) as 이벤트설정;
    if (!v?.from || !v?.to || !v?.until || v.until < rows[0].오늘) return null;
    return v;
  } catch { return null; }
}
