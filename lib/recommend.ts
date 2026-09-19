// 공고 추천 점수.
//
// 규칙으로 매긴다. 조건이 분명한 일(직군·지역·연차)에는 규칙이 더 정확하고,
// 무엇보다 "왜 이게 떴는지"를 그대로 말해 줄 수 있다. 지어낸 이유를 붙이면
// 한 번 틀렸을 때 다음부터 아무도 안 믿는다.
//
// 100점을 채우는 방식이 아니라, 맞는 만큼 더한다. 그래서 총점이 낮으면
// "맞는 게 별로 없다"는 뜻이고, 그때는 추천이라 부르지 않는다(RECOMMEND_MIN).
import { getGroupOfItem, type JobType } from "@/lib/data/jobGroups";

/** 이 점수에 못 미치면 '추천'이라 부르지 않는다 — 억지로 붙인 추천은 첫인상을 버린다. */
export const RECOMMEND_MIN = 40;

export type 구직자 = {
  jobType: JobType;
  /** 이력서에 적은 직군 */
  areas: string[];
  /** 희망 근무지역 [{sido, sigungu}] — 없으면 거주지로 물러선다 */
  regions: { sido?: string; sigungu?: string }[];
  /** 경력 총 개월. 신입이면 0 */
  months: number;
  isEntry: boolean;
  /** 희망 고용형태 */
  workType?: string;
  /** 스크랩한 공고들의 직군·기업 (행동 신호) */
  scrappedAreas?: string[];
  scrappedCompanyIds?: string[];
  /** 이미 지원한 공고 — 추천에서 뺀다 */
  appliedJobIds?: string[];
};

export type 공고 = {
  id: string;
  companyId?: string | null;
  categories: string[] | null;
  location: string | null;
  employmentType: string | null;
  /** positions[].career 를 모은 것 — "신입" | "3년 이상" | "경력 무관" 등 */
  careers: string[];
  createdAt: string | Date | null;
};

export type 결과 = { id: string; score: number; reasons: string[] };

/** 경력 총 개월. 이력서의 날짜는 「2021-08」 꼴이다(일이 없다).
 *  구직자 쪽 추천과 기업 쪽 추천이 같은 값을 봐야 한다 — 한쪽만 고치면
 *  같은 사람의 경력이 보는 쪽에 따라 달라진다. */
export function 총개월(rows: { start_date?: string | null; end_date?: string | null }[]): number {
  let m = 0;
  for (const r of rows || []) {
    const s = new Date(String(r.start_date || "") + "-01");
    const e = r.end_date ? new Date(String(r.end_date) + "-01") : new Date();
    if (isNaN(+s) || isNaN(+e)) continue;
    const d = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (d > 0) m += d;
  }
  return m;
}

// "3년 이상" → 36. "신입" → 0. "경력 무관" → null(아무나).
function 요구개월(s: string): number | null {
  const t = String(s || "").trim();
  if (!t || /무관/.test(t)) return null;
  if (/신입/.test(t)) return 0;
  const m = t.match(/(\d+)\s*년/);
  return m ? Number(m[1]) * 12 : null;
}

// "서울특별시 강남구" → {sido:"서울", sigungu:"강남구"}
function 쪼개기(loc: string | null) {
  const t = String(loc || "").trim();
  if (!t) return { sido: "", sigungu: "" };
  const [a, ...rest] = t.split(/\s+/);
  return { sido: a.slice(0, 2), sigungu: rest[rest.length - 1] || "" };
}

