/**
 * 이 공고가 닫혔나.
 *
 * 매장이 마감을 누른 것(status)과 마감일이 지난 것(deadline)은 둘 다 「끝났다」다.
 * 지원자 화면과 매장 화면이 같은 공고를 두고 다르게 보이면 안 되니 한 곳에 둔다.
 */
export function 마감인가(status?: string | null, deadline?: string | Date | null): boolean {
  if (status === "CLOSED") return true;
  if (!deadline) return false;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return false;
  // 마감일 「당일」은 아직 받는 날이다. 시각까지 견주면 마감일이 8월 27일인
  // 공고가 27일 아침에 이미 닫힌 것으로 보인다 — 마감일에 저장된 시각이
  // 자정이기 때문이다. 그래서 날짜만 견준다.
  //
  // 공고·지원자 화면은 제 안에서 날짜로 세고 있었고 여기만 시각으로 세어,
  // 같은 공고가 한 화면에서는 마감, 다른 화면에서는 진행중으로 보였다.
  const 오늘 = new Date();
  오늘.setHours(0, 0, 0, 0);
  const 마감날 = new Date(d);
  마감날.setHours(0, 0, 0, 0);
  return 마감날 < 오늘;
}
