import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSignupStore } from "./signupStore";

/* ===== 타입 정의 ===== */
export interface CareerEntry {
  id: string;
  company: string;
  department: string;
  position: string;
  startDate: string;
  endDate: string;
  isVerified: boolean;
}
export interface EducationEntry {
  id: string;
  school: string;
  status: string;
  startDate: string;
  endDate: string;
  major: string;
  description: string;
}
export interface ExperienceEntry {
  id: string;
  category: string;
  title: string;
  description: string;
}
export interface LanguageEntry {
  id: string;
  language: string;
  level: string;
  test: string;
}
export interface LinkEntry {
  id: string;
  category: string;
  url: string;
}

export interface CertificateEntry {
  id: string;
  name: string;
  issuer: string;
  issued_ym: string;
}

export interface ProfileState {
  isCareerVerified: boolean;
  verifiedDate: string;
  careers: CareerEntry[];
  educations: EducationEntry[];
  experiences: ExperienceEntry[];
  skills: string[];
  languages: LanguageEntry[];
  links: LinkEntry[];
  certificates: CertificateEntry[];
  intro: string;
  coreCompetencies: string;
  email: string;
  loaded: boolean;

  // 액션
  setCareerVerified: (verified: boolean, date?: string) => void;
  addCareer: (entry: CareerEntry) => void;
  removeCareer: (id: string) => void;
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
  addCertificate: (entry: CertificateEntry) => void;
  removeCertificate: (id: string) => void;
  setIntro: (intro: string) => void;
  setCoreCompetencies: (comp: string) => void;
  setEmail: (email: string) => void;
  reset: () => void;

  // 새 액션: DB 동기화
  loadFromServer: () => Promise<void>;
  syncToDb: () => Promise<void>;
}

