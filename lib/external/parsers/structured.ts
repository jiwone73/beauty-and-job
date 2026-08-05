// lib/external/parsers/structured.ts
// 알려진 잡보드 상세 페이지를 "AI 없이(무료)" 정규식으로 파싱한다.
// parse 라우트가 이미 fetch·디코딩한 html을 넘겨주면, 필드를 채운 부분 객체를 반환.
// 반환 객체에 _confident=true가 있으면 라우트가 AI 호출을 건너뛴다(신뢰할 만큼 뽑혔다는 뜻).
//
// 브라우저로 실제 상세 페이지 구조를 역설계·검증한 로직을 그대로 옮겼다.
// 1차: 헤어인잡(hairinjob.com). 이후 사람인·잡코리아 등 추가 예정.

import { searchJobItems } from "@/lib/data/jobGroups";

export type StructuredResult = Record<string, any> & { _confident?: boolean };

const SIDO: Record<string, string> = {
  서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시",
  광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시",
  경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도",
  전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도",
  제주: "제주특별자치도",
};
function normRegion(s: string): string {
  if (!s) return "";
  const m = s.trim().match(/^([가-힣]+?)\s*(.+구|.+시|.+군)$/);
  if (!m) return s.trim();
  return `${SIDO[m[1]] || m[1]} ${m[2].trim()}`;
}
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ───────────── 헤어인잡 ─────────────
function parseHairinjob(html: string): StructuredResult | null {
  const title = ((html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || "")
    .replace(/\s*\|\s*헤어인잡.*$/, "")
    .trim();

  // 모집분야 표: 직종 | 급여 | 근무시간
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]{0,320}?)<\/tr>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(
      (x) =>
        /(월급|시급|연봉|주급|협의)/.test(x) &&
        /(디자이너|스탭|스텝|네일|피부|점장|실장|메이크업|바버|인턴|관리|테라피|왁싱|속눈썹|미용|에스테|아티스트|스파)/.test(x)
    );
  if (!rows.length && !title) return null;

  const jobTexts = [
    ...new Set(
      rows
        .map((r) => (r.match(/^([^월시연주협]+?)(?:\[[^\]]*\])?\s*(?:월급|시급|연봉|주급|협의)/) || [])[1])
        .filter(Boolean)
        .map((s) => s!.trim())
    ),
  ];

  // 직종 → 우리 직군 매핑
  let job_type = "STORE";
  const job_categories: string[] = [];
  for (const jt of jobTexts) {
    const r = searchJobItems(jt, undefined, 1)[0];
    if (r && r.item) {
      if (!job_categories.includes(r.item)) job_categories.push(r.item);
      job_type = r.jobType;
    }
  }

  // 급여(첫 행 기준)
  let salary_type = "";
  let salary_amount = 0;
  let salary_negotiable = false;
  let salary = "";
  const sm = (rows[0] || "").match(/(월급|시급|연봉|주급)\s*([\d,]+)\s*(만?)원/);
  if (sm) {
    salary = sm[0].trim();
    salary_type = ({ 월급: "MONTHLY", 시급: "HOURLY", 연봉: "ANNUAL", 주급: "WEEKLY" } as Record<string, string>)[sm[1]] || "";
    salary_amount = Number(sm[2].replace(/,/g, ""));
    if (sm[1] === "시급" && sm[3] === "만") salary_amount *= 10000; // 시급은 원 단위
  } else if (/협의/.test(rows[0] || "")) {
    salary_negotiable = true;
    salary = "협의";
  }

  // 근무시간
  let work_time = "";
  const wt = (rows[0] || "").match(/(오전|오후)?\s*(\d{1,2}):(\d{2})\s*~\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/);
  if (wt) {
    const h = (ap: string | undefined, hh: string) => {
      let n = Number(hh);
      if (ap === "오후" && n < 12) n += 12;
      if (ap === "오전" && n === 12) n = 0;
      return String(n).padStart(2, "0");
    };
    work_time = `${h(wt[1], wt[2])}:${wt[3]}~${h(wt[4], wt[5])}:${wt[6]}`;
  }

  // 지역(요약줄 "지역 : 서울 강남구")
  const rg =
    (html.match(/지\s*역\s*[:：]\s*([가-힣]+\s*[가-힣]+구|[가-힣]+\s*[가-힣]+시|[가-힣]+\s*[가-힣]+군)/) || [])[1] || "";

  const always_open = /상시|수시|충원|채용\s*시/.test(title);

  // 공고 이미지: /upload/upload/offer_user/... (실제 상세 이미지). 헤어인잡은 핫링크 차단이라 재호스팅 필요.
  const images = [
    ...new Set(
      [...html.matchAll(/\/upload\/upload\/offer_user\/\d+\/[^"'\s)]+\.(?:jpe?g|png|gif)/gi)].map((m) => m[0])
    ),
  ]
    .map((p) => `https://www.hairinjob.com${p}`)
    .slice(0, 10);

  const out: StructuredResult = {
    job_type,
    job_categories,
    region: normRegion(rg),
    salary,
    salary_type,
    salary_amount,
    salary_amount_max: 0,
    salary_negotiable,
    work_time,
    always_open,
    main_duties: jobTexts.length ? `모집분야: ${jobTexts.join(", ")}` : "",
    _confident: job_categories.length > 0 || salary_type !== "" || salary_negotiable,
  };
  if (title) out.title = title;
  if (images.length) {
    out.images = images;
    out._rehost = true; // 핫링크 차단 → 라우트에서 재호스팅
    out._rehostReferer = "https://www.hairinjob.com/";
  }
  return out;
}

// ───────────── 디스패처 ─────────────
export function parseStructured(hostname: string, html: string): StructuredResult | null {
  if (!html) return null;
  if (/hairinjob\.com/i.test(hostname)) return parseHairinjob(html);
  return null;
}
