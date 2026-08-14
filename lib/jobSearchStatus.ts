// 구직상태 — 인재검색에서 '퇴직여부'(경력 종료일)를 대체한다.
// 종료일은 지난 일을 말할 뿐이고, 지금 제안을 받을 의사가 있는지는 본인만 안다.
export type JobSearchStatus = "SEEKING" | "OPEN" | "CLOSED";

export const JS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  SEEKING: { text: "구직중",    color: "#0a7a3d", bg: "#e8f6ee" },
  OPEN:    { text: "제안 검토",  color: "#8a6d00", bg: "#fdf4de" },
  CLOSED:  { text: "구직 안 함", color: "#999",    bg: "#f2f2f2" },
};

// 인재검색 필터. '구직 안 함'은 아예 검색 대상이 아니라 선택지에도 없다.
export const JS_FILTERS = ["전체", "구직중", "제안 검토"];

// 상태는 시간이 지날수록 신뢰도가 떨어지므로 마지막 갱신 시점을 함께 보여준다.
export function statusAge(at: string | null): string | null {
  if (!at) return null;
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return "오늘";
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
