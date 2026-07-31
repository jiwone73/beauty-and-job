// lib/data/jobGroups.ts
// 직군 단일 출처 (source of truth)
// 프로필 / 공고등록 / 공고검색이 전부 이 파일만 import 해서 직군 값을 일치시킨다.

export type JobType = "OFFICE" | "STORE";

export interface JobGroup {
  group: string;    // 대분류 (모달 왼쪽 패널)
  items: string[];  // 소분류 (모달 오른쪽 = 실제 저장/선택 값)
}

// ───────────── 매장직 (STORE) ─────────────
export const STORE_JOB_GROUPS: JobGroup[] = [
  {
    group: "헤어",
    items: ["헤어 디자이너", "헤어 스태프·인턴", "바버(이용)", "두피·탈모 관리", "가발·증모", "원장", "실장·부원장", "프리랜서 헤어 디자이너", "헤어 컬러리스트", "신부·방송 헤어", "샴푸 어시스턴트"],
  },
  {
    group: "메이크업",
    items: ["메이크업 아티스트", "웨딩·방송 메이크업", "메이크업 강사", "뷰티 크리에이터·유튜버", "퍼스널컬러 컨설턴트", "특수분장 아티스트"],
  },
  {
    group: "네일",
    items: ["네일 아티스트", "젤·패디큐어 전문", "네일 스태프·인턴", "네일 원장·실장", "네일 강사"],
  },
  {
    group: "피부·에스테틱",
    items: ["피부관리사(에스테티션)", "바디·체형 관리", "스파·테라피", "두피·스칼프 케어", "피부관리 실장·원장", "아로마·경락 관리사", "발 관리사(풋케어)", "산후 관리사"],
  },
  {
    group: "속눈썹·왁싱·반영구",
    items: ["속눈썹 연장", "왁싱", "반영구 화장(눈썹·아이라인·입술)", "타투", "래쉬 아티스트·실장", "두피문신(SMP)", "왁싱 전문 관리사"],
  },
  {
    group: "애견미용",
    items: ["애견 미용사(그루머)", "애견 미용 스태프·인턴", "펫 스파·목욕", "펫 호텔·데이케어"],
  },
  {
    group: "매장 운영·판매",
    items: ["뷰티 어드바이저(BA)·화장품 판매", "샵 매니저·실장", "안내데스크·리셉션", "상담·코디네이터", "원장·교육강사", "뷰티 컨설턴트", "카운터·캐셔", "뷰티 MD(매장)", "점장", "슈퍼바이저(다점포 관리)"],
  },
];

// ───────────── 사무직 (OFFICE) ─────────────
export const OFFICE_JOB_GROUPS: JobGroup[] = [
  {
    group: "마케팅·브랜드",
    items: ["브랜드 마케팅", "퍼포먼스·디지털 마케팅", "콘텐츠·SNS·인플루언서", "홍보·PR", "브랜드 매니저(BM)", "그로스 마케터", "CRM·리텐션 마케터", "라이브커머스 기획", "제휴·프로모션 마케팅"],
  },
  {
    group: "MD·상품기획",
    items: ["상품기획", "MD(머천다이징)", "트렌드·시장조사", "온라인 MD", "카테고리 매니저", "신제품 개발 PM", "OEM/ODM 관리"],
  },
  {
    group: "영업·이커머스",
    items: ["국내영업(H&B·백화점·면세)", "온라인·이커머스 영업", "글로벌·수출 영업", "영업관리·VMD", "B2B·벤더 영업", "자사몰·오픈마켓 운영", "홈쇼핑 영업", "세일즈 오퍼레이션"],
  },
  {
    group: "연구개발·생산·품질",
    items: ["화장품 연구개발(처방·제형)", "생산관리·SCM", "품질관리(QC·QA)·인허가(RA)", "원료·향료 연구", "효능·임상 평가", "패키지·용기 개발", "구매·자재"],
  },
  {
    group: "디자인·콘텐츠",
    items: ["패키지·제품 디자인", "그래픽·웹 디자인", "영상·콘텐츠 제작", "UI/UX·상세페이지 디자인", "브랜드·BI/CI 디자인", "콘텐츠 에디터·카피라이터"],
  },
  {
    group: "경영지원",
    items: ["인사·총무", "재무·회계·법무", "경영기획·전략", "IT·개발", "고객상담·CS·교육", "인사(HR)·채용", "데이터 분석", "서비스 기획·PM/PO", "교육·아카데미 강사", "사업개발(BD)"],
  },
];

// ───────────── 헬퍼 ─────────────

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