let counter = 0;
export function genId(): string {
  return `${Date.now()}-${++counter}`;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => {
      // 헬퍼: 액션 후 자동 DB 동기화
      const autoSync = () => {
        setTimeout(() => get().syncToDb(), 100);
      };

      return {
        isCareerVerified: false,
        verifiedDate: "",
        careers: [],
        educations: [],
        experiences: [],
        skills: [],
        languages: [],
        links: [],
        certificates: [],
        intro: "",
        coreCompetencies: "",
        email: "",
        loaded: false,

        reset: () => set({
          isCareerVerified: false,
          verifiedDate: "",
          careers: [],
          educations: [],
          experiences: [],
          skills: [],
          languages: [],
          links: [],
          certificates: [],
          intro: "",
          coreCompetencies: "",
          email: "",
          loaded: false,
        }),

        setCareerVerified: (verified, date) => {
          set({ isCareerVerified: verified, verifiedDate: date || "" });
          autoSync();
        },
        addCareer: (entry) => {
          set((s) => ({ careers: [...s.careers, entry] }));
          autoSync();
        },
        removeCareer: (id) => {
          set((s) => ({ careers: s.careers.filter((c) => c.id !== id) }));
          autoSync();
        },
        addEducation: (entry) => {
          set((s) => ({ educations: [...s.educations, entry] }));
          autoSync();
        },
        removeEducation: (id) => {
          set((s) => ({ educations: s.educations.filter((e) => e.id !== id) }));
          autoSync();
        },
        addExperience: (entry) => {
          set((s) => ({ experiences: [...s.experiences, entry] }));
          autoSync();
        },
        removeExperience: (id) => {
          set((s) => ({ experiences: s.experiences.filter((e) => e.id !== id) }));
          autoSync();
        },
        addSkill: (skill) => {
          set((s) => ({
            skills: s.skills.includes(skill) ? s.skills : [...s.skills, skill],
          }));
          autoSync();
        },
        removeSkill: (skill) => {
          set((s) => ({ skills: s.skills.filter((sk) => sk !== skill) }));
          autoSync();
        },
        addLanguage: (entry) => {
          set((s) => ({ languages: [...s.languages, entry] }));
          autoSync();
        },
        removeLanguage: (id) => {
          set((s) => ({ languages: s.languages.filter((l) => l.id !== id) }));
          autoSync();
        },
        addLink: (entry) => {
          set((s) => ({ links: [...s.links, entry] }));
          autoSync();
        },
        removeLink: (id) => {
          set((s) => ({ links: s.links.filter((l) => l.id !== id) }));
          autoSync();
        },
        addCertificate: (entry) => {
          set((s) => ({ certificates: [...s.certificates, entry] }));
          autoSync();
        },
        removeCertificate: (id) => {
          set((s) => ({ certificates: s.certificates.filter((c) => c.id !== id) }));
          autoSync();
        },
        setIntro: (intro) => {
          set({ intro });
          autoSync();
        },
        setCoreCompetencies: (comp) => {
          set({ coreCompetencies: comp });
          autoSync();
        },
        setEmail: (email) => set({ email }),

        // === DB 동기화 ===
        loadFromServer: async () => {
          const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
          if (!token) {
            set({ loaded: true });
            return;
          }
          try {
            const res = await fetch("/api/users/me/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
              const { profile, careers, educations, experiences, languages, links, certificates } = data.data;
              set({
                intro: profile?.intro || "",
                coreCompetencies: profile?.core_competencies || "",
                isCareerVerified: profile?.is_career_verified || false,
                verifiedDate: profile?.verified_date || "",
                skills: profile?.skills || [],
                careers: (careers || []).map((c: any) => ({
                  id: c.id,
                  company: c.company || "",
                  department: c.department || "",
                  position: c.position || "",
                  startDate: c.start_date || "",
                  endDate: c.end_date || "",
                  isVerified: c.is_verified || false,
                })),
                educations: (educations || []).map((e: any) => ({
                  id: e.id,
                  school: e.school || "",
                  status: e.status || "",
                  startDate: e.start_date || "",
                  endDate: e.end_date || "",
                  major: e.major || "",
                  description: e.description || "",
                })),
                experiences: (experiences || []).map((x: any) => ({
                  id: x.id,
                  category: x.category || "",
                  title: x.title || "",
                  description: x.description || "",
                })),
                languages: (languages || []).map((l: any) => ({
                  id: l.id,
                  language: l.language || "",
                  level: l.level || "",
                  test: l.test || "",
                })),
                links: (links || []).map((lk: any) => ({
                  id: lk.id,
                  category: lk.category || "",
                  url: lk.url || "",
                })),
                certificates: (certificates || []).map((c: any) => ({
                  id: c.id,
                  name: c.name || "",
                  issuer: c.issuer || "",
                  issued_ym: c.issued_ym || "",
                })),
                loaded: true,
              });
              // signupStore에도 데이터 동기화
              useSignupStore.getState().setStoreProfile({
                skillAreas: profile?.skill_areas || [],
                certificates: profile?.certificates || [],
                workTypePrefer: profile?.work_type_prefer || "",
                regionPrefer: profile?.region_prefer || "",
                officeJobAreas: profile?.office_job_areas || [],
              });
            } else {
              set({ loaded: true });
            }
          } catch (e) {
            console.error("[profile load]", e);
            set({ loaded: true });
          }
        },

        syncToDb: async () => {
          const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
          if (!token) return;
          const s = get();
          // signupStore에서 추가 데이터 가져오기
          const signupData = useSignupStore.getState();
          try {
            await fetch("/api/users/me/profile", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                profile: {
                  intro: s.intro,
                  core_competencies: s.coreCompetencies,
                  is_career_verified: s.isCareerVerified,
                  verified_date: s.verifiedDate,
                  skills: s.skills,
                  // signupStore 데이터 통합
                  skill_areas: signupData.skillAreas || [],
                  certificates: signupData.certificates || [],
                  work_type_prefer: signupData.workTypePrefer || "",
                  region_prefer: signupData.regionPrefer || "",
                  office_job_areas: signupData.officeJobAreas || [],
                },
                careers: s.careers,
                educations: s.educations,
                experiences: s.experiences,
                languages: s.languages,
                links: s.links,
                certificates: s.certificates,
              }),
            });
          } catch (e) {
            console.error("[profile sync]", e);
          }
        },
      };
    },
    { name: "beautynjob-profile" }
  )
);