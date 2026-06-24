// 회원 표시용 공통 포맷 헬퍼 (지원자 관리·인재 검색·스크랩 인재 공통)

export function calcAge(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function genderLabel(g: string | null) {
  if (g === "MALE" || g === "남" || g === "남성" || g === "M") return "남";
  if (g === "FEMALE" || g === "여" || g === "여성" || g === "F") return "여";
  return null;
}

const SIDO_SHORT: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주", "제주도": "제주",
};

export function shortSido(s: string | null) {
  if (!s) return "";
  return SIDO_SHORT[s] || s;
}

// career_type: NEWCOMER(신입) / EXPERIENCED(경력) / null
export function careerLabel(careerType: string | null) {
  if (careerType === "NEWCOMER") return "신입";
  return null; // 경력은 calcCareerYears로 별도 계산
}

export function calcCareerYears(startDate: string | null): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (months < 12) return `${Math.max(months, 1)}개월`;
  const y = Math.floor(months / 12);
  return `${y}년`;
}

// 이름 열 하단의 "성별 · 나이세 · 경력" 한 줄 생성
export function buildMemberSubline(
  gender: string | null,
  birth: string | null,
  careerType: string | null,
  recentStartDate: string | null
): string {
  const parts: string[] = [];
  const g = genderLabel(gender);
  const age = calcAge(birth);
  if (g) parts.push(g);
  if (age != null) parts.push(`${age}세`);
  if (careerType === "NEWCOMER") {
    parts.push("신입");
  } else if (careerType === "EXPERIENCED") {
    const y = calcCareerYears(recentStartDate);
    parts.push(y ? `경력 ${y}` : "경력");
  }
  return parts.join(" · ");
}