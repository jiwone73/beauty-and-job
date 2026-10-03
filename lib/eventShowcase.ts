import pool from "@/lib/db";

/**
 * 이벤트 채용관 설정. app_settings.event_showcase 에 이렇게 둔다.
 *
 *   {"from":"2026-10-12","to":"2026-12-30","until":"2027-03-30","title":"오픈이벤트 채용관","months":3,"plan":"PREMIUM"}
 *
 * from~to 는 가입 기간, months 는 승인일로부터 무료 체험 개월 수, plan 은 체험 등급이다.
 * until 은 마지막 가입자의 체험이 끝나는 날(to + months) — 이 날이 지나면 설정이 없는 것과 같다.
 * from~to 사이에 가입하고 그 사이에 공고를 올린 곳이 대상이고, until 까지
 * 그 줄을 세운다. 설정이 없거나 until 이 지났으면 줄 자체가 안 생긴다 —
 * 이벤트가 끝나면 값 하나만 지우면 된다.
 */
export type 이벤트설정 = {
  from: string; to: string; until: string; title?: string;
  /** 이벤트 무료 체험 — 가입 승인일로부터 몇 개월. 없으면 꺼짐(유료화). */
  months?: number;
  /** 체험으로 주는 등급. 없으면 라이트. */
  plan?: "LIGHT" | "STANDARD" | "PREMIUM";
};

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

/**
 * 지금 이벤트 무료 체험이 열려 있는가 — 설정에 months 가 있고 오늘이 가입 기간(from~to) 안일 때만 돌려준다.
 * 가입 기간 밖(시작 전·마감 후)에는 null — 유료 카드에 「이벤트 무료 체험」을 달거나 메인 줄서기로
 * 바꾸는 일은 이 값이 있을 때만 한다. 스위치를 끄는 것은 설정을 지우거나 months 를 빼는 것이다.
 */
export async function 이벤트체험중(): Promise<이벤트설정 | null> {
  return 체험여부(await 이벤트설정읽기());
}

/** 설정과 오늘만으로 정하는 순수 함수 — 스위치(설정이 없거나 months 가 없으면 꺼짐)를 점검하기 쉽게 따로 둔다. */
export function 체험여부(설정: 이벤트설정 | null, 오늘?: string): 이벤트설정 | null {
  if (!설정?.months) return null;
  const 날 = 오늘 ?? new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  return 날 >= 설정.from && 날 <= 설정.to ? 설정 : null;
}
