/**
 * 이력서에서 아직 못 채운 곳을 찾는다.
 *
 * 알림창은 무엇이 비었는지 말해 주고 사라진다. 창을 닫으면 다시 찾아
 * 헤매야 하고, 칸이 아홉이면 어디였는지 잊는다. 그래서 결과를 그 칸 위에
 * 붙일 수 있게 자리와 함께 돌려준다.
 */
import type { CareerEntry, EducationEntry, LanguageEntry } from "@/lib/store/profileStore";

export type 흠 = { 어디: string; 누구?: string; 말: string };

export function 이력서흠찾기(입력: {
  본사냐: boolean;
  intro: string;
  isEntryLevel: boolean;
  careers: CareerEntry[];
  educations: EducationEntry[];
  languages: LanguageEntry[];
  skills: string[];
}): 흠[] {
  const { 본사냐, intro, isEntryLevel, careers, educations, languages, skills } = 입력;
  const 흠들: 흠[] = [];
  const 빔 = (v?: string) => !String(v ?? "").trim();

  if (빔(intro)) 흠들.push({ 어디: "headline", 말: "한 줄 소개가 비었어요." });

  // ── 경력 ── 신입이면 경력 대신 신입 경험을 본다.
  if (!isEntryLevel) {
    if (careers.length === 0) 흠들.push({ 어디: "career", 말: "경력을 넣거나 '신입'을 골라 주세요." });
    careers.forEach((c) => {
      if (빔(c.company)) 흠들.push({ 어디: "career", 누구: c.id, 말: 본사냐 ? "회사명이 비었어요." : "매장명이 비었어요." });
      if (빔(c.startDate)) 흠들.push({ 어디: "career", 누구: c.id, 말: "근무 기간을 골라 주세요." });
      if (본사냐 && 빔(c.department)) 흠들.push({ 어디: "career", 누구: c.id, 말: "근무 형태를 골라 주세요." });
      if (본사냐 && 빔(c.description)) 흠들.push({ 어디: "career", 누구: c.id, 말: "주요 성과를 한 줄이라도 적어 주세요." });
    });
  }

  // ── 학력 ── 본사만 필수. 살롱은 학교를 묻지 않는다.
  if (본사냐 && educations.length === 0) 흠들.push({ 어디: "education", 말: "학력을 넣어 주세요." });
  educations.forEach((e) => {
    if (빔(e.school)) 흠들.push({ 어디: "education", 누구: e.id, 말: "학교명이 비었어요." });
    if (빔(e.status)) 흠들.push({ 어디: "education", 누구: e.id, 말: "졸업 상태를 골라 주세요." });
    if (본사냐 && 빔(e.major)) 흠들.push({ 어디: "education", 누구: e.id, 말: "전공 · 학위가 비었어요." });
  });

  // ── 스킬·어학 ── 살롱만 필수. 어떤 시술을 하고 손님 응대가 되느냐가 채용 조건이다.
  if (!본사냐 && skills.length === 0) 흠들.push({ 어디: "skill", 말: "할 수 있는 시술을 넣어 주세요." });
  if (!본사냐 && languages.length === 0) 흠들.push({ 어디: "language", 말: "쓸 수 있는 언어를 넣어 주세요." });
  languages.forEach((l) => {
    if (빔(l.language)) 흠들.push({ 어디: "language", 누구: l.id, 말: "언어를 골라 주세요." });
    if (빔(l.level)) 흠들.push({ 어디: "language", 누구: l.id, 말: "수준을 골라 주세요." });
  });

  return 흠들;
}
