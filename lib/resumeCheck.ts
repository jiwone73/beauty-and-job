/**
 * 이력서에서 아직 못 채운 곳을 찾는다.
 *
 * 알림창은 무엇이 비었는지 말해 주고 사라진다. 창을 닫으면 다시 찾아
 * 헤매야 하고, 칸이 아홉이면 어디였는지 잊는다. 그래서 결과를 그 칸 위에
 * 붙일 수 있게 자리와 함께 돌려준다.
 */
import type { CareerEntry, EducationEntry, ExperienceEntry, LanguageEntry } from "@/lib/store/profileStore";

export type 흠 = { 어디: string; 누구?: string; 말: string };

export function 이력서흠찾기(입력: {
  본사냐: boolean;
  intro: string;
  isEntryLevel: boolean;
  careers: CareerEntry[];
  educations: EducationEntry[];
  languages: LanguageEntry[];
  experiences?: ExperienceEntry[];
  skills: string[];
}): 흠[] {
  const { 본사냐, intro, isEntryLevel, careers, educations, languages, skills, experiences = [] } = 입력;
  const 흠들: 흠[] = [];
  const 빔 = (v?: string) => !String(v ?? "").trim();

  if (빔(intro)) 흠들.push({ 어디: "headline", 말: "한 줄 소개가 비었어요." });

  // ── 경력 ── 신입이면 경력 대신 신입 경험을 본다.
  if (!isEntryLevel) {
    if (careers.length === 0) 흠들.push({ 어디: "career", 말: "경력을 넣거나 '신입'을 골라 주세요." });
    careers.forEach((c) => {
      // 매장명은 필수다(별표를 붙였다). 지금 다니는 곳이 드러나는 것이 걱정이면
      // 이름을 적고 「비공개」를 켠다 — 미리보기·인재검색에는 ○○○ 으로 나간다.
      if (빔(c.company)) 흠들.push({ 어디: "career", 누구: c.id, 말: 본사냐 ? "회사명을 적어 주세요." : "매장명을 적어 주세요." });
      if (빔(c.startDate)) 흠들.push({ 어디: "career", 누구: c.id, 말: "근무 기간을 골라 주세요." });
      if (본사냐 && 빔(c.department)) 흠들.push({ 어디: "career", 누구: c.id, 말: "근무 형태를 골라 주세요." });
      // 본사는 「맡은 일 I 직책」으로 담는다 — 앞쪽 맡은 일이 비면 무엇을 했는지 알 수 없다.
      if (본사냐 && 빔(String(c.position ?? "").split(" I ")[0])) 흠들.push({ 어디: "career", 누구: c.id, 말: "맡은 일을 적어 주세요." });
      // 주요 성과는 필수가 아니다(별표도 뺐다) — 안 적었다고 작성 완료를 막지 않는다.
    });
  }

  // ── 학력 ── 학력 구분·학교명·졸업 상태는 매장도 필수다. 전공만 본사에서 묻는다(고졸에게는 적을 것이 없다).
  if (educations.length === 0) 흠들.push({ 어디: "education", 말: "학력을 넣어 주세요." });
  educations.forEach((e) => {
    if (빔(e.level)) 흠들.push({ 어디: "education", 누구: e.id, 말: "학력 구분을 골라 주세요." });
    if (빔(e.school)) 흠들.push({ 어디: "education", 누구: e.id, 말: "학교명이 비었어요." });
    // 매장은 학력 구분·학교명·졸업 상태가 필수다. 기간·전공은 선택이고, 전공은 본사에서만 필수다.
    if (빔(e.status)) 흠들.push({ 어디: "education", 누구: e.id, 말: "졸업 상태를 골라 주세요." });
    if (본사냐 && 빔(e.major)) 흠들.push({ 어디: "education", 누구: e.id, 말: "전공 · 학위가 비었어요." });
  });

  // ── 교육·수료 ── 칸 자체는 선택이다. 하나를 넣었으면 교육기관명과 과정명은 적어야 한다(기간·수료 여부는 선택).
  experiences.filter((x) => x.category === "교육").forEach((x) => {
    if (빔(x.title)) 흠들.push({ 어디: "training", 누구: x.id, 말: "교육기관명을 적어 주세요." });
    if (빔(x.description)) 흠들.push({ 어디: "training", 누구: x.id, 말: "과정명을 적어 주세요." });
  });

  // ── 스킬·어학 ── 둘 다 선택이다(스킬은 매장에서도 선택으로 바꿨다).
  // 어학은 선택이다. 애견미용·미용 강사처럼 언어를 물을 일이 없는 자리가
  // 매장직에 들어오면서, 필수로 두면 그 사람들은 영영 100%가 안 된다.
  languages.forEach((l) => {
    if (빔(l.language)) 흠들.push({ 어디: "language", 누구: l.id, 말: "언어를 골라 주세요." });
    if (빔(l.level)) 흠들.push({ 어디: "language", 누구: l.id, 말: "수준을 골라 주세요." });
  });

  return 흠들;
}
