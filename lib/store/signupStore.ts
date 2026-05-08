import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Gender = "남성" | "여성" | "";

export interface SignupState {
  // 진행 단계 (1~10)
  currentStep: number;

  // STEP 2-3: 휴대전화/인증
  phone: string;
  isPhoneVerified: boolean;

  // STEP 4: 약관
  agreements: {
    age: boolean;
    tos: boolean;
    privacy: boolean;
    marketing: boolean;
  };

  // STEP 5: 기본 정보
  name: string;
  birth: string;
  gender: Gender;

  // STEP 6: 경력
  careerYears: number;
  isLeader: boolean;

  // STEP 7: 직군
  job: string;
  jobCustom: string;

  // STEP 8: 카테고리
  categories: string[];
  categoryCustom: string[];

  // STEP 9: 담당 국가
  countries: string[];
  countryCustom: string[];

  // ===== 액션 =====
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPhone: (phone: string) => void;
  setPhoneVerified: (verified: boolean) => void;
  setAgreements: (agreements: Partial<SignupState["agreements"]>) => void;
  setBasic: (data: { name?: string; birth?: string; gender?: Gender }) => void;
  setCareer: (data: { careerYears?: number; isLeader?: boolean }) => void;
  setJob: (job: string, custom?: string) => void;
  toggleCategory: (category: string) => void;
  addCategoryCustom: (category: string) => void;
  removeCategoryCustom: (category: string) => void;
  toggleCountry: (country: string) => void;
  addCountryCustom: (country: string) => void;
  removeCountryCustom: (country: string) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  phone: "",
  isPhoneVerified: false,
  agreements: {
    age: false,
    tos: false,
    privacy: false,
    marketing: false,
  },
  name: "",
  birth: "",
  gender: "" as Gender,
  careerYears: 1,
  isLeader: false,
  job: "",
  jobCustom: "",
  categories: [],
  categoryCustom: [],
  countries: [],
  countryCustom: [],
};

export const useSignupStore = create<SignupState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set({ currentStep: Math.min(get().currentStep + 1, 10) }),
      prevStep: () => set({ currentStep: Math.max(get().currentStep - 1, 1) }),

      setPhone: (phone) => set({ phone }),
      setPhoneVerified: (verified) => set({ isPhoneVerified: verified }),

      setAgreements: (agreements) =>
        set((state) => ({
          agreements: { ...state.agreements, ...agreements },
        })),

      setBasic: (data) => set((state) => ({ ...state, ...data })),

      setCareer: (data) => set((state) => ({ ...state, ...data })),

      setJob: (job, custom = "") => set({ job, jobCustom: custom }),

      toggleCategory: (category) =>
        set((state) => {
          // "카테고리 무관"은 배타적 선택
          if (category === "카테고리 무관") {
            return {
              categories: state.categories.includes(category)
                ? state.categories.filter((c) => c !== category)
                : [category],
              categoryCustom: [],
            };
          }
          // 다른 옵션 선택 시 "카테고리 무관" 해제
          const filtered = state.categories.filter((c) => c !== "카테고리 무관");
          return {
            categories: filtered.includes(category)
              ? filtered.filter((c) => c !== category)
              : [...filtered, category],
          };
        }),

      addCategoryCustom: (category) =>
        set((state) => ({
          categoryCustom: state.categoryCustom.includes(category)
            ? state.categoryCustom
            : [...state.categoryCustom, category],
        })),

      removeCategoryCustom: (category) =>
        set((state) => ({
          categoryCustom: state.categoryCustom.filter((c) => c !== category),
        })),

      toggleCountry: (country) =>
        set((state) => {
          if (country === "제한 없음") {
            return {
              countries: state.countries.includes(country)
                ? state.countries.filter((c) => c !== country)
                : [country],
              countryCustom: [],
            };
          }
          const filtered = state.countries.filter((c) => c !== "제한 없음");
          return {
            countries: filtered.includes(country)
              ? filtered.filter((c) => c !== country)
              : [...filtered, country],
          };
        }),

      addCountryCustom: (country) =>
        set((state) => ({
          countryCustom: state.countryCustom.includes(country)
            ? state.countryCustom
            : [...state.countryCustom, country],
        })),

      removeCountryCustom: (country) =>
        set((state) => ({
          countryCustom: state.countryCustom.filter((c) => c !== country),
        })),

      reset: () => set(initialState),
    }),
    {
      name: "beautynjob-signup",
      partialize: (state) => ({
        // 인증/약관 정보는 보안상 영속화하지 않음
        currentStep: state.currentStep,
        phone: state.phone,
        name: state.name,
        birth: state.birth,
        gender: state.gender,
        careerYears: state.careerYears,
        isLeader: state.isLeader,
        job: state.job,
        jobCustom: state.jobCustom,
        categories: state.categories,
        categoryCustom: state.categoryCustom,
        countries: state.countries,
        countryCustom: state.countryCustom,
      }),
    }
  )
);
