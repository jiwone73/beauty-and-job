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
export const STORE_JOB_GROUPS: JobGroup[] = [
  {
    group: "헤어 & 바버",
    items: [
      "헤어 디자이너",
      "바버(Barber)",
      "웨딩 헤어디자이너",
      "헤어 스태프(시니어·주니어)",
      "주말·단기 스페어",
    ],
  },
  {
    group: "메이크업",
    items: [
      "메이크업 아티스트",
      "프로필·방송 메이크업",
      "특수분장사(SFX)",
      "출장 프리랜서 아티스트",
      "어시스턴트·스태프",
    ],
  },
  {
    group: "네일 & 속눈썹",
    items: [
      "네일 아티스트",
      "문제성 네일 교정 전문가",
      "속눈썹·반영구 아티스트",
      "네일 스태프·인턴",
    ],
  },
  {
    group: "스킨 & 바디케어",
    items: [
      "피부관리사(일반·경락)",
      "스파 테라피스트",
      "아로마 테라피스트",
      "바디·체형 관리사",
      "에스테틱 상담실장",
    ],
  },
  {
    group: "두피 & 탈모",
    items: [
      "두피 관리사",
      "헤드스파 아티스트",
      "모발이식·탈모 메디컬 스태프",
      "두피·탈모 상담실장",
    ],
  },
  {
    group: "웨딩 & 이벤트",
    items: [
      "웨딩플래너·총괄 디렉터",
      "웨딩·혼주 메이크업",
      "드레스샵 마스터·헬퍼",
      "이벤트 디렉터·공간 스타일리스트",
      "웨딩 스냅·본식 포토그래퍼",
      "웨딩홀·행사장 안내 스태프",
    ],
  },
  {
    group: "뷰티 리테일(매장)",
    items: [
      "매장 점장·샵마스터",
      "로드숍 매니저·부매니저",
      "뷰티 어드바이저(BA)",
      "H&B·로드숍 카운터 스태프",
      "글로벌 세일즈(다국어)",
      "팝업·행사 매니저(단기)",
    ],
  },
  {
    group: "의료미용(현장)",
    items: [
      "상담실장·코디네이터",
      "레이저·피부 파트 스태프",
      "수술실 간호사·간호조무사",
      "미용치과위생사",
      "모발이식 수술 스태프",
      "병원 안내데스크·원무",
    ],
  },
];

// ───────────── 본사직 (OFFICE) : 기업·본사직 ─────────────
export const OFFICE_JOB_GROUPS: JobGroup[] = [
  {
    group: "뷰티 플랫폼·콘텐츠",
    items: [
      "뷰티 인플루언서·크리에이터",
      "영상 PD·크리에이티브 디렉터",
      "라이브커머스 호스트·쇼호스트",
      "플랫폼 기획·개발",
    ],
  },
  {
    group: "뷰티 리테일·커머스(본사)",
    items: [
      "브랜드 매니저(BM)·상품기획",
      "뷰티 MD(H&B·이커머스·글로벌)",
      "영업 매니저(국내유통·면세·수출)",
      "VMD·디스플레이 디자이너",
    ],
  },
  {
    group: "뷰티 제조·OEM·ODM",
    items: [
      "화장품 연구원(R&D)",
      "제조·생산관리(QA·QC)",
      "해외 유통·바이어 영업(수출)",
    ],
  },
  {
    group: "의료미용(본사·글로벌)",
    items: [
      "의료통역 스페셜리스트",
      "해외 의료 마케터·바이어 영업",
    ],
  },
  {
    group: "HR 서비스·채용대행",
    items: [
      "뷰티 HR PM·잡매니저",
      "현장 파견·도급 관리소장",
      "뷰티 전문 헤드헌터",
    ],
  },
];

