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
function stripTags(s: any): string {
  // JSON-LD 필드가 문자열이 아닌 객체/배열로 오는 경우(예: experienceRequirements)를 방어 → 크래시 방지
  if (typeof s !== "string") s = s == null ? "" : (typeof s === "object" ? "" : String(s));
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ───────────── 헤어인잡 ─────────────
// 상세: cms/s01_v.php?idx=<id> (EUC-KR). 본문이 <li>라벨</li><li>값</li> 구조.
//   모집분야 값 = "헤어디자이너[경력] 01명 (정규직) > 300만원이상"
//   업체주소·복리후생·근무형태·채용담당자도 같은 li쌍, 근무시간은 요약 아이콘(HH:MM~HH:MM),
//   제목·회사·근무지역·마감은 og:description에서.
function parseHairinjob(html: string): StructuredResult | null {
  const strip = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  // 값 li 원본 HTML(태그 유지). 다직종 모집분야는 600자를 넘어 잘리므로 넉넉히 2500자.
  const liRaw = (label: string): string => {
    const re = new RegExp("<li[^>]*>\\s*" + label.replace(/\s/g, "\\s*") + "\\s*</li>\\s*<li[^>]*>([\\s\\S]{0,2500}?)</li>", "i");
    return (html.match(re) || [])[1] || "";
  };
  const liValue = (label: string): string => strip(liRaw(label));

  const ogD = dec((html.match(/property="og:description" content="([^"]*)"/) || [])[1] || "");
  // 모집분야는 직종이 여러 개일 수 있다(각 <div> 한 블록). 필드가 서로 다른 직종에서 섞이지 않도록 "첫 직종"만 사용.
  const mjRaw = liRaw("모집분야");
  const firstDiv = (mjRaw.match(/<div\b[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || mjRaw;
  const mj = strip(firstDiv); // 첫 직종 텍스트: "헤어디자이너[신입] 01명 (정규직) >"

  // 제목·회사·지역·주소
  let title = (ogD.match(/채용\]\s*(.+?)\s*,\s*근무지역/) || [])[1] || "";
  if (!title) {
    title = ((html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1] || "").replace(/\s*\|\s*헤어인잡.*$/, "").trim();
  }
  const company = (ogD.match(/\[([^\]]+?)\s*채용\]/) || [])[1] || "";
  if (!title && !company && !mj) return null;

  const regionRaw = ((ogD.match(/근무지역\s*[:：]\s*([^,]+)/) || [])[1] || "").trim();
  const region = normRegionLoose(regionRaw);
  // 업체주소: 프랜차이즈 등은 '본사 주소'가 들어와 근무지역(og)과 시·도가 다를 수 있다.
  // 이 경우 상세주소로 쓰면 지도가 엉뚱한 곳(본사)을 가리키므로 비운다(잘못된 주소보다 없는 게 낫다).
  let address = liValue("업체주소");
  if (address && region) {
    const aS = (address.match(/^\s*(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/) || [])[1] || "";
    const aFull = SIDO[aS] || aS;
    const rFull = region.split(" ")[0];
    if (aFull && rFull && aFull !== rFull) address = "";
  }
  // 업체주소 li가 없거나(상세주소 마스킹 등) 비면 근무지역(시·군·구)이라도 주소로 사용
  if (!address && region) address = region;

  // 모집분야: 직종 / 인원 / 고용형태 / 급여
  const job = (mj.match(/^([가-힣A-Za-z/]+?)\s*\[/) || [])[1] || (mj.split(/[[\s(]/)[0] || "");
  const careerMark = ((mj.match(/\[([^\]]+)\]/) || [])[1] || "").replace(/\s/g, "");
  const headcount = Number(((mj.match(/(\d+)\s*명/) || [])[1] || "").replace(/^0+/, "")) || 0;

  // 경력: [신입]→신입, [경력]→1년 이상, [신입및경력]→경력 무관
  let career = "";
  if (/신입.*경력|경력.*신입|신입및경력/.test(careerMark)) career = "경력 무관";
  else if (/^신입$/.test(careerMark)) career = "신입";
  else if (/경력/.test(careerMark)) career = "1년 이상";

  // 고용형태: 근무형태 li 우선, 없으면 모집분야 괄호
  const empRaw = liValue("근무형태") || ((mj.match(/\(([^)]+)\)/) || [])[1] || "");
  let employment_type = "";
  if (/정규/.test(empRaw)) employment_type = "정규직";
  else if (/계약/.test(empRaw)) employment_type = "계약직";
  else if (/파트|아르바이트|알바/.test(empRaw)) employment_type = "파트타임";

  // 급여: "300만원이상"(접두어 없음)은 월급으로 간주
  let salary_type = "", salary_amount = 0, salary_negotiable = false, salary = "";
  const sm = mj.match(/(월급|시급|연봉|주급)?\s*([\d,]+)\s*만원/);
  if (sm && sm[2]) {
    salary_type = ({ 월급: "MONTHLY", 시급: "HOURLY", 연봉: "ANNUAL", 주급: "WEEKLY" } as Record<string, string>)[sm[1] || ""] || "MONTHLY";
    salary_amount = Number(sm[2].replace(/,/g, ""));
    salary = (mj.match(/[\d,]+\s*만원\s*이?상?/) || [])[0]?.trim() || `${salary_amount}만원`;
  } else if (/협의|면접|추후|내규/.test(mj)) {
    salary_negotiable = true;
  } else {
    // 급여가 이미지 배지(<img src=".../pay_etc.gif" alt="협의">)라 텍스트로 못 잡은 경우 → 첫 직종의 alt/파일명으로 판정
    const payImg = (firstDiv.match(/<img[^>]*pay_\w+\.gif[^>]*>/i) || [])[0] || "";
    const altText = (payImg.match(/alt=["']([^"']*)["']/i) || [])[1] || "";
    if (/협의|면접|추후|내규|기타/.test(altText) || /pay_etc/i.test(payImg)) salary_negotiable = true;
  }

  // 페이지 전체 텍스트(유동·선택형 근무조건 감지용)
  const pageText = strip(html);
  // 미용실 공고는 "근무시간 선택 가능", "근무요일 선택 가능(주5·주6·격주 등)"처럼 유동형이 많다.
  // 이 경우 특정 값을 억지로 넣기보다 '협의'로 채워야 폼(협의 토글)과 자연스럽게 맞는다.
  const flexTime = /근무\s*시간[^가-힣]{0,8}(선택|협의|조율|탄력|자율|자유)|시간\s*(선택\s*가능|협의|조율|탄력)|탄력\s*근무|자율\s*출퇴근/.test(pageText);
  const flexDays = /근무\s*요일[^가-힣]{0,8}(선택|협의|조율|자유)|요일\s*(선택\s*가능|협의|조율|자유)|격주|주\s*[3-6]\s*일|스케줄\s*근무|근무\s*일수\s*(선택|협의)/.test(pageText);
  // 근무시간: 유동형이면 협의, 아니면 페이지 내 첫 시간대(오전/오후 표기도 24시간으로 변환)
  const firstTime = (pageText.match(/(?:오전|오후)?\s*\d{1,2}:\d{2}\s*~\s*(?:오전|오후)?\s*\d{1,2}:\d{2}/) || [])[0] || "";
  const work_time = flexTime ? "협의" : parseWorkTime(firstTime);
  // 근무요일: 유동형이면 협의. (구체 요일이 명시된 경우는 드물고 '휴무 요일' 오인 위험이 커서, 확실한 유동형만 채운다)
  const work_days = flexDays ? "협의" : "";

  // 복리후생 + 필터 태그
  const benefits = liValue("복리후생");
  const benefit_tags: string[] = [];
  if (/국민연금|고용보험|산재|건강보험|4대/.test(benefits)) benefit_tags.push("4대보험");
  if (/인센티브/.test(benefits)) benefit_tags.push("인센티브");
  if (/식대|중식|조식|식사|식비/.test(benefits)) benefit_tags.push("식대 지원");
  if (/주차/.test(benefits)) benefit_tags.push("주차 가능");
  if (/기숙사|숙소/.test(benefits)) benefit_tags.push("기숙사 제공");
  if (/교육비|교육\s*지원/.test(benefits)) benefit_tags.push("교육비 지원");

  const contact_name = (liValue("채용담당자").split(" ")[0] || "").trim();
  const always_open = /채용시까지|상시|수시|충원/.test(ogD) || /채용시까지|상시|수시/.test(title);

  const sug = suggestCats(`${job} ${title}`);
  // 헤어인잡은 미용 전문 사이트 → 모집분야 직종명을 우리 직군으로 우선 매핑.
  // (자동 추천은 "스탭↔스태프" 표기 차이·복합어 때문에 자주 놓쳐서, 도메인 규칙을 먼저 적용)
  let mappedCats: string[] = [];
  {
    const ck = `${job} ${mj} ${title}`.replace(/\s/g, "");
    if (/바버|barber/i.test(ck)) mappedCats = ["바버(Barber)"];
    else if (/웨딩|본식|업스타일|혼주/.test(ck)) mappedCats = ["웨딩 헤어디자이너"];
    else if (/디자이너|스타일리스트|원장|실장/.test(ck)) mappedCats = ["헤어 디자이너"];
    else if (/스탭|스태프|스텝|인턴|어시|샴푸|막내|수습/.test(ck)) mappedCats = ["헤어 스태프(시니어·주니어)"];
  }
  const job_categories = mappedCats.length ? mappedCats : sug.job_categories;

  // 상세요강 본문(텍스트형): 상세요강이 이미지가 아니라 텍스트로만 들어간 공고가 있다.
  //   mid_view_main div 안의 '상세내용' 이후 본문을 뽑아 포지션 소개(description)로 채운다.
  const stripLines = (s: string) =>
    s.replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  let descText = "";
  {
    const mIdx = html.search(/class="[^"]*mid_view_main/i);
    if (mIdx >= 0) {
      // 스크립트·스타일 블록 먼저 제거(네이버 지도 초기화 JS 등이 본문 텍스트로 섞여 들어오는 것 차단)
      const raw = html.slice(mIdx, mIdx + 20000)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ");
      let t = stripLines(raw);
      const s = t.indexOf("상세내용");
      if (s >= 0) t = t.slice(s + 4);
      // 로그인 안내·근무위치(지도)·저작권/신고 등 본문이 아닌 영역에서 끊는다.
      // + 헤어인잡이 모든 공고에 자동으로 붙이는 '템플릿 안내' 푸터(감사 인사·전화문의 멘트·"헤어인잡에서만 이용가능" 등)도
      //   공고 등록자가 쓴 글이 아니므로 제거한다. 가장 앞선 마커에서 잘라낸다.
      t = t.split(/온라인[^가-힣\n]{0,4}상시모집|문자로\s*지원\s*가능|본\s*채용정보에\s*관심|채용정보에\s*관심\s*가져|상세요강\s*확인\s*후\s*입사지원|자세한\s*사항은\s*전화|전화\s*연결\s*안[될돼]|전화\s*문의\s*시|헤어인잡|템플릿|더\s*확인하|로그인|근무\s*위치|위\s*임플릿|저작권법|무단[^\n]*이용|신고하기|\$\(\s*document|naver\.maps|function\s*\(/)[0];
      // 템플릿 '◇ 지원방법' 머리글만 꼬리에 남으면 정리
      t = t.replace(/[\s◇◆◈▷▶▪•*·\-]*지원\s*방법\s*$/, "").trimEnd();
      descText = t.trim().slice(0, 2000);
      // 로그인 게이트라 실질 내용이 남지 않으면 비운다.
      if (descText.length < 10) descText = "";
    }
  }

  // 공고 이미지 분리(핫링크 차단이라 재호스팅):
  //   원문 DOM 위치로 구분한다(파일명 규칙은 공고마다 달라 신뢰 불가):
  //   · 상단 매장사진 슬라이더(#company_photo / .photo-wrap, "상세요강 블록 앞") → 배너
  //   · #recruit_contents(상세요강) 안의 이미지 → 상세 이미지
  const imgRe = /\/upload\/upload\/offer_user\/\d+\/[^"'\s)]+\.(?:jpe?g|png|gif)/gi;
  const abs = (arr: string[]) => arr.map((p) => `https://www.hairinjob.com${p}`);
  const grab = (frag: string) => [...new Set([...frag.matchAll(imgRe)].map((m) => m[0]))];
  const recruitIdx = html.search(/id=["']recruit_contents["']/i);
  const bannerFrag = recruitIdx > 0 ? html.slice(0, recruitIdx) : "";
  const detailFrag = recruitIdx > 0 ? html.slice(recruitIdx) : html;
  // 배너: 상세요강 블록 앞의 매장 사진. (recruit_contents 마커가 없으면 안전하게 배너 비움)
  const bannerRaw = abs(grab(bannerFrag)).slice(0, 10);
  // 상세요강: recruit_contents 안의 이미지에서 배너와 중복(같은 매장 사진 재노출)은 제외.
  const detailRaw = abs(grab(detailFrag)).filter((u) => !bannerRaw.includes(u)).slice(0, 12);

  // 업종: 헤어인잡=미용 전문 사이트 → 직종/제목 기준으로 기본 업종을 지정(대다수 헤어살롱).
  let industry = "헤어샵";
  {
    const ck = `${job} ${mj} ${title}`;
    if (/네일/.test(ck)) industry = "네일샵";
    else if (/속눈썹|왁싱|반영구|래쉬/.test(ck)) industry = "속눈썹·왁싱·반영구";
    else if (/피부|에스테틱|스킨\s*케어|관리사/.test(ck)) industry = "피부·에스테틱";
    else if (/메이크업|분장/.test(ck)) industry = "메이크업";
    else if (/애견|반려|펫\s|펫미용/.test(ck)) industry = "애견미용";
  }

  const out: StructuredResult = {
    title,
    company_name: company,
    region,
    address,
    job_type: sug.job_type || "STORE", // 헤어샵 = 매장
    job_categories,
    career,
    employment_type,
    headcount: headcount || 0,
    salary,
    salary_type,
    salary_amount,
    salary_amount_max: 0,
    salary_negotiable,
    work_time,
    work_days,
    industry,
    benefits,
    benefit_tags,
    contact_name,
    always_open,
    main_duties: job ? `모집분야: ${job}` : "",
    description: descText,
    _confident: !!(title && (company || region || job_categories.length)),
  };
  if (bannerRaw.length || detailRaw.length) {
    out.images = bannerRaw;                       // 매장 사진 → 상단 배너
    if (detailRaw.length) out._detailImagesRaw = detailRaw; // 상세요강 포스터 → 상세 이미지
    out._rehost = true; // 핫링크 차단 → 라우트에서 재호스팅
    out._rehostReferer = "https://www.hairinjob.com/";
  } else {
    out.images = [];
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
  return ({ FULL_TIME: "정규직", PART_TIME: "아르바이트", CONTRACTOR: "계약직", TEMPORARY: "계약직", INTERN: "인턴" } as Record<string, string>)[t] || "";
}
// 한국어 고용형태 텍스트 → 폼 옵션(정규직/계약직/위촉직/프리랜서/인턴/아르바이트/협의)
function mapEmploymentKo(s: string): string {
  const t = String(s || "");
  if (/정규/.test(t)) return "정규직";
  if (/계약/.test(t)) return "계약직";
  if (/위촉/.test(t)) return "위촉직";
  if (/프리랜|자유직업|자유직/.test(t)) return "프리랜서";
  if (/인턴/.test(t)) return "인턴";
  if (/파트|아르바이트|알바|단기/.test(t)) return "아르바이트";
  if (/협의|추후|면접\s*후|내규/.test(t)) return "협의";
  return "";
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
// 직군 우선순위 규칙(도메인 룰): 위에서부터 첫 매칭 채택. 공백 제거·소문자화한 텍스트 기준.
// searchJobItems의 "이름 부분일치 > 키워드 일치" 점수 역전(예: '에스테틱'→'에스테틱 상담실장') 문제를 피하려고,
// 실제 역할 단어를 구체적인 것부터 명시해 직군을 확정한다. (매칭 안 되면 아래 토큰 검색으로 폴백)
function mapRole(text: string): { job_type: string; item: string } | null {
  const ns = (text || "").toLowerCase().replace(/\s/g, "");
  const R: [RegExp, string, string][] = [
    [/네일(스탭|스태프|인턴|보조)/, "STORE", "네일 스태프·인턴"],
    [/네일|nail|젤네일/, "STORE", "네일 아티스트"],
    [/속눈썹|래쉬|eyelash|반영구|왁싱|제모|waxing/, "STORE", "속눈썹·반영구 아티스트"],
    [/(웨딩|본식|혼주)메이크업|웨딩헤어메이크업/, "STORE", "웨딩·혼주 메이크업"],
    [/메이크업|makeup|분장|mua/, "STORE", "메이크업 아티스트"],
    [/바버|barber|이용사/, "STORE", "바버(Barber)"],
    [/상담실장|상담사|카운셀러|counselor/, "STORE", "에스테틱 상담실장"],
    // '두피'는 브랜드명(닥터스칼프 등)에도 흔히 들어가므로, 역할 맥락(관리/케어/테라피/스탭)이 있을 때만.
    [/두피관리|두피케어|두피테라|헤드스파|탈모관리|모발이식/, "STORE", "두피 관리사"],
    [/피부미용|피부관리|피부관리사|피부테라|에스테티션|aesthetician|페이셜|경락|스킨케어|에스테틱|바디관리|체형관리/, "STORE", "피부관리사(일반·경락)"],
    [/스파테라|아로마테라|테라피스트/, "STORE", "스파 테라피스트"],
    [/점장|샵마스터|매장관리/, "STORE", "매장 점장·샵마스터"],
    [/샴푸|헤어스탭|헤어스태프|미용스탭|미용스태프/, "STORE", "헤어 스태프(시니어·주니어)"],
    [/헤어디자이너|헤어스타일리스트|스타일리스트|미용사|hairstylist/, "STORE", "헤어 디자이너"],
    // ── OFFICE(본사·기업) ──
    [/화장품연구|제형연구|연구원|r&d/, "OFFICE", "화장품 연구원(R&D)"],
    [/영상pd|영상편집|콘텐츠제작|크리에이티브디렉터|숏폼|영상디자이너/, "OFFICE", "영상 PD·크리에이티브 디렉터"],
    [/브랜드매니저|상품기획|브랜드마케팅|퍼포먼스마케팅|마케터|마케팅담당|마케팅|퍼블리싱|홍보담당/, "OFFICE", "브랜드 매니저(BM)·상품기획"],
    [/영업매니저|해외영업|국내영업|영업담당|세일즈|수출영업|바이어영업|영업직/, "OFFICE", "영업 매니저(국내유통·면세·수출)"],
    [/머천다이저|뷰티md|상품소싱/, "OFFICE", "뷰티 MD(H&B·이커머스·글로벌)"],
  ];
  for (const [re, jt, item] of R) if (re.test(ns)) return { job_type: jt, item };
  return null;
}

// 제목·회사명으로 우리 직군 자동 추천(맞으면 job_type·categories, 아니면 사용자가 선택)
// searchJobItems는 "짧은 검색어"가 직군명/태그의 부분문자열일 때 매칭된다. 긴 문장을 통째로 넘기면
// (예: "헤어디자이너 ★ 블루클럽 인천.송도점 ★") 어떤 직군에도 안 걸리므로, 토큰으로 쪼개 각각 검색한다.
function suggestCats(text: string): { job_type?: string; job_categories: string[] } {
  // 1순위: 도메인 역할 규칙(가장 신뢰도 높음)
  const role = mapRole(text);
  if (role) return { job_type: role.job_type, job_categories: [role.item] };
  const tokens = (text || "")
    .split(/[\s,.\/·|\-\[\]()★☆*!~"'`]+/)
    .map((s) => s.trim())
    .filter((t) => t.length >= 2);
  for (const tok of tokens) {
    const r = searchJobItems(tok, undefined, 1)[0];
    if (r && r.item) return { job_type: r.jobType, job_categories: [r.item] };
  }
  // 폴백: 원문 전체(짧은 경우 대비)
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
  // 알바몬 상세는 __NEXT_DATA__.props.pageProps.data.viewData 에 전 필드가 구조화돼 있다(JSON-LD는 빈약).
  let vd: any = null;
  const ndm = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (ndm) { try { vd = JSON.parse(ndm[1])?.props?.pageProps?.data?.viewData || null; } catch { vd = null; } }

  // 이미지: 회사가 올린 사진만. 알바몬 템플릿(스톡 top-image·로고 등 contents.albamon.kr/…/template/)은 제외.
  //   ① 이미지 공고(photoType C): recruitImages.photos[].imageUrl (coimg.jobkorea.co.kr/Company/Visual_Co/…)
  //   ② 일부는 SSR HTML의 file.albamon.com/…/Recruit/… 에 존재. 둘 다 핫링크 대비 재호스팅.
  const albamonImages = () => {
    const out: string[] = [];
    const photos = vd?.recruitImages?.photos;
    if (Array.isArray(photos)) {
      for (const p of photos) {
        const u = String(p?.imageUrl || "");
        if (/^https?:\/\//i.test(u) && !/noimg|no_image|blank|\/template\//i.test(u)) out.push(u);
      }
    }
    for (const m of html.matchAll(/https?:(?:\\u002[Ff]|\\?\/){2}file\.albamon\.com[^\s"'<>()\\]+?\.(?:jpe?g|png|webp|gif)/gi)) {
      const u = m[0].replace(/\\u002[Ff]/gi, "/").replace(/\\\//g, "/");
      if (/\/Recruit\//i.test(u)) out.push(u);
    }
    return [...new Set(out)].slice(0, 12);
  };

  if (vd && (vd.recruitTitle || vd.recruitCompanyName)) {
    const title = stripTags(String(vd.recruitTitle || ""));
    const company = stripTags(String(vd.recruitCompanyName || ""));
    const addr = stripTags(String(vd.workingAddress || vd.area?.description || ""));
    const region = regionFromAddrText(addr);
    // 고용형태: 여러 개면 폼 옵션에 맞는 첫 값(정규직 우선)
    const EMP = ["정규직", "계약직", "위촉직", "프리랜서", "인턴", "아르바이트"];
    const empList = Array.isArray(vd.employmentType) ? vd.employmentType.map((e: any) => String(e?.description || "")) : [];
    const employment_type = EMP.find((x) => empList.includes(x)) || "";
    // 근무기간
    const wpDesc = String(vd.workPeriod?.description || "");
    let work_period = "";
    if (/협의/.test(wpDesc)) work_period = "협의";
    else if (/6개월[\s~]*1년/.test(wpDesc)) work_period = "6개월 ~ 1년";
    else if (/1년\s*이상/.test(wpDesc)) work_period = "1년 이상";
    else if (/6개월|단기/.test(wpDesc)) work_period = "~6개월";
    // 근무요일
    const wdDesc = String(vd.workDays?.description || "");
    let work_days = "";
    if (/협의/.test(wdDesc)) work_days = "협의";
    else { const ds = ["월", "화", "수", "목", "금", "토", "일"].filter((d) => wdDesc.includes(d)); if (ds.length) work_days = ds.join(","); }
    // 근무시간
    let work_time = "";
    if (vd.workTimeConsult) work_time = "협의";
    else {
      const a = String(vd.workStartTime || "").match(/(\d{1,2}):(\d{2})/);
      const b = String(vd.workEndTime || "").match(/(\d{1,2}):(\d{2})/);
      if (a && b) work_time = `${a[1].padStart(2, "0")}:${a[2]}~${b[1].padStart(2, "0")}:${b[2]}`;
    }
    // 급여: 표준 단위(시급/주급/월급/연봉)면 구조화, 건별 등 비표준이면 텍스트로만
    let salary_type = "", salary_amount = 0, salary = "", salary_negotiable = false;
    const stKey = String(vd.salaryType?.key || "").toUpperCase();
    const stDesc = String(vd.salaryType?.description || "");
    const amt = Number(vd.salary) || 0;
    const stMap: Record<string, string> = { HOUR: "HOURLY", DAY: "HOURLY", WEEK: "WEEKLY", MONTH: "MONTHLY", YEAR: "ANNUAL" };
    if (stMap[stKey] && amt > 0) {
      salary_type = stMap[stKey];
      salary_amount = salary_type === "HOURLY" ? amt : Math.round(amt / 10000);
      salary = `${({ HOURLY: "시급", WEEKLY: "주급", MONTHLY: "월급", ANNUAL: "연봉" } as Record<string, string>)[salary_type]} ${salary_amount}${salary_type === "HOURLY" ? "원" : "만원"}`;
    } else if (amt > 0) {
      salary = `${stDesc || "급여"} ${amt.toLocaleString()}원`;
      salary_negotiable = !!vd.salaryConsult;
    } else {
      salary_negotiable = true;
    }
    // 학력
    const eduDesc = Array.isArray(vd.educationLevels) ? String(vd.educationLevels[0]?.description || "") : "";
    let education = "";
    if (/무관/.test(eduDesc)) education = "학력무관";
    else if (/고졸/.test(eduDesc)) education = "고졸 이상";
    else if (/초대졸|전문대/.test(eduDesc)) education = "초대졸 이상";
    else if (/대졸|학사/.test(eduDesc)) education = "대졸 이상";
    else if (/석사|대학원/.test(eduDesc)) education = "석사 이상";
    // 마감/모집인원/우대
    const allTime = !!vd.allTime || /상시/.test(String(vd.deadlineDate || ""));
    const deadline = allTime ? "" : ((String(vd.deadlineDate || "").match(/\d{4}[-.]\d{1,2}[-.]\d{1,2}/) || [])[0] || "").replace(/\./g, "-");
    const headcount = Number(String(vd.recruitMemberCount || "").replace(/\D/g, "")) || 0;
    const preferred = stripTags(String(vd.preferences || "")).trim();
    // 직군: 구체적인 jobField·제목만 사용. part(예: "헤어·미용·네일샵")는 여러 직종을 묶은
    //   우산 카테고리라 "네일샵" 글자만 보고 네일로 오인하는 등 오탐을 유발 → 입력에서 제외.
    const jobFieldStr = typeof vd.jobField === "string" ? vd.jobField : "";
    const sug = suggestCats(`${jobFieldStr} ${title}`);
    // 경력: JSON-LD 우선, 없으면 초보가능 → 경력 무관
    const career = mapCareer(stripTags(jp?.experienceRequirements || "")) || (vd.beginnerAvailableStatus ? "경력 무관" : "");
    const description = stripTags(String(vd.simpleRecruitContents || "")).replace(/\s+/g, " ").trim().slice(0, 800);
    // 칩에 안 담기는 근무요일 부가설명·급여옵션은 비고로 보존
    const extra_notes = [
      vd.workWeekEtc ? `근무요일: ${stripTags(String(vd.workWeekEtc))}` : "",
      Array.isArray(vd.payAddTypes) && vd.payAddTypes.length ? `급여: ${vd.payAddTypes.map((p: any) => p?.description).filter(Boolean).join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const out: StructuredResult = {
      title, company_name: company, region, address: addr,
      career, employment_type, work_period, work_days, work_time, education,
      deadline, always_open: allTime, headcount,
      salary, salary_type, salary_amount, salary_amount_max: 0, salary_negotiable,
      preferred, description, extra_notes,
      job_type: sug.job_type || "STORE",
      job_categories: sug.job_categories,
      _confident: !!(title && (company || region)),
    };
    const imgs = albamonImages();
    if (imgs.length) { out.images = imgs; out._rehost = true; out._rehostReferer = "https://www.albamon.com/"; }
    else out.images = [];
    return out;
  }

  // ── viewData 없으면 JSON-LD 폴백(기존 로직) ──
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
  // 상세요강 이미지: SSR HTML의 file.albamon.com/albamon/Recruit/Photo/RecuitDetail_View... (순서 그대로).
  // 공고 본문이 이미지로 된 경우(예: 준오헤어)가 많아 반드시 가져와야 함. 핫링크 대비 재호스팅.
  const images = [
    ...new Set(
      [...html.matchAll(/https?:(?:\\u002[Ff]|\\?\/){2}file\.albamon\.com[^\s"'<>()\\]+?\.(?:jpe?g|png|webp|gif)/gi)]
        .map((m) => m[0].replace(/\\u002[Ff]/gi, "/").replace(/\\\//g, "/"))
        .filter((u) => /\/Recruit\//i.test(u))
    ),
  ].slice(0, 12);
  if (images.length) {
    out.images = images;
    out._rehost = true;
    out._rehostReferer = "https://www.albamon.com/";
  } else {
    out.images = [];
  }
  return out;
}

// ───────────── 사람인 ─────────────
// 사람인 상세(zf_user/jobs/relay/view)는 JSON-LD가 없고, 본문 요약은 iframe 안에 있다.
// 다만 og:title·og:description이 일정한 포맷이라 이걸로 핵심 필드를 무료로 뽑는다.
//   og:title       : "[회사] 공고제목 ... (D-2) - 사람인"
//   og:description : "회사, 공고제목, 경력:X, 학력:Y, 급여문구, 마감일:Z, 홈페이지:..."
// 지역은 외부(iframe)라 못 뽑음 → 관리자가 채움. title+회사가 나오면 신뢰 처리.
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
function parseSaramin(html: string): StructuredResult | null {
  const ogT = decodeHtmlEntities((html.match(/og:title" content="([^"]*)"/) || [])[1] || "");
  const ogD = decodeHtmlEntities((html.match(/og:description" content="([^"]*)"/) || [])[1] || "");
  if (!ogT) return null;
  const title = ogT
    .replace(/\s*-\s*사람인\s*$/, "")
    .replace(/\s*\((?:D-\d+|채용시\s*마감|마감|상시)\)\s*$/, "")
    .trim();
  const company = (ogD.split(/,\s*/)[0] || "").trim();
  const careerRaw = ((ogD.match(/경력\s*[:：]\s*([^,]+)/) || [])[1] || "").trim();
  const deadlineRaw = ((ogD.match(/마감일\s*[:：]\s*([^,]+)/) || [])[1] || "").trim();
  // 학력·홈페이지도 메타에 있음(예: "학력:학력무관, …, 홈페이지:www.jennyhouse.co.kr")
  const eduRaw = ((ogD.match(/학력\s*[:：]\s*([^,]+)/) || [])[1] || "").trim();
  let education = "";
  if (/무관/.test(eduRaw)) education = "학력무관";
  else if (/고졸/.test(eduRaw)) education = "고졸 이상";
  else if (/초대졸|전문대/.test(eduRaw)) education = "초대졸 이상";
  else if (/대졸|학사/.test(eduRaw)) education = "대졸 이상";
  else if (/석사|대학원/.test(eduRaw)) education = "석사 이상";
  const homepage_url = ((ogD.match(/홈페이지\s*[:：]\s*([^\s,]+)/) || [])[1] || "").trim();
  // 급여: 학력 항목과 마감일 사이의 라벨 없는 조각
  const salTxt = ((ogD.match(/학력\s*[:：][^,]+,\s*([^,]+?)\s*,\s*마감일/) || [])[1] || "").trim();

  let salary_type = "", salary_amount = 0, salary_negotiable = false;
  const salary = salTxt;
  const sm = salTxt.match(/(월급|시급|연봉|주급)\s*([\d,]+)\s*(만?)원?/);
  if (sm) {
    salary_type = ({ 월급: "MONTHLY", 시급: "HOURLY", 연봉: "ANNUAL", 주급: "WEEKLY" } as Record<string, string>)[sm[1]] || "";
    salary_amount = Number(sm[2].replace(/,/g, ""));
    if (sm[1] === "시급" && sm[3] === "만") salary_amount *= 10000;
  } else if (/면접|협의|내규|추후|결정|회사/.test(salTxt)) {
    salary_negotiable = true;
  }

  const isAlways = /채용시|상시|수시|충원/.test(deadlineRaw);
  const deadline = /^\d{4}-\d{2}-\d{2}/.test(deadlineRaw) ? deadlineRaw.slice(0, 10) : "";

  let employment_type = "";
  if (/정규직/.test(title)) employment_type = "정규직";
  else if (/계약직/.test(title)) employment_type = "계약직";
  else if (/파트\s*타임|파트타임|아르바이트|알바/.test(title)) employment_type = "파트타임";

  const kw = decodeHtmlEntities((html.match(/<meta name="keywords" content="([^"]*)"/) || [])[1] || "");
  // 직군 판정은 '제목' 우선(역할이 명확). 메타 keywords에는 브랜드 SEO 태그(예: 두피 브랜드의 '두피케어')가 섞여
  // 역할을 오염시키므로, 제목으로 못 잡을 때만 keywords를 보조로 쓴다.
  const sug = (() => { const s = suggestCats(title); return s.job_categories.length ? s : suggestCats(`${title} ${kw}`); })();

  // 경력: "신입/경력"·"신입·경력"처럼 둘 다면 경력 무관으로.
  let career = mapCareer(careerRaw);
  if (!career) {
    if (/신입/.test(careerRaw) && /경력/.test(careerRaw)) career = "경력 무관";
    else if (/신입/.test(careerRaw)) career = "신입";
    else if (/경력/.test(careerRaw)) career = "1년 이상";
  }

  return {
    title,
    company_name: company,
    region: "",
    career,
    education,
    homepage_url,
    employment_type,
    deadline,
    always_open: isAlways || !deadline,
    salary,
    salary_type,
    salary_amount,
    salary_amount_max: 0,
    salary_negotiable,
    job_type: sug.job_type || "OFFICE", // 사람인은 기업·본사가 많음
    job_categories: sug.job_categories,
    images: [],
    _confident: !!(title && company),
  };
}

// ───────────── 급여 문자열 파서 (뷰티잡·뷰티인잡 등 공용) ─────────────
// "월급 255만원~270만원", "연봉 3,200만원이상 (면접 후 결정)", "급여협의", "시급 12,000원"
function parseSalaryText(raw: string): {
  salary: string; salary_type: string; salary_amount: number; salary_amount_max: number; salary_negotiable: boolean;
} {
  const salary = (raw || "").replace(/\s+/g, " ").trim();
  let salary_type = "", salary_amount = 0, salary_amount_max = 0, salary_negotiable = false;
  const typeMap: Record<string, string> = { 월급: "MONTHLY", 시급: "HOURLY", 연봉: "ANNUAL", 주급: "WEEKLY", 일급: "DAILY" };
  const m = salary.match(/(월급|시급|연봉|주급|일급)\s*([\d,]+)\s*(만)?\s*원?\s*(?:~|-|부터)?\s*([\d,]+)?\s*(만)?\s*원?/);
  if (m && m[2]) {
    salary_type = typeMap[m[1]] || "";
    const toNum = (v: string, man?: string) => {
      let n = Number(v.replace(/,/g, ""));
      if (m[1] === "시급" || m[1] === "일급") { if (man === "만") n *= 10000; } // 시급/일급은 원 단위
      return n;
    };
    salary_amount = toNum(m[2], m[3]);
    if (m[4]) salary_amount_max = toNum(m[4], m[5] || m[3]);
  }
  if (!salary_amount && /협의|면접|내규|추후|결정|회사\s*내규/.test(salary)) salary_negotiable = true;
  return { salary, salary_type, salary_amount, salary_amount_max, salary_negotiable };
}
// 근무시간 "09:00 ~ 18:00 (...)" → "09:00~18:00"
function parseWorkTime(raw: string): string {
  const wt = (raw || "").match(/(오전|오후)?\s*(\d{1,2}):(\d{2})\s*~\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/);
  if (!wt) return "";
  const h = (ap: string | undefined, hh: string) => {
    let n = Number(hh);
    if (ap === "오후" && n < 12) n += 12;
    if (ap === "오전" && n === 12) n = 0;
    return String(n).padStart(2, "0");
  };
  return `${h(wt[1], wt[2])}:${wt[3]}~${h(wt[4], wt[5])}:${wt[6]}`;
}
// "경기 부천" / "인천" / "서울 강남" → 시도 정식명 + 시군구
function normRegionLoose(raw: string): string {
  const parts = (raw || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!parts.length) return "";
  const sido = SIDO[parts[0]] || parts[0];
  return parts.length > 1 ? `${sido} ${parts.slice(1).join(" ")}` : sido;
}

// ───────────── 뷰티잡(beautyjob.kr) ─────────────
// 상세: /massagejob/<id> (UTF-8). board-view 구조에서 라벨 테이블을 읽는다.
function parseBeautyjob(html: string): StructuredResult | null {
  const clean = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  const blockOf = (cls: string, len = 300): string => {
    const m = html.match(new RegExp('class="[^"]*' + cls + '[^"]*"[^>]*>([\\s\\S]{0,' + len + '}?)<\\/', "i"));
    return m ? clean(m[1]) : "";
  };
  const bi = html.indexOf("board-view-job-content-box");
  const body = bi >= 0 ? html.slice(bi) : html;
  const afterBody = (label: string): string => {
    const i = body.indexOf(label);
    if (i < 0) return "";
    const seg = body.slice(i + label.length, i + label.length + 160);
    return clean(seg.replace(/<[^>]+>/g, "§")).split("§").map((s) => s.trim()).filter(Boolean)[0] || seg.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").split(/\s{2,}|\n/).map((s) => s.trim()).filter(Boolean)[0] || "";
  };

  const title = blockOf("board-view-job-ct-header");
  if (!title) return null;
  const jobArea = blockOf("bvj-ct-job-area", 80);
  const company = afterBody("상호명");
  const region = normRegionLoose(afterBody("근무지역"));
  const sal = parseSalaryText(afterBody("급여조건"));
  const work_time = parseWorkTime(afterBody("근무시간"));
  const career = mapCareer(afterBody("경력조건"));
  const employment_type = mapEmploymentKo(afterBody("고용형태"));

  // 직군 매핑: 모집업종(jobArea) + 제목
  const sug = suggestCats(`${jobArea} ${title}`);

  return {
    title,
    company_name: company,
    region,
    career,
    employment_type,
    always_open: true, // 뷰티잡은 상시 채용이 대부분(마감일 필드 없음)
    ...sal,
    work_time,
    job_type: sug.job_type || "STORE", // 뷰티잡은 매장(샵)이 대부분
    job_categories: sug.job_categories,
    images: [],
    _confident: !!(title && (company || sal.salary_type || sal.salary_negotiable || sug.job_categories.length)),
  };
}

// 주소 문자열 → "시도정식명 시군구"
function regionFromAddrText(addr: string): string {
  const m = (addr || "").match(
    /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s*([가-힣]+[시군구])/
  );
  if (!m) return "";
  return `${SIDO[m[1]] || m[1]} ${m[2]}`;
}

// ───────────── 뷰티인잡(beautyinjob.kr) ─────────────
// 상세: /job/detail/<id> (UTF-8, 서버 렌더). 리뉴얼로 마크업이 두 패턴 혼용:
//   (A) <div><dt>라벨</dt><dd>값</dd></div>  — 모집마감·모집인원·모집업종·모집분야·경력·급여·복지정책, 그리고 dl.d_list 안 대표/주소/채용담당자/연락처
//   (B) <div class="txt"><div class="sup">라벨</div><div class="sub">값</div></div> — 직종·근무기간·고용형태·업체명·휴무일
//   근무지역: <h4>근무지역 <span class="info txt">주소</span></h4>
//   제목: .text_wrap 안 .sub(업체) / .title(제목). 포스터 이미지 /data/job|member/... → 재호스팅.
function parseBeautyinjob(html: string): StructuredResult | null {
  const clean = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
  const di = html.indexOf("detail_all");
  const body = di >= 0 ? html.slice(di) : html;

  // 제목·업체: 상단 .text_wrap 안 .sub(업체명) / .title(제목)
  const tw = (body.match(/text_wrap[\s\S]{0,600}?<\/div>\s*<\/div>/i) || [])[0] || body.slice(0, 1500);
  const company0 = clean((tw.match(/class="sub"[^>]*>([\s\S]{0,120}?)<\/div>/i) || [])[1] || "");
  const title = clean((tw.match(/class="title"[^>]*>([\s\S]{0,200}?)<\/div>/i) || [])[1] || "");
  if (!title && !company0) return null;

  // 라벨-값 수집: (A) dt/dd, (B) sup/sub
  const pairs: Record<string, string> = {};
  for (const m of body.matchAll(/<dt>([\s\S]{0,40}?)<\/dt>\s*<dd>([\s\S]{0,500}?)<\/dd>/gi)) {
    const k = clean(m[1]); const v = clean(m[2]);
    if (k && !(k in pairs)) pairs[k] = v;
  }
  for (const m of body.matchAll(/class="sup"[^>]*>([\s\S]{0,40}?)<\/div>\s*<div class="sub"[^>]*>([\s\S]{0,200}?)<\/div>/gi)) {
    const k = clean(m[1]); const v = clean(m[2]);
    if (k && !(k in pairs)) pairs[k] = v;
  }

  // 근무지역(주소): <h4>근무지역 <span ...>주소</span></h4> 우선, 없으면 업체정보 주소
  const addr = clean((body.match(/근무지역\s*<span[^>]*>([\s\S]{0,200}?)<\/span>/i) || [])[1] || "") || pairs["주소"] || "";
  const region = regionFromAddrText(addr);
  const address = addr || region;

  const company = pairs["업체명"] || company0;
  const career = mapCareer(pairs["경력"] || "");
  const empRaw = pairs["고용형태"] || "";
  let employment_type = "";
  if (/정규/.test(empRaw)) employment_type = "정규직";
  else if (/계약/.test(empRaw)) employment_type = "계약직";
  else if (/파트|아르바이트|알바/.test(empRaw)) employment_type = "파트타임";

  const dead = pairs["모집마감"] || "";
  const always_open = /상시|수시|충원|채용\s*시/.test(dead) || !/\d{4}/.test(dead);
  const deadline = (dead.match(/\d{4}[-.]\d{1,2}[-.]\d{1,2}/) || [])[0]?.replace(/\./g, "-") || "";

  // 급여: '급여' 값(추후협의 등) 우선, 없으면 제목 속 금액
  const salRaw = pairs["급여"] || "";
  let sal: { salary: string; salary_type: string; salary_amount: number; salary_amount_max: number; salary_negotiable: boolean };
  if (/협의|추후|면접|내규/.test(salRaw)) {
    sal = { salary: "", salary_type: "", salary_amount: 0, salary_amount_max: 0, salary_negotiable: true };
  } else {
    const st = (salRaw.match(/(월급|시급|연봉|주급)?\s*[\d,]+\s*만?\s*원/) || [])[0] || (title.match(/(월급|시급|연봉|주급)?\s*[\d,]+\s*만?\s*원/) || [])[0] || "";
    sal = st ? parseSalaryText(st) : { salary: "", salary_type: "", salary_amount: 0, salary_amount_max: 0, salary_negotiable: false };
  }

  // 복지정책 → 필터 태그
  const welfare = pairs["복지정책"] || pairs["복리후생"] || "";
  const benefit_tags: string[] = [];
  if (/4대|국민연금|고용보험|산재|건강보험/.test(welfare)) benefit_tags.push("4대보험");
  if (/인센/.test(welfare)) benefit_tags.push("인센티브");
  if (/식대|중식|조식|식사|식비/.test(welfare)) benefit_tags.push("식대 지원");
  if (/주차/.test(welfare)) benefit_tags.push("주차 가능");
  if (/기숙사|숙소/.test(welfare)) benefit_tags.push("기숙사 제공");
  // '내부교육' 같은 표현이 '교육비 지원'으로 오매칭되지 않게 — 교육비/수강료 계열만.
  if (/교육비|교육\s*지원|학원비|수강료/.test(welfare)) benefit_tags.push("교육비 지원");
  // 칩으로 매핑 안 되는 항목(명절휴무·여름휴가·월차 등)이 사라지지 않게 원문 복지 문구를 비고로 보존.
  const extra_notes = welfare ? `복리후생: ${welfare}` : "";

  const headcount = Number(((pairs["모집인원"] || "").match(/(\d+)\s*명/) || [])[1] || "") || 0;
  const contact_name = (pairs["채용담당자"] || pairs["대표"] || "").split(" ")[0] || "";
  const contact_phone = ((pairs["연락처"] || "").match(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/) || [])[0]?.replace(/[-\s]/g, "") || "";
  const representative_name = (pairs["대표"] || "").split(" ")[0] || "";

  // 직군: 직종 + 모집분야 + 모집업종 + 제목
  const sug = suggestCats(`${pairs["직종"] || ""} ${pairs["모집분야"] || ""} ${pairs["모집업종"] || ""} ${title}`);
  // 업종: 모집업종/직종 기준(네일샵 등 STORE 업종 목록에 맞춤)
  let industry = "";
  {
    const ck = `${pairs["모집업종"] || ""} ${pairs["직종"] || ""} ${pairs["모집분야"] || ""} ${title}`;
    if (/네일/.test(ck)) industry = "네일샵";
    else if (/속눈썹|왁싱|반영구|래쉬/.test(ck)) industry = "속눈썹·왁싱·반영구";
    else if (/피부|에스테틱|스킨\s*케어|관리사/.test(ck)) industry = "피부·에스테틱";
    else if (/메이크업|분장/.test(ck)) industry = "메이크업";
    else if (/애견|반려|펫\s|펫미용/.test(ck)) industry = "애견미용";
    else if (/헤어|미용실|살롱|바버|디자이너|미용사/.test(ck)) industry = "헤어샵";
  }
  // 직군 도메인 매핑(suggestCats가 놓칠 때 대비 — 뷰티인잡은 미용 샵 위주)
  let job_categories = sug.job_categories;
  {
    const ck2 = `${pairs["직종"] || ""} ${pairs["모집분야"] || ""} ${pairs["모집업종"] || ""}`;
    if (/네일/.test(ck2)) job_categories = ["네일 아티스트"];
    else if (/속눈썹|반영구|래쉬/.test(ck2)) job_categories = ["속눈썹·반영구 아티스트"];
    else if (/메이크업/.test(ck2)) job_categories = ["메이크업 아티스트"];
    else if (/피부|에스테틱|관리사/.test(ck2)) job_categories = ["피부관리사(일반·경락)"];
  }

  // 학력: 라벨 '학력' → 뷰티워크 학력 옵션에 매핑
  const eduRaw = pairs["학력"] || "";
  let education = "";
  if (/무관/.test(eduRaw)) education = "학력무관";
  else if (/고졸/.test(eduRaw)) education = "고졸 이상";
  else if (/초대졸|전문대/.test(eduRaw)) education = "초대졸 이상";
  else if (/대졸|학사/.test(eduRaw)) education = "대졸 이상";
  else if (/석사|대학원/.test(eduRaw)) education = "석사 이상";

  // 근무기간: 라벨 '근무기간'(협의 등) → 뷰티워크 근무기간 옵션
  const wpRaw = pairs["근무기간"] || "";
  let work_period = "";
  if (/협의/.test(wpRaw)) work_period = "협의";
  else if (/6개월\s*~\s*1년|6개월.*1년/.test(wpRaw)) work_period = "6개월 ~ 1년";
  else if (/1년\s*이상/.test(wpRaw)) work_period = "1년 이상";
  else if (/6개월|단기/.test(wpRaw)) work_period = "~6개월";

  // 상세요강 본문 + 뷰티인잡 템플릿/저작권 푸터 제거
  // (주의: 뷰티인잡은 상세요강 전문을 로그인 회원에게만 노출 → 서버 fetch로는 미리보기 앞부분까지만 확보 가능)
  let descText = "";
  {
    const bt = clean(body);
    const si = bt.indexOf("상세요강");
    if (si >= 0) {
      let t = bt.slice(si + 4);
      t = t.split(/내용\s*더보기|근무지역|업체정보|본\s*정보는|무단\s*전재|문의\s*시|뷰티인잡\s*보고|채용담당자|연락처/)[0];
      descText = t.trim().slice(0, 2000);
      if (descText.length < 10) descText = "";
    }
  }

  // 이미지: /data/job|member/... (썸네일 제외) → 절대경로, 재호스팅 플래그
  const images = [
    ...new Set([...body.matchAll(/\/data\/(?:job|member)\/[^\s"')]+\.(?:jpe?g|png|gif|webp)/gi)].map((m) => m[0])),
  ]
    .filter((u) => !/_thumb\./i.test(u))
    .map((p) => `https://www.beautyinjob.kr${p}`)
    .slice(0, 10);

  const out: StructuredResult = {
    title,
    company_name: company,
    region,
    address,
    career,
    employment_type,
    always_open,
    deadline,
    headcount: headcount || 0,
    ...sal,
    benefit_tags,
    contact_name,
    contact_phone,
    representative_name,
    industry,
    education,
    work_period,
    extra_notes,
    description: descText,
    job_type: sug.job_type || "STORE", // 뷰티인잡은 매장(샵)이 대부분
    job_categories,
    _confident: !!(title && (company || region || job_categories.length)),
  };
  if (images.length) {
    out.images = images;
    out._rehost = true;
    out._rehostReferer = "https://www.beautyinjob.kr/";
  } else {
    out.images = [];
  }
  return out;
}

// ───────────── 뷰티잡매니저(beautyjobmanager.com) ─────────────
// 상세: /m/content/work_employ_detail.html?no=<no> (EUC-KR).
// tbox_tit=제목, th/td 테이블에 회사명·모집직종·근무지역·근무형태·급여사항·경력·접수기간.
function parseBeautyjobManager(html: string): StructuredResult | null {
  const clean = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/＞/g, " ").replace(/\s+/g, " ").trim();

  const title = clean((html.match(/class="[^"]*\btbox_tit\b[^"]*"[^>]*>([\s\S]{0,180}?)<\//i) || [])[1] || "");
  const pairs: Record<string, string> = {};
  for (const m of html.matchAll(/<(th|td)[^>]*>([\s\S]{0,40}?)<\/\1>\s*<td[^>]*>([\s\S]{0,180}?)<\/td>/gi)) {
    const k = clean(m[2]);
    const v = clean(m[3]);
    if (k && v && k.length < 12 && !(k in pairs)) pairs[k] = v;
  }
  const company = pairs["회사명"] || "";
  if (!title && !company) return null;

  const region = normRegionLoose(pairs["근무지역"] || "");
  const career = mapCareer((pairs["경력"] || "").replace(/[↑↓]/g, " ").trim());
  const employment_type = mapEmploymentKo(pairs["근무형태"] || pairs["고용형태"] || "");
  const work_time = parseWorkTime(pairs["근무시간"] || "");
  // 복리후생 → 필터 태그(원문에 있으면)
  const welfare = pairs["복리후생"] || pairs["복지"] || "";
  const benefit_tags: string[] = [];
  if (/4대|국민연금|고용보험|산재|건강보험/.test(welfare)) benefit_tags.push("4대보험");
  if (/인센/.test(welfare)) benefit_tags.push("인센티브");
  if (/식대|중식|조식|식사|식비/.test(welfare)) benefit_tags.push("식대 지원");
  if (/주차/.test(welfare)) benefit_tags.push("주차 가능");
  if (/기숙사|숙소|숙식/.test(welfare)) benefit_tags.push("기숙사 제공");
  if (/교육비|교육\s*지원|학원비|수강료/.test(welfare)) benefit_tags.push("교육비 지원");
  if (/퇴직금/.test(welfare)) benefit_tags.push("퇴직금");

  const sal = parseSalaryText(pairs["급여사항"] || "");
  const accept = pairs["접수기간"] || "";
  const always_open = /상시|수시|충원|채용\s*시/.test(accept) || !/\d{4}/.test(accept);
  const deadline = (accept.match(/\d{4}[-.]\d{1,2}[-.]\d{1,2}/) || [])[0]?.replace(/\./g, "-") || "";

  const sug = suggestCats(`${pairs["모집직종"] || ""} ${pairs["담당업무"] || ""} ${title}`);

  // 이미지: 에디터/공고 업로드 이미지(/wysiwyg/PEG/ · /PEG/)만. 사이트 크롬(/images/)은 제외. 핫링크 대비 재호스팅.
  const imgs = [...new Set(
    [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:jpe?g|png|gif|webp))["']/gi)].map((m) => m[1])
  )]
    .filter((u) => /(?:^|\/)(?:wysiwyg\/)?PEG\//i.test(u))
    .map((u) => (/^https?:\/\//i.test(u) ? u : `https://beautyjobmanager.com/${u.replace(/^[./]+/, "")}`))
    .slice(0, 12);

  const out: StructuredResult = {
    title,
    company_name: company,
    region,
    career,
    employment_type,
    work_time,
    benefit_tags,
    always_open,
    deadline,
    ...sal,
    main_duties: pairs["담당업무"] || "",
    job_type: sug.job_type || "STORE", // 뷰티잡매니저는 매장(샵)이 대부분
    job_categories: sug.job_categories,
    images: imgs,
    _confident: !!(title && (company || region || sug.job_categories.length)),
  };
  if (imgs.length) { out._rehost = true; out._rehostReferer = "https://beautyjobmanager.com/"; }
  return out;
}

// ───────────── 미용인잡(miyonginjob.com) ─────────────
// 상세: /employ/employ_detail.html?no=<no> (EUC-KR). 본문 표는 변칙적이라 메타로 파싱.
//   og:title       : "회사 | 지역(시도 시군구) | 실제 공고제목"
//   meta description: "요약제목 : 급여 X | 경력 Y | 형태 Z 상세조건 ..."
function parseMiyonginjob(html: string): StructuredResult | null {
  const clean = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

  const ogT = clean((html.match(/og:title" content="([^"]*)"/) || [])[1] || "").replace(/\s*-\s*미용인잡\s*$/, "");
  const parts = ogT.split("|").map((s) => s.trim());
  if (parts.length < 2) return null;
  const company = parts[0] || "";
  const region = normRegionLoose(parts[1] || "");
  const title = (parts.slice(2).join(" | ") || parts[0]).trim();

  const desc = clean((html.match(/name="description" content="([^"]*)"/) || [])[1] || "");
  const dm = desc.match(/급여\s*(.*?)\s*\|\s*경력\s*(.*?)\s*\|\s*형태\s*(.*?)\s*(?:상세조건|$)/);
  const salaryRaw = dm ? dm[1].trim() : "";
  let careerRaw = dm ? dm[2].trim() : "";
  const empRaw = dm ? dm[3].trim() : "";

  // 급여: "300~350만원이상"(접두어 없음)은 월급으로 간주
  let sal = parseSalaryText(salaryRaw);
  if (!sal.salary_type && !sal.salary_negotiable) {
    const rng = salaryRaw.match(/([\d,]+)\s*(?:~|-)\s*([\d,]+)\s*만원/);
    const one = salaryRaw.match(/([\d,]+)\s*만원/);
    if (rng) sal = { salary: salaryRaw, salary_type: "MONTHLY", salary_amount: Number(rng[1].replace(/,/g, "")), salary_amount_max: Number(rng[2].replace(/,/g, "")), salary_negotiable: false };
    else if (one) sal = { salary: salaryRaw, salary_type: "MONTHLY", salary_amount: Number(one[1].replace(/,/g, "")), salary_amount_max: 0, salary_negotiable: false };
    else if (/협의|추후|면접|내규/.test(salaryRaw)) sal = { ...sal, salary: salaryRaw, salary_negotiable: true };
  }

  careerRaw = careerRaw.replace(/신입\s*및\s*경력/, "무관");
  const career = mapCareer(careerRaw);

  const employment_type = mapEmploymentKo(empRaw);
  // 근무시간: 본문에 "HH:MM~HH:MM" 형식이 있으면만(‘11시~7시’ 등 시 표기는 오전/오후 모호 → 잘못된 값 방지 위해 스킵)
  const work_time = parseWorkTime((clean(html).match(/근무시간\s*([\s\S]{0,40})/) || [])[1] || "");

  const kw = clean((html.match(/name="keywords" content="([^"]*)"/) || [])[1] || "");
  const sug = suggestCats(`${title} ${desc} ${kw}`);

  // 이미지: 에디터 업로드(/wysiwyg/PEG/ · /PEG/)만. 사이트 크롬(/images/) 제외. 핫링크 대비 재호스팅.
  const imgs = [...new Set(
    [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:jpe?g|png|gif|webp))["']/gi)].map((m) => m[1])
  )]
    .filter((u) => /(?:^|\/)(?:wysiwyg\/)?PEG\//i.test(u))
    .map((u) => (/^https?:\/\//i.test(u) ? u : `https://www.miyonginjob.com/${u.replace(/^[./]+/, "")}`))
    .slice(0, 12);

  const out: StructuredResult = {
    title,
    company_name: company,
    region,
    career,
    employment_type,
    work_time,
    always_open: true, // 미용인잡은 상시 채용 위주(마감일 미표기)
    ...sal,
    job_type: sug.job_type || "STORE", // 미용실·네일샵이 대부분
    job_categories: sug.job_categories,
    images: imgs,
    _confident: !!(title && (company || region || sug.job_categories.length)),
  };
  if (imgs.length) { out._rehost = true; out._rehostReferer = "https://www.miyonginjob.com/"; }
  return out;
}

// ───────────── 디스패처 ─────────────
export function parseStructured(hostname: string, html: string): StructuredResult | null {
  if (!html) return null;
  if (/hairinjob\.com/i.test(hostname)) return parseHairinjob(html);
  if (/jobkorea\.co\.kr/i.test(hostname)) return parseJobkorea(html);
  if (/albamon\.com/i.test(hostname)) return parseAlbamon(html);
  if (/saramin\.co\.kr/i.test(hostname)) return parseSaramin(html);
  if (/beautyjob\.kr/i.test(hostname)) return parseBeautyjob(html);
  if (/beautyinjob\.kr/i.test(hostname)) return parseBeautyinjob(html);
  if (/beautyjobmanager\.com/i.test(hostname)) return parseBeautyjobManager(html);
  if (/miyonginjob\.com/i.test(hostname)) return parseMiyonginjob(html);
  return null;
}
