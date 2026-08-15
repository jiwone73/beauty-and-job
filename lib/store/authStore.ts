import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  isLoggedIn: boolean;
  ownerType: "user" | "company" | null;
  userName: string;
  userPhone: string;
  userJobType: "OFFICE" | "STORE" | "";
  userJobAreas: string[];
  // null = 아직 모름(미조회), "" = 사진 없음. 헤더 아바타가 깜빡이지 않게 구분해 둔다.
  avatarUrl: string | null;

  login: (data: {
    ownerType: "user" | "company";
    userName?: string;
    userPhone?: string;
    userJobType?: "OFFICE" | "STORE" | "";
    userJobAreas?: string[];
    avatarUrl?: string | null;
  }) => void;
  setAvatar: (url: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      ownerType: null,
      userName: "",
      userPhone: "",
      userJobType: "",
      userJobAreas: [],
      avatarUrl: null,

      login: (data) =>
        set({
          isLoggedIn: true,
          ownerType: data.ownerType,
          userName: data.userName || "",
          userPhone: data.userPhone || "",
          userJobType: data.userJobType || "",
          userJobAreas: data.userJobAreas || [],
          avatarUrl: data.avatarUrl ?? null,
        }),

      setAvatar: (url) => set({ avatarUrl: url }),

      logout: () =>
        set({
          isLoggedIn: false,
          ownerType: null,
          userName: "",
          userPhone: "",
          userJobType: "",
          userJobAreas: [],
          avatarUrl: null,
        }),
    }),
    { name: "beautynjob-auth" }
  )
);