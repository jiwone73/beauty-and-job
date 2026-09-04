// lib/data/jobGroups.ts
// 직군 단일 출처 (source of truth)
// 프로필 / 공고등록 / 공고검색 / 인재검색 / 관리자 필터가 전부 이 파일만 import 해서 직군 값을 일치시킨다.
//
// 구조: 매장(STORE) / 본사(OFFICE) → 대분류(1st Depth) → 소분류(2nd Depth)
//  - group  = 대분류 (모달 왼쪽 패널)
//  - items  = 소분류 (모달 오른쪽 = 실제 저장/선택 값)  ← DB에 저장되는 값
//  - SEARCH_TAGS = 소분류별 검색 키워드(영문명·동의어·핵심태그) → 실시간 추천검색 전용, 저장 안 함
//
// 출처: 뷰티워크 업직종별 분류표(2026.08.02) — '업직종분류(최종)' 탭을 저장 트리로,
//       'Sheet2'의 영문명·핵심태그를 검색 태그로 흡수.

export type JobType = "OFFICE" | "STORE";

export interface JobGroup {
  group: string;    // 대분류 (모달 왼쪽 패널)
  items: string[];  // 소분류 (모달 오른쪽 = 실제 저장/선택 값)
}

// ───────────── 매장직 (STORE) : 현장 시술·서비스직 ─────────────
// 출처: 뷰티워크 업직종별 분류표(2026.08.02) '업직종분류(최종)'.
// 한 대분류가 매장·본사 양쪽에 서기도 한다(뷰티 리테일 & 커머스, 의료미용) —
// 같은 산업이라도 현장에서 하는 일과 본사에서 하는 일이 다르기 때문이다.
export const STORE_JOB_GROUPS: JobGroup[] = [
  {
    group: "헤어·바버",
    items: [
      "헤어 디자이너",
      "바버(Barber)",
      "웨딩 헤어디자이너",
      "헤어 스탭(시니어·주니어)",
    ],
  },
  {
    group: "메이크업",
    items: [
      "메이크업 아티스트",
      "프로필·방송 메이크업 아티스트",
      "특수분장사(SFX)",
      "어시스턴트·스탭",
    ],
  },
  {
    group: "네일·속눈썹",
    items: [
      "네일 아티스트",
      "문제성 네일 손발톱 관리사",
      "속눈썹·반영구 아티스트",
      "네일 스탭·인턴",
    ],
  },
  {
    group: "피부·바디",
    items: [
      "피부 관리사(일반·경락)",
      "왁싱·제모 전문가",
      "스파 테라피스트",
      "아로마 테라피스트",
      "바디 테라피스트·체형 관리사",
    ],
  },
  {
    group: "두피·탈모",
    items: [
      "두피 관리사",
      "헤드스파 아티스트",
      "모발이식·탈모 메디컬 스탭",
    ],
  },
  {
    group: "웨딩·이벤트",
    items: [
      "웨딩플래너·총괄 디렉터",
      "웨딩·혼주 메이크업 아티스트",
      "드레스샵 마스터·헬퍼",
      "이벤트·공간 스타일리스트",
      "웨딩홀·행사장 안내 스탭",
    ],
  },
  {
    group: "뷰티 리테일",
    items: [
      "매장 점장·샵마스터(직영)",
      "로드숍 매니저·부매니저",
      "팝업·행사 매니저(단기)",
    ],
  },
  {
    // 시술을 하지 않고 매장에서 사람을 상대하는 자리. 헤어인잡도 샵매니저와
    // 뷰티매니저를 디자이너·피부관리사와 나란히 따로 뽑는다 — 한 공고에서
    // 「뷰티매니저[경력] · 피부관리사[경력] · 샵매니저[경력]」을 함께 건다.
    group: "샵 운영·상담",
    items: [
      // 매장 운영 — 데스크·예약·직원·매출. 헤어살롱 공고에 가장 흔하다.
      "샵매니저",
      // 상담·고객관리·프로그램 판매. 시술은 하지 않는다(피부·에스테틱 쪽).
      // 데스크는 따로 두지 않는다 — 살롱에서는 샵매니저가 겸하고, 헤어인잡
      // 직종 목록에도 없다. 병원 데스크는 의료미용 쪽에 이미 있다.
      "뷰티매니저",
    ],
  },
  {
    // 미용학원이 곧 매장 형태다 — 지점이 있고 지역으로 찾는다. 헤어인잡의
    // 아카데미 공고도 모집분야를 「미용강사[신입]·미용강사[경력]」으로 쓴다.
    // 본사에는 같은 일의 다른 몫으로 「교육·아카데미」가 따로 선다.
    group: "미용강사",
    items: [
      "헤어강사",
      "메이크업강사",
      "네일강사",
      "피부강사",
      // 헤어인잡 공고의 「교육전문강사」가 이 자리다.
      "교육강사",
      // 가르치지 않고 수강생을 챙기는 자리 — 실습 보조·출결·상담·취업 연계.
      // 원장은 두지 않는다: 학원이 원장을 뽑는 일은 샵인샵이 아니면 없다.
      "교육멘토",
    ],
  },
  {
    group: "의료미용",
    items: [
      "상담실장·코디네이터",
      "레이저·피부 파트 스탭",
      "수술실 간호사·간호조무사",
      "미용치과위생사·코디네이터",
      "모발이식 수술 스탭",
      "병원 안내데스크·원무 리셉션",
    ],
  },
];

