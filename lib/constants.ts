export const JOB_OPTIONS = [
  "마케팅",
  "상품기획·개발",
  "영업",
  "디자인",
  "MD",
  "SCM·물류",
  "경영·전략",
  "품질관리",
  "CS·CX",
  "연구개발(RA)",
  "미디어",
  "직접입력",
] as const;

export const JOB_TYPE_OPTIONS = {
  "기업·사무직": [
    "마케팅",
    "MD·상품기획",
    "영업",
    "디자인",
    "연구개발",
    "SCM·물류",
    "경영지원",
    "HR",
    "CS·CX",
    "직접입력",
  ],
  "매장·기술직": [
    "네일 아티스트",
    "헤어 디자이너",
    "피부관리사",
    "메이크업 아티스트",
    "속눈썹·눈썹 아티스트",
    "왁싱 전문가",
    "반영구 아티스트",
    "샵 매니저",
    "뷰티 강사·교육",
    "직접입력",
  ],
} as const;

export const CATEGORY_OPTIONS = [
  "스킨케어",
  "색조",
  "헤어",
  "바디",
  "향수",
  "건기식",
  "디바이스",
  "맨즈케어",
  "카테고리 무관",
  "네일",
  "뷰티툴",
  "직접입력",
] as const;

export const COUNTRY_OPTIONS = [
  "국내",
  "북미",
  "일본",
  "중국",
  "동남아",
  "인도",
  "유럽",
  "중동",
  "제한 없음",
  "직접입력",
] as const;

export const GENDER_OPTIONS = ["남성", "여성"] as const;

export const CAREER_LABELS = [
  "신입",
  "1년",
  "2년",
  "3년",
  "4년",
  "5년",
  "6년",
  "7년",
  "8년",
  "9년",
  "10년",
  "10년 이상",
] as const;

export const DEMO_VERIFICATION_CODE = "123456";
export const VERIFICATION_TIMER_SECONDS = 180;

export const TOTAL_STEPS = 9;
