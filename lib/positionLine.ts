/** 모집분야 한 줄.
 *
 *  공고 상세는 모집분야를 표로 그린다. 제안 화면은 그 표를 통째로 넣을 자리가
 *  없어 값만 세로바로 잇는다 — 열 이름은 빼고 값만.
 *
 *  열 이름·순서·규칙은 JobDetailView 의 posColDefs 를 그대로 옮겼다. 두 화면이
 *  다른 순서로 적으면 같은 공고를 두고 다른 자리처럼 읽힌다. 한쪽을 고치면
 *  다른 쪽도 같이 고쳐야 한다.
 */
import { 시간표시줄들 } from "@/lib/shiftLines";

/** 금액에 천 단위 쉼표(2300 → 2,300). 공고 폼 급여 칸과 같은 모양으로 편다 —
 *  숫자만 따로 쉼표를 넣지 않으면 폼에서 본 "2,300만원"이 여기선 "2300만원"이 된다. */
export const 천단위 = (v: string) => {
  const [정수, 소수] = String(v ?? "").split(".");
  return 정수.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (소수 !== undefined ? "." + 소수 : "");
};

/** 지원방법 이름 — 저장 값(고르는 목록·비교에 쓰는 값)은 "뷰티워크 온라인지원" 그대로 두고
 *  화면에 보일 글자만 "온라인 지원"으로 줄인다. 값 자체를 바꾸면 이미 이 값으로 저장된
 *  공고를 다시 열었을 때 목록에서 안 골라진 것처럼 보이거나(CONTACT_METHOD_OPTIONS 매칭
 *  실패) 통째로 빠진다 — 폼 칩·요약 글자·공고 상세가 전부 이 함수 하나로만 이름을 바꾼다. */
export const 지원방법이름 = (m: string) => (m === "뷰티워크 온라인지원" ? "온라인 지원" : m);

/** 지원방법 여러 개를 이을 때 쓰는 글자("문자, 전화") — 폼 요약 글자와 공고 상세가
 *  각자 다른 구분자(", " ↔ "   ·   ")로 이었더니 같은 값인데 다르게 보였다. */
export const 지원방법줄 = (methods: string[]) => (methods || []).map(지원방법이름).join(", ");

/** 급여는 "월 320만원"처럼 한 글자로 저장된다 — 등록 화면은 '월급'이라 쓰므로
 *  같은 말로 펴고, 숫자에는 폼과 같이 쉼표를 넣는다. */
export const 급여펴기 = (v: string) =>
  String(v || "")
    .replace(/^\s*([시일주월연])\s/, (_m, p1) =>
      ({ 시: "시급 ", 일: "일급 ", 주: "주급 ", 월: "월급 ", 연: "연봉 " } as Record<string, string>)[p1])
    .replace(/\d[\d.]*/, (n) => 천단위(n));

/** 급여 칸에 실제로 나갈 말. 비어 있거나 「협의로 열어둠」이면 협의다. 금액을 적어 두고
 *  협의 여지만 남긴 경우(salaryNego "open")는 폼과 같이 금액 옆에 "협의"를 붙인다 —
 *  따로 줄을 만들지 않는다(폼은 상자 안 한 줄, 여기도 같은 자리에 이어 적는다). */
function 급여값(p: any): string {
  if (p?.salaryNego === "hidden") return "협의";
  const v = 급여펴기(p?.salary);
  if (!v) return p?.salaryNego === "open" ? "협의" : "";
  return p?.salaryNego === "open" ? `${v} 협의` : v;
}

/** 모집분야 한 자리를 「네일 아티스트 | 1명 | 정규직 | 경력 | 주5일 10~19시 | 월급 240만원」로.
 *  값이 없는 칸은 세로바째로 빠진다 — 빈자리가 생기지 않게. */
export function 모집분야한줄(p: any, 본사공고: boolean): string {
  if (!p) return "";
  // 「무관」은 빼고 성별을 가릴 때만 적는다. 공고 상세 표에는 「성별」이라는
  // 열 이름이 있어 「무관」이 읽히지만, 여기는 값만 이어 붙이므로 무엇이 무관인지
  // 알 수가 없다. 게다가 대부분 무관이라 적어도 알려 주는 것이 없다.
  // 값은 상세 표(JobDetailView)와 똑같이 원본 그대로("여성 우대") 쓴다 — 「여성」·「남」
  // 처럼 여기서만 다시 줄이면 같은 공고를 두고 두 화면이 다른 말을 하게 된다.
  const 성별원문 = String(p.gender || "").trim();
  const 성별 = 성별원문 && 성별원문 !== "무관" ? 성별원문 : "";
  // 근무요일/시간 — shiftText(원티드식 자유 문장)가 있으면 그걸 원본으로 삼는다.
  // 예전엔 workDays·workTime만 봐서, shiftText로만 적은 공고(요즘 대부분)는 여기
  // 값이 통째로 빠졌다. 협의가 걸린 시간 줄은 상세 표와 같이 "협의"를 붙인다.
  const 시간원문 = p.shiftText || [p.workDays, p.workTime].filter(Boolean).join(" ");
  const 시간값 = 시간원문
    ? 시간표시줄들(시간원문).map((l) => (l.협의 ? `${l.글} 협의` : l.글)).join(", ")
    : "";
  const 칸 = [
    p.category,
    본사공고 ? "" : (p.headcount ? `${String(p.headcount).replace(/명$/, "")}명` : ""),
    p.location,
    p.employment,
    성별,
    p.career,
    본사공고 ? p.education : "",
    시간값,
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