// ───────────── 본사직 (OFFICE) : 기업·본사직 ─────────────
export const OFFICE_JOB_GROUPS: JobGroup[] = [
  {
    group: "뷰티 플랫폼·콘텐츠",
    items: [
      "뷰티 인플루언서·크리에이터",
      "뷰티 영상 PD·크리에이티브 디렉터",
      "라이브 커머스 호스트·쇼호스트",
      "뷰티 플랫폼 기획·개발",
    ],
  },
  {
    group: "뷰티 리테일 & 커머스",
    items: [
      "브랜드 매니저(BM)·상품기획",
      "뷰티 MD(H&B·이커머스·글로벌)",
      "영업 매니저(국내유통·면세·해외수출)",
      "VMD·매장 디스플레이 디자이너",
    ],
  },
  {
    group: "뷰티 제조·OEM·ODM",
    items: [
      "화장품 연구원(R&D)",
      "제조·생산 관리(QA·QC)",
      "해외 유통·바이어 영업(수출)",
      "경영지원(인사·재무·기획)",
    ],
  },
  {
    group: "의료미용",
    items: [
      "의료통역 스페셜리스트",
      "해외 의료 마케터·바이어 영업",
    ],
  },
  {
    group: "교육·아카데미",
    items: [
      "브랜드 에듀케이터",
      "교육 콘텐츠 기획",
    ],
  },
  {
    group: "HR 서비스",
    items: [
      "뷰티 HR PM·잡매니저",
      "뷰티 전문 헤드헌터",
    ],
  },
];

