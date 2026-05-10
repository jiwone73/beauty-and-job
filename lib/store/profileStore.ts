import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ===== 타입 정의 ===== */

export interface CareerEntry {
  id: string;
  company: string;
  department: string;
  position: string;
  startDate: string; // YYYY.MM
  endDate: string;   // YYYY.MM 또는 "재직 중"
  isVerified: boolean;
}

export interface EducationEntry {
  id: string;
  school: string;
  status: string;  // 졸업, 재학, 휴학, 중퇴
  startDate: string;
  endDate: string;
  major: string;
  description: string;
}

export interface ExperienceEntry {
  id: string;
  category: string; // 프로젝트, 수상, 자격증 등
  title: string;
  description: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  level: string; // 글로벌 커뮤니케이션 / 고급 비즈니스 / 비즈니스 / 기본
  test: string;  // 어학시험명 (선택)
}

export interface LinkEntry {
  id: string;
  category: string; // 인스타그램, 유튜브, 포트폴리오, 기타
  url: string;
}

export interface ProfileState {
  // 경력 인증
  isCareerVerified: boolean;
  verifiedDate: string;
  careers: CareerEntry[];

  // 대표 직무
  mainJobGroup: string;
  subJob: string;

  // 이력서 섹션 데이터
  educations: EducationEntry[];
  experiences: ExperienceEntry[];
  skills: string[];
  languages: LanguageEntry[];
  links: LinkEntry[];
  intro: string;
  coreCompetencies: string;
  email: string;

  // 액션
  setCareerVerified: (verified: boolean, date?: string) => void;
  addCareer: (entry: CareerEntry) => void;
  removeCareer: (id: string) => void;
  setMainJob: (group: string, sub: string) => void;
  addEducation: (entry: EducationEntry) => void;
  removeEducation: (id: string) => void;
  addExperience: (entry: ExperienceEntry) => void;
  removeExperience: (id: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  addLanguage: (entry: LanguageEntry) => void;
  removeLanguage: (id: string) => void;
  addLink: (entry: LinkEntry) => void;
  removeLink: (id: string) => void;
  setIntro: (intro: string) => void;
  setCoreCompetencies: (comp: string) => void;
  setEmail: (email: string) => void;
}

let counter = 0;
export function genId() {
  return `${Date.now()}-${++counter}`;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      isCareerVerified: false,
      verifiedDate: "",
      careers: [],
      mainJobGroup: "",
      subJob: "",
      educations: [],
      experiences: [],
      skills: [],
      languages: [],
      links: [],
      intro: "",
      coreCompetencies: "",
      email: "",

      setCareerVerified: (verified, date) =>
        set({ isCareerVerified: verified, verifiedDate: date || "" }),

      addCareer: (entry) =>
        set((s) => ({ careers: [...s.careers, entry] })),
      removeCareer: (id) =>
        set((s) => ({ careers: s.careers.filter((c) => c.id !== id) })),

      setMainJob: (group, sub) =>
        set({ mainJobGroup: group, subJob: sub }),

      addEducation: (entry) =>
        set((s) => ({ educations: [...s.educations, entry] })),
      removeEducation: (id) =>
        set((s) => ({ educations: s.educations.filter((e) => e.id !== id) })),

      addExperience: (entry) =>
        set((s) => ({ experiences: [...s.experiences, entry] })),
      removeExperience: (id) =>
        set((s) => ({ experiences: s.experiences.filter((e) => e.id !== id) })),

      addSkill: (skill) =>
        set((s) => ({
          skills: s.skills.includes(skill) ? s.skills : [...s.skills, skill],
        })),
      removeSkill: (skill) =>
        set((s) => ({ skills: s.skills.filter((sk) => sk !== skill) })),

      addLanguage: (entry) =>
        set((s) => ({ languages: [...s.languages, entry] })),
      removeLanguage: (id) =>
        set((s) => ({ languages: s.languages.filter((l) => l.id !== id) })),

      addLink: (entry) =>
        set((s) => ({ links: [...s.links, entry] })),
      removeLink: (id) =>
        set((s) => ({ links: s.links.filter((l) => l.id !== id) })),

      setIntro: (intro) => set({ intro }),
      setCoreCompetencies: (comp) => set({ coreCompetencies: comp }),
      setEmail: (email) => set({ email }),
    }),
    { name: "beautynjob-profile" }
  )
);
