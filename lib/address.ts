// 회사 주소 조립.
//
// companies.address 는 우편번호 검색이 돌려준 "전체 주소"(시·도부터 다 붙은 값)이고,
// region_sido/region_sigungu 는 목록 필터용으로 따로 떼어 저장한 값이다.
// 셋을 그냥 이어 붙이면 "서울특별시 강남구 서울특별시 강남구 테헤란로 47길 38"처럼 앞부분이 두 번 나온다.
// 그래서 전체 주소가 있으면 그것만 쓰고, 없을 때만 시·도/시·군·구로 대체한다.
export function composeCompanyAddress(
  sido?: string | null,
  sigungu?: string | null,
  address?: string | null
): string {
  const full = (address || "").trim();
  if (full) return full;
  return [sido, sigungu].filter(Boolean).join(" ").trim();
}