// ───────────── 검색 태그 (실시간 추천검색 전용) ─────────────
// key = 소분류명, value = 검색 키워드(영문명·동의어·약어·핵심태그). 저장하지 않고 검색 인덱스로만 사용.
export const SEARCH_TAGS: Record<string, string[]> = {
  // 샵 운영·상담
  "샵매니저": ["샵매니저", "매니저", "매장관리", "실장", "데스크", "리셉션", "안내", "예약", "카운터", "운영", "shop manager", "점장"],
  // 살롱·에스테틱·두피샵의 상담 자리를 다 덮는다 — 예전에는 「에스테틱 상담
  // 실장」·「두피·탈모 상담 실장」으로 시술 직군 안에 흩어져 있었다.
  "뷰티매니저": ["뷰티매니저", "상담실장", "상담", "코디네이터", "고객관리", "카운셀러", "에스테틱", "피부샵", "두피", "실장"],
  // 미용강사 — 소분류가 가르치는 분야다. 낱말이 짧아 검색어를 넉넉히 단다.
  "헤어강사": ["헤어강사", "미용강사", "실기강사", "헤어", "커트", "국가고시", "학원", "아카데미", "강사", "선생님"],
  "메이크업강사": ["메이크업강사", "미용강사", "실기강사", "메이크업", "학원", "아카데미", "강사", "선생님"],
  "네일강사": ["네일강사", "미용강사", "실기강사", "네일", "학원", "아카데미", "강사", "선생님"],
  "피부강사": ["피부강사", "미용강사", "실기강사", "피부", "에스테틱", "학원", "아카데미", "강사", "선생님"],
  "교육강사": ["교육강사", "교육전문강사", "미용강사", "실기강사", "커리큘럼", "학원", "아카데미", "교육"],
  "교육멘토": ["교육멘토", "멘토", "수강생관리", "실습보조", "출결", "취업연계", "학원", "아카데미"],
  "브랜드 에듀케이터": ["에듀케이터", "educator", "브랜드교육", "제품교육", "세미나", "트레이너"],
  "교육 콘텐츠 기획": ["교육기획", "커리큘럼", "콘텐츠", "교재", "이러닝"],
  // 헤어 & 바버
  "헤어 디자이너": ["hair", "stylist", "헤어디자이너", "미용사", "커트", "펌", "컬러", "살롱", "프리랜서", "프랜차이즈미용실", "프랜차이즈", "1인샵", "1인 디자이너샵", "대형살롱"],
  "바버(Barber)": ["barber", "바버", "이용사", "페이드컷", "쉐이빙", "면도", "남성"],
  "웨딩 헤어디자이너": ["wedding", "웨딩헤어", "본식", "혼주", "업스타일"],
  // 목록에 적는 이름은 업종을 가리지 않고 "스탭"으로 통일했다. 표준어는
  // "스태프"지만 현장에서 그렇게 부르는 곳이 없어, 구직자가 목록에서 자기
  // 자리를 못 찾았다. 실제 외부 공고도 전부 "헤어스탭" 표기였다.
  // 다만 키워드에는 옛 표기(스태프·스텝)를 남겨 둔다 — 그렇게 적힌 공고도
  // 이 직군으로 걸려야 한다. 찾는 말과 보여줄 말은 같을 필요가 없다.
  "헤어 스탭(시니어·주니어)": ["assistant", "헤어스탭", "스탭", "스태프", "스텝", "인턴", "어시", "샴푸", "와인딩", "리셉션", "막내", "수습", "스페어", "스페아", "단기", "주말", "승급", "매장리셉션", "주니어", "시니어"],
  // 공고는 '스페아'로도 적는다(실제 외부 공고 3건 중 2건이 그 표기였다).

  // 메이크업
  "메이크업 아티스트": ["makeup", "make-up", "mua", "메이크업", "아티스트", "프리랜서", "출장", "freelance", "웨딩혼주", "면접메이크업", "출장샵"],
  "프로필·방송 메이크업 아티스트": ["editorial", "media", "방송", "프로필", "광고", "연예인", "룩북"],
  "특수분장사(SFX)": ["sfx", "특수분장", "분장", "special makeup"],
  "어시스턴트·스탭": ["assistant", "어시스턴트", "스탭", "스태프", "스텝", "인턴"],

  // 네일 & 속눈썹
  "네일 아티스트": ["nail", "네일", "젤", "네일아트", "파츠", "technician", "젤네일", "네일아트샵"],
  "문제성 네일 손발톱 관리사": ["pedicure", "내성발톱", "교정", "손발톱", "푸스플레게", "문제성", "문제성손발톱", "발톱관리", "발관리", "풋케어", "footcare", "foot", "각질", "굳은살", "티눈", "발"],
  "속눈썹·반영구 아티스트": ["eyelash", "속눈썹", "연장", "속눈썹펌", "반영구", "semi-permanent", "속눈썹연장", "연장전문샵"],
  "네일 스탭·인턴": ["스탭", "스태프", "스텝", "인턴", "staff", "네일"],

  // 스킨 & 바디케어
  "왁싱·제모 전문가": ["waxing", "왁싱", "제모", "브라질리언", "슈가링", "eyebrow wax", "레이저제모"],
  "피부 관리사(일반·경락)": ["aesthetician", "피부관리사", "에스테틱", "에스테티션", "경락", "페이셜", "관리사", "피부관리실", "프랜차이즈에스테틱", "호텔스파", "고급스파"],
  "스파 테라피스트": ["spa", "therapist", "스파", "테라피", "호텔", "웰니스", "리조트"],
  "아로마 테라피스트": ["aroma", "아로마", "테라피", "마사지"],
  "바디 테라피스트·체형 관리사": ["body", "바디", "체형", "관리", "슬리밍"],

  // 두피 & 탈모
  "두피 관리사": ["scalp", "trichologist", "두피", "트리콜로지스트", "탈모", "두피관리", "WT메소드", "닥터스칼프", "아민진", "두피탈모관리", "전문센터", "개인센터"],
  "헤드스파 아티스트": ["head spa", "헤드스파", "아로마", "스파", "이어테라피"],
  "모발이식·탈모 메디컬 스탭": ["hair transplant", "모발이식", "메디컬", "탈모", "생착", "모발이식병원", "탈모치료", "피부과", "한의원", "부속케어실"],

  // 웨딩 & 이벤트
  "웨딩플래너·총괄 디렉터": ["wedding planner", "웨딩플래너", "디렉터", "총괄"],
  "웨딩·혼주 메이크업 아티스트": ["wedding makeup", "웨딩", "혼주", "본식", "롱래스팅"],
  "드레스샵 마스터·헬퍼": ["dress", "드레스", "헬퍼", "마스터", "드레스샵"],
  "이벤트·공간 스타일리스트": ["event", "이벤트", "스타일리스트", "공간", "디렉터", "연출", "데코"],
  "웨딩홀·행사장 안내 스탭": ["안내", "스탭", "스태프", "스텝", "행사", "웨딩홀"],

  // 뷰티 리테일(매장)
  "매장 점장·샵마스터(직영)": ["store manager", "점장", "샵마스터", "매니저", "직영", "브랜드직영", "직영매장", "H&B스토어", "올리브영", "명동", "홍대"],
  "로드숍 매니저·부매니저": ["로드숍", "매니저", "부매니저", "뷰티 어드바이저", "BA", "카운터", "화장품 판매", "H&B", "올리브영"],
  "팝업·행사 매니저(단기)": ["popup", "팝업", "행사", "단기"],

  // 의료미용(현장)
  "상담실장·코디네이터": ["consultant", "coordinator", "상담실장", "코디네이터", "병원", "예약", "병원리셉션", "예약관리", "시술패키지", "세일즈총괄"],
  "레이저·피부 파트 스탭": ["laser", "레이저", "피부", "간호조무사", "필링", "압출"],
  "수술실 간호사·간호조무사": ["nurse", "간호사", "간호조무사", "수술실", "op"],
  "미용치과위생사·코디네이터": ["dental", "치과위생사", "미용치과", "코디네이터"],
  "모발이식 수술 스탭": ["hair transplant", "모발이식", "수술", "어시스트", "생착"],
  "병원 안내데스크·원무 리셉션": ["원무", "리셉션", "안내데스크", "reception", "접수"],

  // 뷰티 플랫폼·콘텐츠 (본사)
  "뷰티 인플루언서·크리에이터": ["influencer", "인플루언서", "크리에이터", "creator", "유튜버", "공구", "바이럴"],
  "뷰티 영상 PD·크리에이티브 디렉터": ["pd", "producer", "영상", "크리에이티브", "편집", "숏폼", "릴스", "틱톡"],
  "라이브 커머스 호스트·쇼호스트": ["live commerce", "쇼호스트", "라이브", "방송", "host", "셀링"],
  "뷰티 플랫폼 기획·개발": ["기획", "개발", "ui", "ux", "개발자", "pm", "po", "product manager"],

  // 뷰티 리테일·커머스(본사)
  "브랜드 매니저(BM)·상품기획": ["bm", "brand manager", "브랜드매니저", "상품기획", "기획", "중견브랜드", "뷰티대기업"],
  "뷰티 MD(H&B·이커머스·글로벌)": ["md", "머천다이징", "이커머스", "유통", "h&b", "글로벌"],
  "영업 매니저(국내유통·면세·해외수출)": ["sales", "영업", "유통", "면세", "수출", "b2b", "글로벌 세일즈", "다국어", "면세점"],
  "VMD·매장 디스플레이 디자이너": ["vmd", "디스플레이", "비주얼", "디자이너", "visual merchandising"],

  // 뷰티 제조·OEM·ODM
  "경영지원(인사·재무·기획)": ["경영지원", "인사", "총무", "hr", "재무", "회계", "법무", "경영기획", "전략기획", "기획"],
  "화장품 연구원(R&D)": ["r&d", "연구원", "연구", "제형", "성분", "처방", "researcher"],
  "제조·생산 관리(QA·QC)": ["qa", "qc", "생산관리", "품질", "제조", "quality"],
  "해외 유통·바이어 영업(수출)": ["수출", "바이어", "b2b", "무역", "글로벌영업", "export"],

  // 의료미용(본사·글로벌)
  "의료통역 스페셜리스트": ["의료통역", "통역", "의료관광", "interpretation", "외국인", "코디", "외국인환자", "글로벌의료", "통역코디"],
  "해외 의료 마케터·바이어 영업": ["해외마케터", "의료마케팅", "바이어", "글로벌", "영업"],

  // HR 서비스·채용대행
  "뷰티 HR PM·잡매니저": ["hr", "pm", "잡매니저", "job manager", "노무", "근태", "파견", "도급", "관리소장", "백화점판매직", "면세점파견", "아웃소싱"],
  "뷰티 전문 헤드헌터": ["헤드헌터", "headhunter", "서치펌", "채용", "search firm", "리크루터", "임원서치", "공채대행", "채용대행"],
};

