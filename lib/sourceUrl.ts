// 원문 주소를 견주기 위한 정규화.
//
// 같은 공고인데 http/https, www 유무, 끝의 슬래시가 달라 다른 주소로 보이는 일이 잦다.
// 반대로 쿼리스트링은 대부분 공고를 가리키는 값(idx=…)이라 지우면 안 된다.
export function normalizeSourceUrl(u: string | null | undefined): string {
  if (!u) return "";
  return String(u)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}
