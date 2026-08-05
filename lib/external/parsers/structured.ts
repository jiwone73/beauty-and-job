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

// ───────────── JSON-LD 공용 헬퍼 (잡코리아·알바몬) ─────────────
function getJobPostingLd(html: string): any | null {
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const s of blocks) {
    try {
      const j = JSON.parse(s.trim());
      const arr = Array.isArray(j) ? j : [j];
      for (const o of arr) if (o && o["@type"] === "JobPosting") return o;
    } catch {
      /* skip */
    }
  }
  return null;
}
function mapCareer(exp: string): string {
  const e = (exp || "").replace(/\s/g, "");
  if (/무관/.test(e)) return "경력 무관";
  if (/^신입$/.test(e)) return "신입";
  const n = (e.match(/(\d+)년/) || [])[1];
  if (n) {
    const y = Number(n);
    return y >= 5 ? "5년 이상" : y >= 3 ? "3년 이상" : y >= 2 ? "2년 이상" : "1년 이상";
  }
  return "";
}
function mapEmployment(t: string): string {
  return ({ FULL_TIME: "정규직", PART_TIME: "파트타임", CONTRACTOR: "계약직", TEMPORARY: "계약직", INTERN: "계약직" } as Record<string, string>)[t] || "";
}
function regionFromAddress(loc: any): string {
  const a = loc && (Array.isArray(loc) ? loc[0] : loc);
  const addr = a && a.address;
  if (addr && typeof addr === "object") {
    const sido = (addr.addressRegion || "").trim();
    const gu = (addr.addressLocality || "").trim();
    if (sido && gu) return `${SIDO[sido] || sido} ${gu}`;
    const street = stripTags(addr.streetAddress || "");
    const m = street.match(/([가-힣]{2,})\s+([가-힣]+[시군구])/);
    if (m) return `${SIDO[m[1]] || m[1]} ${m[2]}`;
  }
  const street = stripTags(typeof addr === "string" ? addr : (a && a.name) || "");
  const m2 = street.match(/([가-힣]{2,})\s+([가-힣]+[시군구])/);
  return m2 ? `${SIDO[m2[1]] || m2[1]} ${m2[2]}` : "";
}
// 제목·회사명으로 우리 직군 자동 추천(맞으면 job_type·categories, 아니면 사용자가 선택)
function suggestCats(text: string): { job_type?: string; job_categories: string[] } {
  const r = searchJobItems(text, undefined, 1)[0];
  if (r && r.item) return { job_type: r.jobType, job_categories: [r.item] };
  return { job_categories: [] };
}