// ───────────── 기본 헬퍼 (기존 시그니처 그대로 유지) ─────────────

// jobType으로 대분류 배열 (모달 왼쪽 패널용)
export function getJobGroups(jobType: JobType): JobGroup[] {
  return jobType === "STORE" ? STORE_JOB_GROUPS : OFFICE_JOB_GROUPS;
}

// 대분류명 리스트만
export function getGroupNames(jobType: JobType): string[] {
  return getJobGroups(jobType).map((g) => g.group);
}

// 특정 대분류의 소분류 (모달 오른쪽 패널용)
export function getJobSubGroups(jobType: JobType, group: string): string[] {
  const found = getJobGroups(jobType).find((g) => g.group === group);
  return found ? found.items : [];
}

// 전체 소분류 평탄화 (검색 옵션·유효성 검증용)
export function getAllJobItems(jobType: JobType): string[] {
  return getJobGroups(jobType).flatMap((g) => g.items);
}

// 소분류 → 소속 대분류 역매핑 (선택 칩에 대분류 라벨 붙일 때)
export function getGroupOfItem(jobType: JobType, item: string): string | null {
  const found = getJobGroups(jobType).find((g) => g.items.includes(item));
  return found ? found.group : null;
}

// DB 저장 전 유효성 검증 (오타·구버전 값 방지)
export function isValidJobItem(jobType: JobType, item: string): boolean {
  return getAllJobItems(jobType).includes(item);
}

