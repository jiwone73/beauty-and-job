import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  userPhone: string;
  userJobType: "OFFICE" | "STORE" | "";
  userJobAreas: string[];

  login: (data: { userName?: string; userPhone?: string; userJobType?: "OFFICE" | "STORE" | ""; userJobAreas?: string[] }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userName: "",
      userPhone: "",
      userJobType: "",
      userJobAreas: [],

      login: (data) =>
        set({
          isLoggedIn: true,
          userName: data.userName || "",
          userPhone: data.userPhone || "",
          userJobType: data.userJobType || "",
          userJobAreas: data.userJobAreas || [],
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          userName: "",
          userPhone: "",
          userJobType: "",
          userJobAreas: [],
        }),
    }),
    { name: "beautynjob-auth" }
  )
);