function parseJobkorea(html: string): StructuredResult | null {
  const jp = getJobPostingLd(html);
  if (!jp || !jp.title) return null;
  const title = stripTags(jp.title);
  const company = stripTags(jp.hiringOrganization?.name || "");
  const region = regionFromAddress(jp.jobLocation);
  const ogd = (html.match(/og:description" content="([^"]*)"/) || [])[1] || "";
  const salTxt = ((ogd.match(/급여\s*[:：]\s*([^,]+?)(?:,|$)/) || [])[1] || "").trim();
  let salary_type = "", salary_amount = 0, salary_negotiable = false, salary = salTxt;
  const sm = salTxt.match(/(월급|시급|연봉|주급)?\s*([\d,]+)\s*(만?)원/);
  if (sm && sm[2]) {
    salary_type = ({ 월급: "MONTHLY", 시급: "HOURLY", 연봉: "ANNUAL", 주급: "WEEKLY" } as Record<string, string>)[sm[1] || ""] || "ANNUAL";
    salary_amount = Number(sm[2].replace(/,/g, ""));
  } else if (/내규|협의|면접|추후|결정/.test(salTxt)) {
    salary_negotiable = true;
  }
  const deadline = String(jp.validThrough || "").slice(0, 10);
  const sug = suggestCats(`${title} ${company}`);
  const out: StructuredResult = {
    title,
    company_name: company,
    region,
    address: stripTags(jp.jobLocation?.address?.streetAddress || ""),
    career: mapCareer(stripTags(jp.experienceRequirements || "")),
    employment_type: mapEmployment(jp.employmentType || ""),
    deadline,
    always_open: !deadline,
    salary,
    salary_type,
    salary_amount,
    salary_amount_max: 0,
    salary_negotiable,
    description: stripTags(jp.description || "").slice(0, 800),
    job_type: sug.job_type || "OFFICE", // 잡코리아는 본사·기업이 많음
    job_categories: sug.job_categories,
    _confident: !!(title && (company || region)),
  };
  return out;
}

function parseAlbamon(html: string): StructuredResult | null {
  const jp = getJobPostingLd(html);
  if (!jp || !jp.title) return null;
  const title = stripTags(jp.title);
  const company = stripTags(jp.hiringOrganization?.name || "");
  const region = regionFromAddress(jp.jobLocation);
  // baseSalary(MonetaryAmount)
  let salary_type = "", salary_amount = 0, salary_negotiable = false, salary = "";
  const bs = jp.baseSalary && jp.baseSalary.value;
  if (bs && bs.value) {
    const unit = String(bs.unitText || "").toUpperCase();
    const val = Number(bs.value);
    const map: Record<string, string> = { HOUR: "HOURLY", DAY: "HOURLY", WEEK: "WEEKLY", MONTH: "MONTHLY", YEAR: "ANNUAL" };
    salary_type = map[unit] || "";
    salary_amount = unit === "HOUR" ? val : Math.round(val / 10000); // 시급=원, 그 외=만원
    salary = salary_amount ? `${({ HOURLY: "시급", WEEKLY: "주급", MONTHLY: "월급", ANNUAL: "연봉" } as Record<string, string>)[salary_type] || ""} ${salary_amount}${salary_type === "HOURLY" ? "원" : "만원"}` : "";
  } else {
    salary_negotiable = true;
  }
  // workHours → HH:MM~HH:MM 형태일 때만
  let work_time = "";
  const wh = String(jp.workHours || "");
  const wm = wh.match(/(오전|오후)?\s*(\d{1,2}):(\d{2})\s*~\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/);
  if (wm) {
    const h = (ap: string | undefined, hh: string) => {
      let n = Number(hh);
      if (ap === "오후" && n < 12) n += 12;
      if (ap === "오전" && n === 12) n = 0;
      return String(n).padStart(2, "0");
    };
    work_time = `${h(wm[1], wm[2])}:${wm[3]}~${h(wm[4], wm[5])}:${wm[6]}`;
  }
  const deadline = String(jp.validThrough || "").slice(0, 10);
  const sug = suggestCats(`${title} ${company}`);
  const out: StructuredResult = {
    title,
    company_name: company,
    region,
    address: stripTags(jp.jobLocation?.address?.streetAddress || ""),
    career: mapCareer(stripTags(jp.experienceRequirements || "")),
    employment_type: mapEmployment(jp.employmentType || ""),
    deadline,
    always_open: !deadline,
    salary,
    salary_type,
    salary_amount,
    salary_amount_max: 0,
    salary_negotiable,
    work_time,
    description: stripTags(jp.description || "").slice(0, 800),
    job_type: sug.job_type || "STORE", // 알바몬은 매장·알바가 많음
    job_categories: sug.job_categories,
    _confident: !!(title && (company || region)),
  };
  return out;
}

// ───────────── 디스패처 ─────────────
export function parseStructured(hostname: string, html: string): StructuredResult | null {
  if (!html) return null;
  if (/hairinjob\.com/i.test(hostname)) return parseHairinjob(html);
  if (/jobkorea\.co\.kr/i.test(hostname)) return parseJobkorea(html);
  if (/albamon\.com/i.test(hostname)) return parseAlbamon(html);
  return null;
}
