/**
 * 지원할 수 있는 상태인가.
 *
 * 서버가 지원을 막는 조건과, 공고 화면이 미리 알려 주는 조건은 같은 것이어야
 * 한다. 두 곳이 각자 판단하면 「지원 가능」이라 적어 놓고 버튼을 누르면
 * 튕기는 일이 생긴다. 규칙은 여기 한 곳에 둔다.
 */
export type 지원사람 = {
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  email?: string | null;
  region_sido?: string | null;
  preferred_regions?: unknown;
  job_type?: string | null;
  // 희망급여(원). 0은 「협의」다 — 금액을 안 적었을 뿐 정한 것이라 채운 것으로 본다.
  // 아직 안 정했으면 null 이다.
  salary_min?: number | string | null;
};

/** 프로필에서 못 채운 것들. 이력서 유무는 따로 본다(고치러 갈 자리가 다르다). */
export function 프로필못채움(p: 지원사람): string[] {
  const 빈것: string[] = [];
  if (!p.phone) 빈것.push("휴대전화");
  if (!p.birth_date) 빈것.push("생년월일");
  if (!p.gender) 빈것.push("성별");
  if (!p.email) 빈것.push("이메일");
  if (!p.region_sido) 빈것.push("거주지");
  if (!Array.isArray(p.preferred_regions) || p.preferred_regions.length === 0) 빈것.push("희망 근무지역");
  if (!p.job_type) 빈것.push("직군");
  // 매장이 제안할 때 가장 먼저 맞춰 보는 값이다. 0(협의)은 정한 것이니 통과한다.
  if (p.salary_min === null || p.salary_min === undefined) 빈것.push("희망급여");
  return 빈것;
}
