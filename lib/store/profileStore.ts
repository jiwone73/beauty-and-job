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
  /** 매장 이름을 남에게 보일지. 끄면 미리보기·인재검색에서 ○○○ 으로 나간다.
   *  지원한 곳에는 그대로 보인다 — 거기는 내가 스스로 문을 연 자리다. */
  companyPublic?: boolean;
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
  category: string;    // 수상·봉사·동아리·기타, 그리고 「교육」(교육·수료 칸)
  title: string;       // 활동명·수상명 / 교육명(학원·기관)
  description: string; // 내용·성과 / 과정명
  startDate?: string;  // 교육 기간(교육만 쓴다)
  endDate?: string;
  status?: string;     // 수료 여부(교육만 쓴다)
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
  /** 서버에 저장한다. complete=true 는 「저장하기」(완성본), false 는 「임시저장」(DRAFT). 성공하면 true. */
  syncToDb: (옵션?: { complete?: boolean }) => Promise<boolean>;
  /** 서버에 저장된 것과 지금 화면 값이 다른가(저장하지 않은 내용이 있나). */
  저장안한것있나: () => boolean;
  /** 화면을 저장 후 바뀜 표시로 다시 그리게 하는 숫자. 직접 쓰지 않는다. */
  revision: number;

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
      // 마지막으로 서버에 저장된(또는 방금 받아온) 데이터 본문. 지금 화면 값과 같으면 바뀐 것이 없다.
      let 마지막보낸것 = "";
      // 보내는 중이면 겹쳐 보내지 않는다.
      let 보내는중 = false;

      // 자동 저장은 없다. 이력서는 「저장하기」(완성본)·「임시저장」으로만 서버에 간다.
      // 고치기만 하고 저장하지 않은 채 화면을 떠나려 하면 화면이 저장할지 물어본다.
      // 예전에는 손을 멈추면 1.5초 뒤 알아서 저장돼, 필수 칸이 빈 채로도 지원이 됐다.
      // 지원서 창이 열려 있는 동안의 잠금(저장잠김)은 그대로 둔다.
      let 저장잠김 = false;
      const autoSync = () => {};

      // 서버에 마지막으로 저장된(또는 방금 받아온) 데이터 본문과 그 상태.
      // 지금 화면 값과 다르면 「저장하지 않은 내용」이다.
      let 마지막완료: boolean | null = null;

      // 서버로 보내는 데이터 본문. 더하기만 누르고 아무것도 안 적은 항목은 보내지 않는다 —
      // 화면에는 남겨 둔다(채우려고 만든 것일 수 있다). 빈 줄이 서버에 쌓이면 남의 화면
      // (지원서·미리보기)에도 빈 줄로 나온다.
      const 데이터본문 = () => {
        const s = get();
        const signupData = useSignupStore.getState();
        const 알맹이 = (v: unknown) => String(v ?? "").trim().length > 0;
        return JSON.stringify({
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
          careers: s.careers.filter((c) => 알맹이(c.company)),
          educations: s.educations.filter((e) => 알맹이(e.school)),
          experiences: s.experiences.filter((x) => 알맹이(x.title)),
          languages: s.languages.filter((l) => 알맹이(l.language)),
          links: s.links.filter((l) => 알맹이(l.url)),
          certificates: s.certificates.filter((c) => 알맹이(c.name)),
        });
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
        coverLetter: "",
        email: "",
        isEntryLevel: false,
        entryExperience: "",
        loaded: false,

        자동저장잠금: (잠글까) => {
          저장잠김 = 잠글까;
        },
        revision: 0,
        저장안한것있나: () => 마지막보낸것 !== "" && 데이터본문() !== 마지막보낸것,
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
                  description: c.description || "",
                  companyPublic: c.company_public !== false,
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
                  startDate: x.start_date || "",
                  endDate: x.end_date || "",
                  status: x.status || "",
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
              // 방금 받아온 것이 「저장된 상태」다. 이것과 달라지면 저장하지 않은 내용이 된다.
              마지막보낸것 = 데이터본문();
              마지막완료 = null;
              set((st) => ({ revision: st.revision + 1 }));
            } else {
              // 못 받아왔는데 '불러왔다'고 표시하면, 빈 화면이 사실인 양 굳는다.
              // 그대로 두면 다음에 들어올 때 다시 받아온다.
              console.error("[profile load] 응답에 데이터가 없음");
            }
          } catch (e) {
            console.error("[profile load]", e);
          }
        },

        syncToDb: async (옵션) => {
          // 잠긴 동안에는 어느 길로 불려도 나가지 않는다.
          if (저장잠김) return false;
          const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
          if (!token) return false;
          // 이 PUT 은 이력서를 통째로 갈아 끼운다. 서버에서 한 번도 받아오지
          // 않은 상태(새 기기·캐시 지운 뒤)라면 지금 손에 든 것은 빈 껍데기라,
          // 그대로 보내면 경력·학력·어학이 한꺼번에 지워진다.
          if (!get().loaded) {
            throw new Error("이력서를 아직 불러오지 못했습니다.");
          }
          const 데이터 = 데이터본문();
          const 완료 = 옵션?.complete;
          // 바뀐 것도 없고 저장 상태(완성본/임시)도 그대로면 보내지 않는다.
          if (데이터 === 마지막보낸것 && (완료 === undefined || 완료 === 마지막완료)) return true;
          // 이미 보내는 중이면 끝나기를 기다린다. 두 번이 겹치면 나중 것이 앞 것을 덮어 어느 쪽이 남을지 알 수 없다.
          while (보내는중) await new Promise((r) => setTimeout(r, 50));
          보내는중 = true;
          try {
            const 본문 = JSON.stringify({ ...JSON.parse(데이터), ...(완료 === undefined ? {} : { complete: 완료 }) });
            const res = await fetch("/api/users/me/profile", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: 본문,
            });
            if (!res.ok) return false;
            마지막보낸것 = 데이터;
            if (완료 !== undefined) 마지막완료 = 완료;
            set((st) => ({ revision: st.revision + 1 }));
            return true;
          } catch (e) {
            console.error("[profile sync]", e);
            return false;
          } finally {
            보내는중 = false;
          }
        },
      };
    },
    { name: "beautynjob-profile" }
  )
);