export function 점수매기기(u: 구직자, j: 공고): 결과 {
  let score = 0;
  const reasons: string[] = [];
  const cats = Array.isArray(j.categories) ? j.categories : [];

  // ── 직군 ──────────────────────────────────────────
  const 정확 = cats.some((c) => u.areas.includes(c));
  if (정확) {
    score += 40;
    reasons.push("내 직군");
  } else if (cats.length && u.areas.length) {
    // 같은 그룹이면 옮겨갈 만한 자리다(헤어 디자이너 ↔ 헤어스탭).
    const 내그룹 = new Set(u.areas.map((a) => getGroupOfItem(u.jobType, a)).filter(Boolean));
    if (cats.some((c) => 내그룹.has(getGroupOfItem(u.jobType, c)))) {
      score += 20;
      reasons.push("비슷한 직군");
    }
  }

  // 이력서에 안 적었어도 스크랩으로 드러난 관심은 센다.
  // 말한 것보다 한 것이 정확하다.
  if (!정확 && u.scrappedAreas?.length && cats.some((c) => u.scrappedAreas!.includes(c))) {
    score += 12;
    reasons.push("자주 본 직군");
  }

  // ── 지역 ──────────────────────────────────────────
  const { sido, sigungu } = 쪼개기(j.location);
  if (sido) {
    const 시군구맞음 = u.regions.some((r) => r.sigungu && sigungu && r.sigungu === sigungu);
    const 시도맞음 = u.regions.some((r) => (r.sido || "").slice(0, 2) === sido);
    if (시군구맞음) { score += 25; reasons.push("희망 지역"); }
    else if (시도맞음) { score += 12; reasons.push("가까운 지역"); }
  }

  // ── 경력 ──────────────────────────────────────────
  // 공고가 여러 자리를 뽑으면 그중 가장 잘 맞는 자리로 친다.
  if (j.careers.length) {
    const 내개월 = u.isEntry ? 0 : u.months;
    let 최고 = 0;
    for (const c of j.careers) {
      const 요구 = 요구개월(c);
      let s = 0;
      if (요구 === null) s = 14;                       // 경력 무관
      else if (요구 === 0) s = 내개월 <= 12 ? 20 : 2;  // 신입 자리
      else if (내개월 >= 요구) s = 내개월 - 요구 <= 24 ? 20 : 12;  // 넘치면 조금 깎는다
      else s = 요구 - 내개월 <= 12 ? 10 : 0;           // 1년쯤 모자란 건 넣어볼 만하다
      if (s > 최고) 최고 = s;
    }
    score += 최고;
    if (최고 >= 20) reasons.push(u.isEntry ? "신입 환영" : "내 경력에 맞음");
  }

  // ── 고용형태 ───────────────────────────────────────
  if (u.workType && j.employmentType && u.workType === j.employmentType) {
    score += 8;
    reasons.push(j.employmentType);
  }

  // ── 신선도 ─────────────────────────────────────────
  if (j.createdAt) {
    const 일 = Math.floor((Date.now() - new Date(j.createdAt).getTime()) / 86400000);
    if (Number.isFinite(일) && 일 >= 0) {
      if (일 <= 3) { score += 7; reasons.push("방금 올라옴"); }
      else if (일 <= 14) score += 4;
      else if (일 <= 30) score += 2;
    }
  }

  // ── 행동 신호 ──────────────────────────────────────
  if (j.companyId && u.scrappedCompanyIds?.includes(j.companyId)) {
    score += 15;
    reasons.push("스크랩한 매장");
  }

  // 이유는 셋까지만 — 넉 줄이 되면 읽지 않는다.
  return { id: j.id, score, reasons: reasons.slice(0, 3) };
}

/** 지원한 것은 빼고, 점수 높은 순으로 고른다. 동점이면 최신순. */
export function 고르기(u: 구직자, 공고들: 공고[], limit = 4): 결과[] {
  const 지원함 = new Set(u.appliedJobIds || []);
  return 공고들
    .filter((j) => !지원함.has(j.id))
    .map((j) => ({ ...점수매기기(u, j), createdAt: j.createdAt }))
    .sort((a: any, b: any) =>
      b.score - a.score ||
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit)
    .map(({ id, score, reasons }) => ({ id, score, reasons }));
}

/* ═══════════════════════════════════════════════════════════════
   반대 방향 — 공고를 기준으로 사람을 고른다 (프리미엄 「빠른 인재 추천」)

   위의 것은 구직자에게 공고를 골라 준다. 여기는 기업에게 이력서를 골라
   준다. 재는 것은 같다 — 직군·지역·경력·고용형태가 맞는 만큼 더한다.
   점수 배분도 같이 둔다. 한쪽만 손보면 같은 「맞음」이 보는 쪽에 따라
   다른 무게가 되고, 왜 그런지 아무도 설명하지 못하게 된다.
   ═══════════════════════════════════════════════════════════════ */

export type 인재 = {
  id: string;
  /** 이력서에 적은 직군 — 대분류·소분류를 함께 담는다 */
  areas: string[];
  jobType: JobType;
  /** 희망 근무지역. 없으면 사는 곳으로 물러선다 */
  regions: { sido?: string; sigungu?: string }[];
  /** 경력 총 개월. 신입이면 0 */
  months: number;
  isEntry: boolean;
  workType?: string;
  /** 이력서를 마지막으로 손본 때 */
  updatedAt?: string | Date | null;
};

