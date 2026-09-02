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
  description: string;
}
export interface EducationEntry {
  id: string;
  level?: string;      // 학력 구분: 중학교 / 고등학교 / 대학(2,3년제) / 대학(4년제) / 대학원
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
  /** 기본 자기소개서 — 선택. 지원할 때 이 값을 불러다 고쳐 쓴다. */
  coverLetter: string;
  email: string;
  isEntryLevel: boolean; // 신입(경력 없음) 여부
  entryExperience: string; // 신입: 직무와 연관된 경험
  loaded: boolean;

  // 액션
  setCareerVerified: (verified: boolean, date?: string) => void;
  addCareer: (entry: CareerEntry) => void;
  updateCareer: (id: string, entry: CareerEntry) => void;
  removeCareer: (id: string) => void;
  addEducation: (entry: EducationEntry) => void;
  updateEducation: (id: string, entry: EducationEntry) => void;
  removeEducation: (id: string) => void;
  addExperience: (entry: ExperienceEntry) => void;
  updateExperience: (id: string, entry: ExperienceEntry) => void;
  removeExperience: (id: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  addLanguage: (entry: LanguageEntry) => void;
  updateLanguage: (id: string, entry: LanguageEntry) => void;
  removeLanguage: (id: string) => void;
  addLink: (entry: LinkEntry) => void;
  updateLink: (id: string, entry: LinkEntry) => void;
  removeLink: (id: string) => void;
  addCertificate: (entry: CertificateEntry) => void;
  updateCertificate: (id: string, entry: CertificateEntry) => void;
  removeCertificate: (id: string) => void;
  setIntro: (intro: string) => void;
  setCoverLetter: (v: string) => void;
  setCoreCompetencies: (comp: string) => void;
  setEmail: (email: string) => void;
  setIsEntryLevel: (v: boolean) => void;
  setEntryExperience: (v: string) => void;
  reset: () => void;

  // 새 액션: DB 동기화
  loadFromServer: () => Promise<void>;
  syncToDb: () => Promise<void>;

  /** 저장을 잠근다. 지원서 사본을 고치는 동안 기본 이력서가 덮이지 않게. */
  자동저장잠금: (잠글까: boolean) => void;
  /** 지금 이력서를 한 벌 떠 둔다(깊은 사본). */
  이력서뽑기: () => 이력서한벌;
  /** 떠 둔 것으로 되돌린다. 지원서 창을 닫을 때 부른다. */
  이력서되돌리기: (사본: 이력서한벌) => void;
}

/** 이력서를 이루는 값들만 모은 것. 액션·loaded 는 뺀다. */
export type 이력서한벌 = Pick<ProfileState,
  "isCareerVerified" | "verifiedDate" | "careers" | "educations" | "experiences" |
  "skills" | "languages" | "links" | "certificates" | "intro" | "coreCompetencies" |
  "coverLetter" | "email" | "isEntryLevel" | "entryExperience">;

let counter = 0;
export function genId(): string {
  return `${Date.now()}-${++counter}`;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => {
      let autoSyncTimer: any = null;
      // 마지막으로 서버에 보낸 본문. 같으면 다시 보내지 않는다.
      let 마지막보낸것 = "";
      // 보내는 중이면 겹쳐 보내지 않고, 그 사이 또 바뀌었으면 끝난 뒤 한 번 더.
      let 보내는중 = false;
      let 또보낼것 = false;

      // 액션 뒤 자동 저장. 타자를 치는 동안에는 미뤘다가 손을 멈추면 한 번에
      // 묶어 보낸다. 칸마다 즉시 보내면 이력서 하나에 마흔 번 넘게 나간다.
      // 지원서 창이 열려 있는 동안은 잠근다. 그때 고치는 것은 이 공고에
      // 낼 사본이지 기본 이력서가 아니다 — 타자마다 서버로 나가면 사본이라는
      // 말이 무색해진다.
      let 저장잠김 = false;
      const autoSync = () => {
        if (저장잠김) return;
        if (autoSyncTimer) clearTimeout(autoSyncTimer);
        autoSyncTimer = setTimeout(() => { autoSyncTimer = null; get().syncToDb(); }, 1500);
      };

      // 대기 중인 저장을 지금 흘려보낸다. 화면을 덮거나 떠날 때 부른다 —
      // 1.5초를 기다리다가 그냥 나가면 마지막 손질이 사라진다.
      const 지금보내기 = () => {
        if (저장잠김) return;
        if (!autoSyncTimer) return;
        clearTimeout(autoSyncTimer); autoSyncTimer = null;
        get().syncToDb();
      };
      if (typeof window !== "undefined") {
        document.addEventListener("visibilitychange", () => { if (document.hidden) 지금보내기(); });
        window.addEventListener("pagehide", 지금보내기);
      }

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
        coverLetter: "",
        email: "",
        isEntryLevel: false,
        entryExperience: "",
        loaded: false,

        자동저장잠금: (잠글까) => {
          저장잠김 = 잠글까;
          if (잠글까 && autoSyncTimer) { clearTimeout(autoSyncTimer); autoSyncTimer = null; }
        },
        이력서뽑기: () => {
          const s = get();
          return JSON.parse(JSON.stringify({
            isCareerVerified: s.isCareerVerified, verifiedDate: s.verifiedDate,
            careers: s.careers, educations: s.educations, experiences: s.experiences,
            skills: s.skills, languages: s.languages, links: s.links, certificates: s.certificates,
            intro: s.intro, coreCompetencies: s.coreCompetencies, coverLetter: s.coverLetter, email: s.email,
            isEntryLevel: s.isEntryLevel, entryExperience: s.entryExperience,
          }));
        },
        이력서되돌리기: (사본) => set(JSON.parse(JSON.stringify(사본))),

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
          coverLetter: "",
          email: "",
          isEntryLevel: false,
          entryExperience: "",
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
        updateCareer: (id, entry) => {
          set((s) => ({ careers: s.careers.map((c) => (c.id === id ? entry : c)) }));
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
        updateEducation: (id, entry) => {
          set((s) => ({ educations: s.educations.map((e) => (e.id === id ? entry : e)) }));
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
        updateExperience: (id, entry) => {
          set((s) => ({ experiences: s.experiences.map((x) => (x.id === id ? entry : x)) }));
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
        updateLanguage: (id, entry) => {
          set((s) => ({ languages: s.languages.map((l) => (l.id === id ? entry : l)) }));
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
        updateLink: (id, entry) => {
          set((s) => ({ links: s.links.map((lk) => (lk.id === id ? entry : lk)) }));
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
        updateCertificate: (id, entry) => {
          set((s) => ({ certificates: s.certificates.map((c) => (c.id === id ? entry : c)) }));
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
        setCoverLetter: (v) => {
          set({ coverLetter: v });
          autoSync();
        },
        setEmail: (email) => set({ email }),
        setIsEntryLevel: (v) => { set({ isEntryLevel: v }); autoSync(); },
        setEntryExperience: (v) => { set({ entryExperience: v }); },

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
                coverLetter: profile?.cover_letter || "",
                isEntryLevel: profile?.is_entry_level || false,
                entryExperience: profile?.entry_experience || "",
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
                  level: e.level || "",
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
              // 못 받아왔는데 '불러왔다'고 표시하면, 빈 화면이 사실인 양 굳는다.
              // 그대로 두면 다음에 들어올 때 다시 받아온다.
              console.error("[profile load] 응답에 데이터가 없음");
            }
          } catch (e) {
            console.error("[profile load]", e);
          }
        },

        syncToDb: async () => {
          // 잠긴 동안에는 어느 길로 불려도 나가지 않는다.
          if (저장잠김) return;
          const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
          if (!token) return;
          // 이 PUT 은 이력서를 통째로 갈아 끼운다. 서버에서 한 번도 받아오지
          // 않은 상태(새 기기·캐시 지운 뒤)라면 지금 손에 든 것은 빈 껍데기라,
          // 그대로 보내면 경력·학력·어학이 한꺼번에 지워진다.
          if (!get().loaded) {
            throw new Error("이력서를 아직 불러오지 못했습니다.");
          }
          const s = get();
          // signupStore에서 추가 데이터 가져오기
          const signupData = useSignupStore.getState();
          // 더하기만 누르고 아무것도 안 적은 항목은 보내지 않는다. 화면에는
          // 남겨 둔다 — 채우려고 만든 것일 수 있으니 지우는 것은 사람 몫이고,
          // 저장될 때만 걸러 낸다. 빈 줄이 서버에 쌓이면 남의 화면(지원서·
          // 미리보기)에도 빈 줄로 나온다.
          const 알맹이 = (v: unknown) => String(v ?? "").trim().length > 0;
          const 보낼경력 = s.careers.filter((c) => 알맹이(c.company));
          const 보낼학력 = s.educations.filter((e) => 알맹이(e.school));
          const 보낼활동 = s.experiences.filter((x) => 알맹이(x.title));
          const 보낼어학 = s.languages.filter((l) => 알맹이(l.language));
          const 보낼링크 = s.links.filter((l) => 알맹이(l.url));
          const 보낼자격 = s.certificates.filter((c) => 알맹이(c.name));
          const 본문 = JSON.stringify({
                profile: {
                  intro: s.intro,
                  core_competencies: s.coreCompetencies,
                  cover_letter: s.coverLetter,
                  entry_experience: s.entryExperience,
                  is_career_verified: s.isCareerVerified,
                  verified_date: s.verifiedDate,
                  is_entry_level: s.isEntryLevel,
                  skills: s.skills,
                  // signupStore 데이터 통합
                  skill_areas: signupData.skillAreas || [],
                  work_type_prefer: signupData.workTypePrefer || "",
                  region_prefer: signupData.regionPrefer || "",
                  office_job_areas: signupData.officeJobAreas || [],
                },
                careers: 보낼경력,
                educations: 보낼학력,
                experiences: 보낼활동,
                languages: 보낼어학,
                links: 보낼링크,
                certificates: 보낼자격,
          });

          // 바뀐 것이 없으면 보내지 않는다. 예전에는 어느 칸을 건드리든 이력서
          // 전체를 매번 밀어 넣었다.
          if (본문 === 마지막보낸것) return;
          // 보내는 중이면 줄을 세운다. 두 번이 겹치면 나중 것이 앞 것을 덮어
          // 어느 쪽이 남을지 알 수 없다.
          if (보내는중) { 또보낼것 = true; return; }

          보내는중 = true;
          try {
            const res = await fetch("/api/users/me/profile", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: 본문,
            });
            if (res.ok) 마지막보낸것 = 본문;
          } catch (e) {
            console.error("[profile sync]", e);
          } finally {
            보내는중 = false;
            if (또보낼것) { 또보낼것 = false; get().syncToDb(); }
          }
        },
      };
    },
    { name: "beautynjob-profile" }
  )
);