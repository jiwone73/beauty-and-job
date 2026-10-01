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

/**
 * 마감은 안 됐는데(회사가 내리지도, 마감일이 지나지도 않았는데) 게재기간
 * (listed_until)이 지나 지금 공개 목록엔 안 보이는 상태인가.
 *
 * 무료(스타트)는 게재기간이 끝나면 v_active_jobs에서 빠져 노출이 멈추지만,
 * job_postings.status는 그대로 ACTIVE라 공고·지원자 관리 화면에는 계속
 * "진행중"으로만 보였다("게재기간때문에 공고가 내려갔다는건 어떻게
 * 알려줄거야?"). 마감(closed)과는 다른, 셋째 상태로 구분한다.
 */
export function 노출종료인가(
  status?: string | null,
  deadline?: string | Date | null,
  listedUntil?: string | Date | null
): boolean {
  if (마감인가(status, deadline)) return false;
  if (status !== "ACTIVE" || !listedUntil) return false;
  const d = new Date(listedUntil);
  if (isNaN(d.getTime())) return false;
  const 오늘 = new Date();
  오늘.setHours(0, 0, 0, 0);
  const 종료날 = new Date(d);
  종료날.setHours(0, 0, 0, 0);
  return 종료날 < 오늘;
}
