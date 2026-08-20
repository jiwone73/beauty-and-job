// 붙여넣은 주소를 보고 어디인지 알아낸다.
//
// 예전엔 "인스타그램 / 유튜브 / 기타" 를 고르게 했다. 그런데 매장이 보는 것은
// 작업물이지 그것이 인스타냐 유튜브냐가 아니다. 고르는 단계를 없애고 주소에서
// 알아낸다 — 사용자는 붙여넣기만 하고, 목록에는 긴 주소 대신 이름이 뜬다.
//
// 목록은 뷰티 업계가 실제로 쓰는 것만 담았다. 링크드인 같은 것은 이 바닥에서
// 쓰지 않아 넣어 봐야 자리만 차지한다.
// 다섯 개면 보여줄 곳을 다 담고도 남는다. 더 늘면 매장이 어느 것을 볼지 헤맨다.
export const MAX_LINKS = 5;

const 아는곳: [RegExp, string][] = [
  [/(^|\.)instagram\.com/i, "인스타그램"],
  [/(^|\.)(youtube\.com|youtu\.be)/i, "유튜브"],
  [/blog\.naver\.com/i, "네이버 블로그"],
  [/(^|\.)tiktok\.com/i, "틱톡"],
  [/(^|\.)threads\.(net|com)/i, "스레드"],
  [/(^|\.)brunch\.co\.kr/i, "브런치"],
  [/(^|\.)notion\.(site|so)/i, "노션"],
  [/tv\.naver\.com|(^|\.)navertv\./i, "네이버TV"],
  [/(^|\.)cafe\.naver\.com/i, "네이버 카페"],
  [/(^|\.)facebook\.com/i, "페이스북"],
  [/(^|\.)pinterest\./i, "핀터레스트"],
  [/(^|\.)behance\.net/i, "비핸스"],
];

/** 주소만 보고 어디인지 이름을 붙인다. 모르면 도메인을 그대로 쓴다. */
export function linkLabel(url: string): string {
  const host = hostOf(url);
  if (!host) return "링크";
  for (const [re, name] of 아는곳) if (re.test(host)) return name;
  // 모르는 곳은 도메인만 보여준다 — 긴 주소를 그대로 두는 것보다 읽기 쉽다.
  return host.replace(/^www\./, "");
}

function hostOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return "";
  }
}

/**
 * 폰에서 주소를 복사하면 "instagram.com/아이디" 처럼 https 가 빠진 채 붙는다.
 * 그대로 저장하면 눌러도 열리지 않으므로 앞을 채워 준다.
 */
export function normalizeUrl(url: string): string {
  const t = String(url || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

/** 주소로 볼 만한 값인지 — 점이 있고 공백이 없으면 받아들인다(너무 깐깐하면 못 넣는다). */
export function looksLikeUrl(url: string): boolean {
  const t = String(url || "").trim();
  return !!t && !/\s/.test(t) && /\.[a-z]{2,}/i.test(t);
}
