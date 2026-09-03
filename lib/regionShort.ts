// 시/도 표시용 축약 (서울특별시 → 서울). 저장값은 원본 유지, 화면 표시에만 사용.
const SIDO_SHORT: Record<string, string> = {
  서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종",
  경기도: "경기", 강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
  전북특별자치도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남", 제주특별자치도: "제주",
};

export function shortSido(sido: string): string {
  return SIDO_SHORT[sido] || sido;
}

// "서울특별시 종로구" → "서울 종로구"
export function shortRegion(full: string): string {
  for (const [long, short] of Object.entries(SIDO_SHORT)) {
    if (full.startsWith(long)) return short + full.slice(long.length);
  }
  return full;
}

/** 주소에서 시·구까지만. "서울 강동구 고덕로 390 고덕아르테온 2층" → "서울 강동구".
 *  어느 동네인지만 알면 되는 자리(지원 창의 포지션 줄 등)에 쓴다 — 전체 주소는
 *  공고 본문에 그대로 있다. */
export function addressRegion(full: string): string {
  const s = shortRegion(String(full || "").trim());
  const m = s.match(/^(\S+)\s+(\S*[시군구])(?:\s|$)/);
  return m ? `${m[1]} ${m[2]}` : s;
}
