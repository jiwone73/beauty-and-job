// 회사 주소 조립.
//
// companies.address 는 우편번호 검색이 돌려준 "전체 주소"(시·도부터 다 붙은 값)이고,
// region_sido/region_sigungu 는 목록 필터용으로 따로 떼어 저장한 값이다.
// 셋을 그냥 이어 붙이면 "서울특별시 강남구 서울특별시 강남구 테헤란로 47길 38"처럼 앞부분이 두 번 나온다.
// 그래서 전체 주소가 있으면 그것만 쓰고, 없을 때만 시·도/시·군·구로 대체한다.
// 저장된 전체 주소를 "우편번호 검색이 채웠을 기본 주소"와 "직접 입력한 상세주소"로 되돌린다.
// 기본 주소는 도로명+번호(+건물명)까지이고, 그 뒤에 붙은 동·호수 등이 상세주소다.
// 형태를 못 알아보면 통째로 기본 주소로 두어(상세주소 빈 값) 정보를 잃지 않는다.
export function splitAddress(full?: string | null): { base: string; detail: string } {
  const s = (full || "").trim();
  if (!s) return { base: "", detail: "" };
  // 탐욕 매칭이라 "테헤란로 47길 38"처럼 도로명이 겹칠 때 마지막 번호까지 기본 주소로 잡는다.
  const m = s.match(/^(.*(?:대로|로|길)\s*\d+(?:-\d+)?(?:\s*\([^)]*\))?)\s*(.*)$/);
  if (!m) return { base: s, detail: "" };
  return { base: m[1].trim(), detail: m[2].trim() };
}

export function composeCompanyAddress(
  sido?: string | null,
  sigungu?: string | null,
  address?: string | null
): string {
  const full = (address || "").trim();
  if (full) return full;
  return [sido, sigungu].filter(Boolean).join(" ").trim();
}
