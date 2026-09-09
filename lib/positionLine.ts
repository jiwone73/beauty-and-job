/** 모집분야 한 줄.
 *
 *  공고 상세는 모집분야를 표로 그린다. 제안 화면은 그 표를 통째로 넣을 자리가
 *  없어 값만 세로바로 잇는다 — 열 이름은 빼고 값만.
 *
 *  열 이름·순서·규칙은 JobDetailView 의 posColDefs 를 그대로 옮겼다. 두 화면이
 *  다른 순서로 적으면 같은 공고를 두고 다른 자리처럼 읽힌다. 한쪽을 고치면
 *  다른 쪽도 같이 고쳐야 한다.
 */

/** 급여는 "월 320만원"처럼 한 글자로 저장된다 — 등록 화면은 '월급'이라 쓰므로
 *  같은 말로 편다. */
export const 급여펴기 = (v: string) =>
  String(v || "").replace(/^\s*([시일주월연])\s/, (_m, p1) =>
    ({ 시: "시급 ", 일: "일급 ", 주: "주급 ", 월: "월급 ", 연: "연봉 " } as Record<string, string>)[p1]);

/** 급여 칸에 실제로 나갈 말. 비어 있거나 「협의로 열어둠」이면 협의다. */
function 급여값(p: any): string {
  if (p?.salaryNego === "hidden") return "협의";
  const v = 급여펴기(p?.salary);
  return v || (p?.salaryNego === "open" ? "협의" : "");
}

/** 모집분야 한 자리를 「네일 아티스트 | 1명 | 정규직 | 무관 | 경력 | 주5일 10~19시 | 월급 240만원」로.
 *  값이 없는 칸은 세로바째로 빠진다 — 「무관 |  | 경력」처럼 빈자리가 생기지 않게. */
export function 모집분야한줄(p: any, 본사공고: boolean): string {
  if (!p) return "";
  const 칸 = [
    p.category,
    본사공고 ? "" : (p.headcount ? `${String(p.headcount).replace(/명$/, "")}명` : ""),
    p.location,
    p.employment,
    p.gender,
    p.career,
    본사공고 ? p.education : "",
    p.workDays || p.workTime || "",
    급여값(p),
  ];
  return 칸.map((x) => String(x || "").trim()).filter(Boolean).join(" | ");
}

/** 제안이 가리키는 자리. 기업이 고른 자리가 있으면 그것만, 없으면(옛 제안) 전부. */
export function 제안분야들(positions: any, 자리번호: number | null | undefined, 본사공고: boolean): string[] {
  const 목록 = Array.isArray(positions) ? positions.filter((p: any) => p && p.category) : [];
  if (목록.length === 0) return [];
  if (자리번호 !== null && 자리번호 !== undefined && 목록[자리번호]) {
    return [모집분야한줄(목록[자리번호], 본사공고)].filter(Boolean);
  }
  return 목록.map((p: any) => 모집분야한줄(p, 본사공고)).filter(Boolean);
}