/** 공고 하나에 이 사람이 얼마나 맞는가. */
export function 인재점수매기기(j: 공고, t: 인재): 결과 {
  let score = 0;
  const reasons: string[] = [];
  const cats = Array.isArray(j.categories) ? j.categories : [];

  // ── 직군 ──────────────────────────────────────────
  // 여기가 0 이면 추천하지 않는다(아래 인재고르기). 구직자 쪽은 지역만 맞아도
  // 「가까운 데 이런 자리가 있다」가 되지만, 기업 쪽은 다르다 — 헤어 디자이너를
  // 뽑는 자리에 직군을 안 적은 사람을 올려 두면 「왜 이 사람이?」가 된다.
  const 정확 = cats.some((c) => t.areas.includes(c));
  let 직군점수 = 0;
  if (정확) {
    직군점수 = 40;
    reasons.push("공고 직군");
  } else if (cats.length && t.areas.length) {
    const 그룹 = new Set(t.areas.map((a) => getGroupOfItem(t.jobType, a)).filter(Boolean));
    if (cats.some((c) => 그룹.has(getGroupOfItem(t.jobType, c)))) {
      직군점수 = 20;
      reasons.push("비슷한 직군");
    }
  }
  score += 직군점수;

  // ── 지역 ──────────────────────────────────────────
  const { sido, sigungu } = 쪼개기(j.location);
  if (sido) {
    const 시군구맞음 = t.regions.some((r) => r.sigungu && sigungu && r.sigungu === sigungu);
    const 시도맞음 = t.regions.some((r) => (r.sido || "").slice(0, 2) === sido);
    if (시군구맞음) { score += 25; reasons.push("희망 지역"); }
    else if (시도맞음) { score += 12; reasons.push("같은 시·도"); }
  }

  // ── 경력 ──────────────────────────────────────────
  if (j.careers.length) {
    const 개월 = t.isEntry ? 0 : t.months;
    let 최고 = 0;
    for (const c of j.careers) {
      const 요구 = 요구개월(c);
      let s = 0;
      if (요구 === null) s = 14;
      else if (요구 === 0) s = 개월 <= 12 ? 20 : 2;
      else if (개월 >= 요구) s = 개월 - 요구 <= 24 ? 20 : 12;
      else s = 요구 - 개월 <= 12 ? 10 : 0;
      if (s > 최고) 최고 = s;
    }
    score += 최고;
    // 경력이 1년이 안 되면 「경력 0년」이 아니라 신입이다.
    if (최고 >= 20) reasons.push(개월 < 12 ? "신입" : `경력 ${Math.floor(개월 / 12)}년`);
  }

  // ── 고용형태 ───────────────────────────────────────
  if (t.workType && j.employmentType && t.workType === j.employmentType) {
    score += 8;
    reasons.push(j.employmentType);
  }

  // ── 이력서를 언제 손봤나 ────────────────────────────
  // 공고의 「방금 올라옴」에 해당한다. 반년 넘게 손대지 않은 이력서는 지금
  // 찾고 있는 사람이 아닐 때가 많다 — 빼지는 않고 뒤로 민다.
  if (t.updatedAt) {
    const 일 = Math.floor((Date.now() - new Date(t.updatedAt).getTime()) / 86400000);
    if (Number.isFinite(일) && 일 >= 0) {
      if (일 <= 7) { score += 7; reasons.push("이력서 새로 고침"); }
      else if (일 <= 30) score += 4;
      else if (일 <= 90) score += 2;
    }
  }

  // 직군이 하나도 안 맞으면 점수를 내지 않는다 — 부르는 쪽이 이 값 하나만 보면 된다.
  return { id: t.id, score: 직군점수 === 0 ? 0 : score, reasons: reasons.slice(0, 3) };
}

/** 이미 제안한 사람은 빼고, 점수 높은 순으로 고른다.
 *  40점(RECOMMEND_MIN)에 못 미치면 세우지 않는다 — 억지로 채운 추천은
 *  한 번 빗나가면 다음부터 아무도 안 본다. */
export function 인재고르기(j: 공고, 인재들: 인재[], 제안함: string[] = [], limit = 20): 결과[] {
  const 뺄것 = new Set(제안함);
  return 인재들
    .filter((t) => !뺄것.has(t.id))
    .map((t) => 인재점수매기기(j, t))
    .filter((r) => r.score >= RECOMMEND_MIN)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