// ───────────── 실시간 추천검색 ─────────────

export interface JobSearchResult {
  jobType: JobType;          // STORE / OFFICE
  group: string;             // 대분류
  item: string | null;       // 소분류 (대분류 자체가 매칭되면 null)
  label: string;             // 화면 표시용 (item ?? group)
  path: string;              // 경로 표시용 "매장 · 네일 & 속눈썹"
  matchedOn: "item" | "tag" | "group" | "chosung"; // 어디서 걸렸는지
}

// 한글 초성 추출 (예: "네일" → "ㄴㅇ") — 초성 검색용
const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
function toChosung(str: string): string {
  let out = "";
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHOSUNG[Math.floor((code - 0xac00) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}
// 쿼리가 전부 초성(ㄱ~ㅎ)으로만 이루어졌는지
function isChosungQuery(q: string): boolean {
  return q.length > 0 && /^[ㄱ-ㅎ]+$/.test(q);
}

const TRACK_LABEL: Record<JobType, string> = { STORE: "매장", OFFICE: "오피스" };

/**
 * 글자 입력 시 실시간 추천 검색.
 * 매칭 우선순위: 소분류 앞글자 > 소분류 포함 > 초성 > 태그 > 대분류.
 * @param query   입력 문자열
 * @param jobType 특정 트랙만 검색하려면 지정 (없으면 매장·본사 전체)
 * @param limit   최대 결과 수 (기본 20)
 */
export function searchJobItems(
  query: string,
  jobType?: JobType,
  limit = 20
): JobSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tracks: JobType[] = jobType ? [jobType] : ["STORE", "OFFICE"];
  const chosungMode = isChosungQuery(query.trim());
  const scored: { score: number; res: JobSearchResult }[] = [];
  const seen = new Set<string>();

  for (const t of tracks) {
    for (const g of getJobGroups(t)) {
      // 대분류 매칭 (낮은 우선순위)
      const groupHit =
        g.group.toLowerCase().includes(q) ||
        (chosungMode && toChosung(g.group).includes(query.trim()));

      for (const item of g.items) {
        const key = `${t}|${item}`;
        if (seen.has(key)) continue;

        const lower = item.toLowerCase();
        const tags = (SEARCH_TAGS[item] || []).map((x) => x.toLowerCase());

        let score = -1;
        let matchedOn: JobSearchResult["matchedOn"] = "item";

        if (lower.startsWith(q)) {
          score = 0;
          matchedOn = "item";
        } else if (lower.includes(q)) {
          score = 1;
          matchedOn = "item";
        } else if (chosungMode && toChosung(item).includes(query.trim())) {
          score = 2;
          matchedOn = "chosung";
        } else if (tags.some((tag) => tag.includes(q))) {
          score = 3;
          matchedOn = "tag";
        } else if (groupHit) {
          score = 4;
          matchedOn = "group";
        }

        if (score >= 0) {
          seen.add(key);
          scored.push({
            score,
            res: {
              jobType: t,
              group: g.group,
              item,
              label: item,
              path: `${TRACK_LABEL[t]} · ${g.group}`,
              matchedOn,
            },
          });
        }
      }

      // 소분류가 하나도 안 걸렸어도 대분류가 걸리면 "대분류 전체" 항목 하나 추가
      if (groupHit) {
        const gkey = `${t}|__group__|${g.group}`;
        if (!seen.has(gkey)) {
          seen.add(gkey);
          scored.push({
            score: 5,
            res: {
              jobType: t,
              group: g.group,
              item: null,
              label: `${g.group} 전체`,
              path: `${TRACK_LABEL[t]}`,
              matchedOn: "group",
            },
          });
        }
      }
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((s) => s.res);
}

// ───────────── 경력 단계 ─────────────
// 대분류마다 사다리가 다르다. 실장은 헤어에만 둔다 — 피부·두피는 소분류에
// 이미 '상담실장'이 있고 그쪽은 시술을 하지 않는 다른 자리다.
export const 시술단계 = ["인턴", "신입", "경력"] as const;
export const 헤어단계 = ["인턴", "신입", "경력", "실장"] as const;
export const 관리단계 = ["신입", "매니저급", "점장급"] as const;
// 본사는 자리가 아니라 연차로 뽑는다. 뷰티 본사 채용을 다루는 코공고도
// 전부 「경력 3-5년」·「신입 ~ 경력 5년」으로 적지 직급으로 적지 않는다.
// 「리드」는 IT 말이라 우리 공고 325건에서 한 번도 안 골렸다.
export const 사무단계 = ["신입", "1~2년", "3~5년", "5~10년", "10년+"] as const;

const 단계표: Record<string, readonly string[]> = {
  "헤어·바버": 헤어단계,
  "메이크업": 시술단계,
  "네일·속눈썹": 시술단계,
  "피부·바디": 시술단계,
  "두피·탈모": 시술단계,
  // 웨딩·이벤트는 수련 과정(인턴)이 따로 없다 — 바로 실무로 들어간다.
  "웨딩·이벤트": ["신입", "경력"],
  // 이름은 STORE_JOB_GROUPS 의 대분류와 한 글자도 다르면 안 된다 — 예전에는
  // 「뷰티 리테일(매장)」·「의료미용(현장)」으로 적혀 있어 아무것도 못 찾고
  // 매장 공고에 본사 단계(리드)가 떴다.
  "뷰티 리테일": 관리단계,
  // 의료미용 현장은 소분류에 '상담실장·코디네이터'가 이미 있어 실장을 단계로 두지 않는다.
  "의료미용": ["신입", "경력"],
  // 강사 자리에는 수련 과정(인턴)이 없다.
  "미용강사": ["신입", "경력"],
  "샵 운영·상담": ["신입", "경력"],
};

/** 대분류의 경력 단계. 본사는 직군을 가리지 않고 한 사다리를 쓴다.
 *  대분류 이름이 매장·본사에 겹치는 것들이 있어(리테일·의료미용·교육) 어느
 *  쪽을 묻는지 함께 받아야 한다. */
export function 경력단계(대분류: string, jobType: JobType = "STORE"): readonly string[] {
  if (jobType === "OFFICE") return 사무단계;
  return 단계표[대분류] || 사무단계;
}

/** 소분류 이름으로 찾을 때. */
export function 직군의경력단계(item: string, jobType?: JobType): readonly string[] {
  if (jobType === "OFFICE") return 사무단계;
  const g = jobType === "STORE"
    ? getGroupOfItem("STORE", item)
    : (getGroupOfItem("STORE", item) || getGroupOfItem("OFFICE", item));
  return (g && 단계표[g]) || 사무단계;
}

/** 새 단계를 옛 두 갈래(신입/경력)로 접는다 — 구직자 필터와 기존 공고가 그 둘을 쓴다. */
export function 경력묶음(단계: string): "신입" | "경력" {
  return 단계 === "인턴" || 단계 === "신입" ? "신입" : "경력";
}
