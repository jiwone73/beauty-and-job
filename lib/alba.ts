// 알바 근무 규칙 — 화면과 API 가 같은 기준으로 세도록 한 곳에 모아 둔다.
//
//  · 한 주는 월요일에 시작해 일요일에 끝난다 (요구사항: "매주 일요일까지")
//  · 주 최소 6시간, 합계 70시간을 채우면 끝
//  · 첫 주는 시작일이 든 주
// 날짜 경계는 한국 시간 기준이다. 서버가 UTC 로 돌아도 주가 밀리면 안 된다.

export const ALBA_ADMIN_ID = "alba";
export const ALBA_START_DATE = "2026-08-17"; // 1주차 월요일
export const ALBA_WEEKLY_TARGET_HOURS = 6;
// 이만큼 신호가 없으면 그 구간은 마지막 신호에서 끝난 것으로 본다.
// 화면 안내 문구도 이 값을 그대로 쓴다 — 숫자가 따로 놀지 않게.
export const ALBA_IDLE_GAP_MIN = 2;
export const ALBA_TOTAL_TARGET_HOURS = 70;
// 주 6시간은 '최소'다. 더 하는 건 괜찮고, 못 채운 주가 생기면
// 그 벌로 채워야 할 총 시간이 이만큼 늘어난다 (미달 주 1회당).
export const ALBA_SHORTFALL_PENALTY_HOURS = 1;

// 그 주 사정으로 할당을 줄여 준 기록 (주차 → 줄인 분).
// 그 주에 채워야 할 양만 낮춘다. 총량(70시간)은 건드리지 않는다 — 못 채운 시간은
// 어차피 남은 시간에 그대로 남아 뒤 주에서 채우게 되므로, 총량에 또 더하면 두 번 센다.
// 미달 벌점(위)과 다르다. 저건 못 채운 벌이고, 이건 미리 합의해 그 주만 가볍게 한 것이다.
export const ALBA_WEEK_RELIEF_MIN: Record<number, number> = {
  // 2주차(2026-08-24~30): 남은 할당 5시간 31분 → 3시간. 옮긴 2시간 31분.
  2: 151,
};

// 일감 쪽이 막혀 일할 수 없었던 주와 그 사유. 알바가 안 한 것이 아니라
// 할 수 없었던 주라 벌점을 매기지 않는다. 못 채운 시간은 남은 목표에 그대로
// 남고, 그만큼 일할 주가 없었으므로 계획 주 수를 그 수만큼 늘린다 — 총량은
// 그대로 채우되 끝나는 날이 밀린다.
export const ALBA_BLOCKED_WEEKS: Record<number, string> = {
  2: "기능보강·버그로 작업 불가", // 2026-08-24~30
};
export const ALBA_NO_PENALTY_WEEKS = Object.keys(ALBA_BLOCKED_WEEKS).map(Number);

/** 그 주에 채워야 할 분 (감면을 반영한 값) */
export function weekTargetMinutes(index: number): number {
  return Math.max(0, ALBA_WEEKLY_TARGET_HOURS * 60 - (ALBA_WEEK_RELIEF_MIN[index] || 0));
}

/** 감면해 전체로 옮긴 시간의 합 (분) */
export function totalReliefMinutes(): number {
  return Object.values(ALBA_WEEK_RELIEF_MIN).reduce((a, b) => a + b, 0);
}

const KST = "Asia/Seoul";

/** UTC 시각을 한국 날짜(YYYY-MM-DD)로 */
export function kstDate(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 한국 시간 기준 시:분 (HH:MM) */
export function kstTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: KST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** YYYY-MM-DD 를 하루 단위로 더한다 (시간대에 휘둘리지 않게 문자열로 계산) */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400000;
  const nd = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${nd.getUTCFullYear()}-${p(nd.getUTCMonth() + 1)}-${p(nd.getUTCDate())}`;
}

/** 두 날짜 사이의 일수 */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export type AlbaWeek = {
  index: number;      // 1주차, 2주차 …
  start: string;      // 월요일
  end: string;        // 일요일
  minutes: number;    // 그 주 근무 분
  postings: number;   // 그 주 등록한 공고 수
  isCurrent: boolean;
  isFuture: boolean;
};

/** 시작일부터 목표를 채우는 데 필요한 주 수 (마지막 주는 남는 시간만큼만) */
export function totalWeeks(): number {
  // 막힌 주는 일할 수 없었으므로 계획에서 한 주씩 뒤로 민다.
  return Math.ceil(ALBA_TOTAL_TARGET_HOURS / ALBA_WEEKLY_TARGET_HOURS) + ALBA_NO_PENALTY_WEEKS.length;
}

/** 어떤 날짜가 몇 주차인지 (1부터). 시작 전이면 0 */
export function weekIndexOf(date: string): number {
  const diff = daysBetween(ALBA_START_DATE, date);
  if (diff < 0) return 0;
  return Math.floor(diff / 7) + 1;
}

/** 주차 목록을 만들고, 날짜별 분·공고수를 주차에 담아 준다 */
export function buildWeeks(
  today: string,
  minutesByDate: Record<string, number>,
  postingsByDate: Record<string, number>
): AlbaWeek[] {
  const planned = totalWeeks();
  // 목표 주차를 넘겨 일한 기록이 있으면 그 주까지 보여 준다.
  const lastLogged = Math.max(
    0,
    ...Object.keys(minutesByDate).map(weekIndexOf),
    ...Object.keys(postingsByDate).map(weekIndexOf)
  );
  const count = Math.max(planned, weekIndexOf(today), lastLogged);

  const weeks: AlbaWeek[] = [];
  for (let i = 1; i <= count; i++) {
    const start = addDays(ALBA_START_DATE, (i - 1) * 7);
    const end = addDays(start, 6);
    let minutes = 0;
    let postings = 0;
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, d);
      minutes += minutesByDate[day] || 0;
      postings += postingsByDate[day] || 0;
    }
    weeks.push({
      index: i,
      start,
      end,
      minutes,
      postings,
      isCurrent: today >= start && today <= end,
      isFuture: today < start,
    });
  }
  return weeks;
}

/** 분 → "3시간 20분" */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}