// ───────────── 검색 태그 (실시간 추천검색 전용) ─────────────
// key = 소분류명, value = 검색 키워드(영문명·동의어·약어·핵심태그). 저장하지 않고 검색 인덱스로만 사용.
export const SEARCH_TAGS: Record<string, string[]> = {
  // 헤어 & 바버
  "헤어 디자이너": ["hair", "stylist", "헤어디자이너", "미용사", "커트", "펌", "컬러", "살롱", "프리랜서"],
  "바버(Barber)": ["barber", "바버", "이용사", "페이드컷", "쉐이빙", "면도", "남성"],
  "웨딩 헤어디자이너": ["wedding", "웨딩헤어", "본식", "혼주", "업스타일"],
  "헤어 스태프(시니어·주니어)": ["assistant", "스태프", "인턴", "샴푸", "와인딩", "리셉션"],
  "주말·단기 스페어": ["spare", "단기", "스페어", "알바", "파트타임", "일당"],

  // 메이크업
  "메이크업 아티스트": ["makeup", "make-up", "mua", "메이크업", "아티스트"],
  "프로필·방송 메이크업": ["editorial", "media", "방송", "프로필", "광고", "연예인", "룩북"],
  "특수분장사(SFX)": ["sfx", "특수분장", "분장", "special makeup"],
  "출장 프리랜서 아티스트": ["freelance", "출장", "프리랜서", "on-call"],
  "어시스턴트·스태프": ["assistant", "어시스턴트", "스태프", "인턴"],

  // 네일 & 속눈썹
  "네일 아티스트": ["nail", "네일", "젤", "네일아트", "파츠", "technician", "젤네일"],
  "문제성 네일 교정 전문가": ["pedicure", "내성발톱", "교정", "손발톱", "푸스플레게", "문제성"],
  "속눈썹·반영구 아티스트": ["eyelash", "속눈썹", "연장", "속눈썹펌", "반영구", "semi-permanent"],
  "네일 스태프·인턴": ["스태프", "인턴", "staff", "네일"],

  // 스킨 & 바디케어
  "피부관리사(일반·경락)": ["aesthetician", "피부관리사", "에스테틱", "에스테티션", "경락", "페이셜", "관리사"],
  "스파 테라피스트": ["spa", "therapist", "스파", "테라피", "호텔", "웰니스", "리조트"],
  "아로마 테라피스트": ["aroma", "아로마", "테라피", "마사지"],
  "바디·체형 관리사": ["body", "바디", "체형", "관리", "슬리밍"],
  "에스테틱 상담실장": ["상담", "실장", "세일즈", "consultant", "카운셀러"],

  // 두피 & 탈모
  "두피 관리사": ["scalp", "trichologist", "두피", "트리콜로지스트", "탈모", "두피관리"],
  "헤드스파 아티스트": ["head spa", "헤드스파", "아로마", "스파", "이어테라피"],
  "모발이식·탈모 메디컬 스태프": ["hair transplant", "모발이식", "메디컬", "탈모", "생착"],
  "두피·탈모 상담실장": ["상담", "실장", "카운셀러", "세일즈", "회원권"],

  // 웨딩 & 이벤트
  "웨딩플래너·총괄 디렉터": ["wedding planner", "웨딩플래너", "디렉터", "총괄"],
  "웨딩·혼주 메이크업": ["wedding makeup", "웨딩", "혼주", "본식", "롱래스팅"],
  "드레스샵 마스터·헬퍼": ["dress", "드레스", "헬퍼", "마스터", "드레스샵"],
  "이벤트 디렉터·공간 스타일리스트": ["event", "이벤트", "스타일리스트", "공간", "디렉터"],
  "웨딩 스냅·본식 포토그래퍼": ["photographer", "포토그래퍼", "스냅", "본식", "촬영"],
  "웨딩홀·행사장 안내 스태프": ["안내", "스태프", "행사", "웨딩홀"],

  // 뷰티 리테일(매장)
  "매장 점장·샵마스터": ["store manager", "점장", "샵마스터", "매니저", "직영"],
  "로드숍 매니저·부매니저": ["로드숍", "매니저", "부매니저"],
  "뷰티 어드바이저(BA)": ["beauty advisor", "ba", "백화점", "면세점", "카운터", "세일즈"],
  "H&B·로드숍 카운터 스태프": ["올리브영", "카운터", "캐셔", "pos", "clerk", "h&b", "로드숍"],
  "글로벌 세일즈(다국어)": ["global sales", "다국어", "명동", "면세점", "multilingual", "중국어", "영어"],
  "팝업·행사 매니저(단기)": ["popup", "팝업", "행사", "단기"],

  // 의료미용(현장)
  "상담실장·코디네이터": ["consultant", "coordinator", "상담실장", "코디네이터", "병원", "예약"],
  "레이저·피부 파트 스태프": ["laser", "레이저", "피부", "간호조무사", "필링", "압출"],
  "수술실 간호사·간호조무사": ["nurse", "간호사", "간호조무사", "수술실", "op"],
  "미용치과위생사": ["dental", "치과위생사", "미용치과", "코디네이터"],
  "모발이식 수술 스태프": ["hair transplant", "모발이식", "수술", "어시스트", "생착"],
  "병원 안내데스크·원무": ["원무", "리셉션", "안내데스크", "reception", "접수"],

  // 뷰티 플랫폼·콘텐츠 (본사)
  "뷰티 인플루언서·크리에이터": ["influencer", "인플루언서", "크리에이터", "creator", "유튜버", "공구", "바이럴"],
  "영상 PD·크리에이티브 디렉터": ["pd", "producer", "영상", "크리에이티브", "편집", "숏폼", "릴스", "틱톡"],
  "라이브커머스 호스트·쇼호스트": ["live commerce", "쇼호스트", "라이브", "방송", "host", "셀링"],
  "플랫폼 기획·개발": ["기획", "개발", "ui", "ux", "개발자", "pm", "po", "product manager"],

  // 뷰티 리테일·커머스(본사)
  "브랜드 매니저(BM)·상품기획": ["bm", "brand manager", "브랜드매니저", "상품기획", "기획"],
  "뷰티 MD(H&B·이커머스·글로벌)": ["md", "머천다이징", "이커머스", "유통", "h&b", "글로벌"],
  "영업 매니저(국내유통·면세·수출)": ["sales", "영업", "유통", "면세", "수출", "b2b"],
  "VMD·디스플레이 디자이너": ["vmd", "디스플레이", "비주얼", "디자이너", "visual merchandising"],

  // 뷰티 제조·OEM·ODM
  "화장품 연구원(R&D)": ["r&d", "연구원", "연구", "제형", "성분", "처방", "researcher"],
  "제조·생산관리(QA·QC)": ["qa", "qc", "생산관리", "품질", "제조", "quality"],
  "해외 유통·바이어 영업(수출)": ["수출", "바이어", "b2b", "무역", "글로벌영업", "export"],

  // 의료미용(본사·글로벌)
  "의료통역 스페셜리스트": ["의료통역", "통역", "의료관광", "interpretation", "외국인", "코디"],
  "해외 의료 마케터·바이어 영업": ["해외마케터", "의료마케팅", "바이어", "글로벌", "영업"],

  // HR 서비스·채용대행
  "뷰티 HR PM·잡매니저": ["hr", "pm", "잡매니저", "job manager", "노무", "근태"],
  "현장 파견·도급 관리소장": ["파견", "도급", "관리소장", "아웃소싱", "outsourcing"],
  "뷰티 전문 헤드헌터": ["헤드헌터", "headhunter", "서치펌", "채용", "search firm", "리크루터"],
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
