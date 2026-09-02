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
  return !isNaN(d.getTime()) && d < new Date();
}
