/**
 * 기업 유료 상품 한 벌.
 *
 * 값을 화면마다 적어 두면 가격을 고칠 때 몇 군데는 반드시 남는다. 요금제
 * 카드·상세·주문·관리자·서버 검사가 모두 여기를 본다.
 */

export type PlanId = "LIGHT" | "STANDARD" | "PREMIUM";

export const 기간들 = [7, 15, 30, 45, 60] as const;
export type 기간 = (typeof 기간들)[number];

type 플랜정의 = {
  name: string;
  한줄: string;
  가격: Record<기간, number>;
  /** 인재 이름·연락처·자소서를 볼 수 있는가. 제안도 같은 문이다. */
  인재열람: boolean;
  /** 검색·목록에서 어디에 서는가. 큰 값이 위. */
  노출순위: number;
  /** 메인 채용관에 걸리는가 */
  메인: "PREMIUM" | "STANDARD" | null;
  /** 카드에 적는 것 — 세 줄까지. 나머지는 자세히 보기로 보낸다. */
  요약: string[];
  /** 이 플랜이 아래 플랜의 혜택을 그대로 품는다는 한 줄 */
  포함: string;
};

export const 플랜: Record<PlanId, 플랜정의> = {
  LIGHT: {
    name: "라이트",
    한줄: "공고를 기간 내내 걸어 둡니다",
    가격: { 7: 19000, 15: 29000, 30: 49000, 45: 69000, 60: 89000 },
    인재열람: false,
    노출순위: 0,
    메인: null,
    요약: ["공고 등록 무제한", "게재 기간 제한 없음"],
    포함: "베이직 혜택 포함",
  },
  STANDARD: {
    name: "스탠다드",
    한줄: "인재를 직접 보고 제안할 수 있습니다",
    가격: { 7: 35000, 15: 55000, 30: 89000, 45: 129000, 60: 165000 },
    인재열람: true,
    노출순위: 1,
    메인: "STANDARD",
    요약: ["인재 연락처 열람", "검색 상단 · 메인 노출", "제안 무제한"],
    포함: "라이트 혜택 포함",
  },
  PREMIUM: {
    name: "프리미엄",
    한줄: "가장 먼저, 가장 크게 보이는 자리입니다",
    가격: { 7: 59000, 15: 95000, 30: 149000, 45: 219000, 60: 279000 },
    인재열람: true,
    노출순위: 2,
    메인: "PREMIUM",
    요약: ["검색 결과 최상단", "메인 프리미엄관 노출"],
    포함: "스탠다드 혜택 포함",
  },
};

/** 무료. 플랜 표에는 들어가지만 살 수 있는 물건이 아니라 따로 둔다. */
export const 베이직 = {
  name: "베이직",
  한줄: "공고를 올리고 지원자를 받습니다",
  /** 무료로 걸 수 있는 진행 중 공고 수 */
  공고수: 5,
  /** 무료 공고가 목록에 남는 날수 */
  게재일: 7,
  요약: ["공고 등록 5건", "지원자 이력서 열람", "검색 결과 노출"],
};

/** 메인 채용관 칸 수. 화살표 없이 이 칸만 두고 차례로 바꾼다. */
export const 메인칸 = { PREMIUM: 4, STANDARD: 5 } as const;
/** 메인 채용관이 다음 차례로 넘어가는 간격(밀리초) */
export const 메인롤링 = 5000;

/** 제안 상한이 아니라 사고를 막는 선. 하루 이만큼이 넘으면 사람이 보내는 양이 아니다. */
export const 제안남용선 = 200;

export function 값(plan: PlanId, days: 기간): number {
  return 플랜[plan].가격[days];
}

export function 원(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

export function 플랜인가(v: unknown): v is PlanId {
  return v === "LIGHT" || v === "STANDARD" || v === "PREMIUM";
}

export function 기간인가(v: unknown): v is 기간 {
  return 기간들.includes(v as 기간);
}

/** 등급 높낮이. 이용 중에 더 낮은 등급을 새로 살 수 없다. */
export function 등급높이(plan: PlanId | null): number {
  if (!plan) return 0;
  return { LIGHT: 1, STANDARD: 2, PREMIUM: 3 }[plan];
}
