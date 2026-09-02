/**
 * 이력서를 어디까지 채웠나.
 *
 * 이력서 화면의 왼쪽 완성도 막대와 공고 상세의 지원 카드가 같은 숫자를
 * 보여야 한다. 두 곳이 각자 세면 한 화면에서는 86%, 다른 화면에서는 71%가
 * 되고, 어느 쪽이 사실인지 알 수 없어진다. 규칙은 여기 한 곳에 둔다.
 */
export type 진행칸 = { id: string; label: string; done: boolean };

export type 진행입력 = {
  /** 매장(살롱) 이력서냐. 본사는 학력·어학을 반드시 본다. */
  살롱: boolean;
  isEntryLevel: boolean;
  careers: { company?: string | null; startDate?: string | null }[];
  educations: { school?: string | null }[];
  certificates: { name?: string | null }[];
  experiences: { title?: string | null }[];
  languages: { language?: string | null; level?: string | null }[];
  skills: string[];
  portfolioImages: unknown[];
  links: { url?: string | null }[];
};

export function 이력서진행(입력: 진행입력): { 칸: 진행칸[]; 비율: number } {
  const 있음 = (v?: string | null) => !!String(v ?? "").trim();
  // 더하기만 누르고 비워 둔 줄은 채운 것으로 세지 않는다. 길이만 보면 빈 줄
  // 하나에 그 칸이 완료로 잡혀, 정작 아무것도 안 적혔는데 100%가 된다.
  const 채운경력 = 입력.careers.some((c) => 있음(c.company) || 있음(c.startDate)) || 입력.isEntryLevel;
  const 채운학력 = 입력.educations.some((e) => 있음(e.school));
  const 채운자격 = 입력.certificates.some((c) => 있음(c.name));
  const 채운활동 = 입력.experiences.some((x) => 있음(x.title));
  const 채운어학 = 입력.languages.some((l) => 있음(l.language) && 있음(l.level));
  // 포트폴리오는 링크와 파일을 한 칸으로 본다. 인스타만 걸어 둔 사람도, PDF 만
  // 가진 사람도 "작업물을 보여줬다"는 점에서는 같다.
  const 포트폴리오채움 = 입력.portfolioImages.length > 0 || 입력.links.some((l) => 있음(l.url));
  // 매장 이력서에서 학력·활동수상·어학은 뒤로 접어 두는 칸이다. 살롱은 이 셋을
  // 거의 보지 않는데, 비었다고 완성도를 깎으면 아무리 채워도 100%가 안 된다.
  // 자격증은 뺄 수 없다 — 미용사 면허가 곧 자격이라 이 업계에서는 본다.
  const 접는칸 = 입력.살롱;
  const 칸: 진행칸[] = [
    { id: "basic", label: "기본 정보", done: true },
    { id: "career", label: "경력", done: 채운경력 },
    ...(접는칸 && !채운학력 ? [] : [{ id: "education", label: "학력", done: 채운학력 }]),
    { id: "skill", label: "스킬", done: 입력.skills.length > 0 },
    { id: "certificate", label: "자격증", done: 채운자격 },
    ...(접는칸 && !채운활동 ? [] : [{ id: "experience", label: "활동/수상", done: 채운활동 }]),
    ...(접는칸 && !채운어학 ? [] : [{ id: "language", label: "어학", done: 채운어학 }]),
    { id: "portfolio", label: "포트폴리오", done: 포트폴리오채움 },
  ];
  return { 칸, 비율: Math.round((칸.filter((s) => s.done).length / 칸.length) * 100) };
}
