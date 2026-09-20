// 인재검색 공개 여부.
//
// 예전엔 "구직중 / 좋은 제안은 검토 / 구직 안 함" 셋을 물었다. 그런데 실제로 이
// 값이 정하는 것은 "기업이 내 이력서를 볼 수 있는가" 하나였다. 묻는 말과 그
// 결과가 어긋나 있었다.
//
// 온도를 나눈 라벨도 뺐다. 지키기가 어려워서다 — 취업하고도 '구직중'을 그대로
// 두면 매장이 연락했다가 "저 구직 안 하는데요"를 듣는다. 그런 일이 몇 번 겹치면
// 매장이 인재검색을 안 쓴다. 지킬 것이 하나뿐인 편이 낫다.
//
// DB 값은 그대로 둔다(SEEKING / OPEN / CLOSED). 옛 OPEN 도 '공개'로 읽는다.
export type JobSearchStatus = "SEEKING" | "OPEN" | "CLOSED";

/** 공개 = SEEKING. 끄면 CLOSED. */
export const 공개 = "SEEKING" as const;
export const 비공개 = "CLOSED" as const;

/** 저장된 값이 무엇이든 공개인지 아닌지로 읽는다. */
export const isOpenToCompanies = (v: string | null | undefined) => v !== "CLOSED";

export const JS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  SEEKING: { text: "공개",     color: "#0a7a3d", bg: "#e8f6ee" },
  OPEN:    { text: "공개",     color: "#0a7a3d", bg: "#e8f6ee" },
  CLOSED:  { text: "비공개",   color: "#999",    bg: "#f2f2f2" },
};

// 검색 대상이 곧 공개한 사람이라, 걸러낼 것이 남지 않는다.
export const JS_FILTERS = ["전체"];

// 공개해 둔 지 오래되면 그만큼 덜 미덥다. 마지막으로 손댄 때를 함께 보여준다.
export function statusAge(at: string | null): string | null {
  if (!at) return null;
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return "오늘";
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
