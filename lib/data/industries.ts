// 업종 목록 (뷰티 특화) — 회원 유형별
// 매장·살롱 회원(STORE)과 기업·브랜드 회원(OFFICE)에 각각 노출.
// BOTH 회원은 두 목록을 그룹으로 함께 노출.

export const STORE_INDUSTRIES = [
  "헤어샵",
  "네일샵",
  "피부·에스테틱",
  "속눈썹·왁싱·반영구",
  "메이크업",
  "애견미용",
  "토탈뷰티샵",
] as const;

export const OFFICE_INDUSTRIES = [
  "화장품·미용기기 제조·브랜드",
  "뷰티 유통·이커머스",
  "프랜차이즈 본사",
  "미용 교육·아카데미",
  "피부과·성형외과",
  "뷰티 마케팅·미디어",
  "뷰티 서비스·플랫폼",
] as const;

export type CompanyTypeLike = "STORE" | "OFFICE" | "BOTH" | null | undefined;

// 회원 유형에 맞는 업종 목록 반환 (BOTH는 그룹 형태)
export function industryGroupsFor(companyType: CompanyTypeLike): { label: string | null; items: readonly string[] }[] {
  if (companyType === "STORE") return [{ label: null, items: STORE_INDUSTRIES }];
  if (companyType === "OFFICE") return [{ label: null, items: OFFICE_INDUSTRIES }];
  // BOTH 또는 미지정: 둘 다 그룹으로
  return [
    { label: "매장·살롱", items: STORE_INDUSTRIES },
    { label: "기업·브랜드", items: OFFICE_INDUSTRIES },
  ];
}
