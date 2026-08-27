// 근무지와 희망 근무지가 서로 맞는지.
//
// 이 업계는 매일 출근하는 일이라 거리가 가장 먼저 걸리는 조건이다. 그래서
// 시도만 같으면 맞다고 볼 수 없다 — 서울 안에서도 강남구와 금천구는 출퇴근
// 한 시간이다. 시군구까지 견준다.
//
// 표기가 제각각이라(서울/서울시/서울특별시, 경기/경기도) 접미사를 걷어내고
// 조각으로 견준다.

const 쪼갬 = (s: string): string[] =>
  s.replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .split(/\s+/)
    .filter(Boolean);

/**
 * "same"   — 시군구까지 같다(또는 한쪽이 시도만 적어 그 안에 포함된다)
 * "differ" — 확실히 다르다
 * "unknown"— 한쪽 값이 없어 판단할 수 없다
 */
export function 지역비교(공고: string | null | undefined, 희망: string | null | undefined):
  "same" | "differ" | "unknown" {
  if (!공고 || !희망) return "unknown";
  const a = 쪼갬(공고), b = 쪼갬(희망);
  if (!a.length || !b.length) return "unknown";

  // 시도가 다르면 볼 것도 없다
  const 같은시도 = a[0].includes(b[0]) || b[0].includes(a[0]);
  if (!같은시도) return "differ";

  // 한쪽이 시도까지만 적었으면(예: "서울") 그 안은 다 맞다고 본다
  if (a.length < 2 || b.length < 2) return "same";

  // 시군구 — "경기도 성남시 분당구"와 "경기 성남시"처럼 깊이가 달라도 걸리게
  // 첫 조각(시도) 뒤쪽을 모두 견준다
  const 뒤a = a.slice(1), 뒤b = b.slice(1);
  const 겹침 = 뒤a.some((x) => 뒤b.some((y) => x.includes(y) || y.includes(x)));
  return 겹침 ? "same" : "differ";
}
