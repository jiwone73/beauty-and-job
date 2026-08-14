// 공고에 보여줄 업체 이름.
//
// 매장은 상호가 곧 브랜드라 "리안헤어 광명점" 한 이름으로 인식된다. 브랜드명을 따로 두면
// 공고에 "리안헤어"만 떠서 어느 지점인지 알 수 없고, 두 값이 어긋나기만 한다.
// 오피스는 다르다 — 근로계약·4대보험이 법인 기준이라 기업명이 필요하고,
// 목록에서 눈에 들어오는 건 브랜드명이라 둘 다 받아 브랜드를 앞세운다.
export function jobCompanyName(
  jobType: string | null | undefined,   // "STORE" | "OFFICE" | "매장" | "오피스"
  companyName?: string | null,
  brandName?: string | null
): string {
  const isStore = jobType === "STORE" || jobType === "매장";
  const co = (companyName || "").trim();
  const br = (brandName || "").trim();
  return (isStore ? co || br : br || co) || "";
}
