import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  userPhone: string;
  userJobType: "OFFICE" | "STORE" | "";

  login: (data: { userName?: string; userPhone?: string; userJobType?: "OFFICE" | "STORE" | "" }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userName: "",
      userPhone: "",
      userJobType: "",

      login: (data) =>
        set({
          isLoggedIn: true,
          userName: data.userName || "",
          userPhone: data.userPhone || "",
          userJobType: data.userJobType || "",
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          userName: "",
          userPhone: "",
          userJobType: "",
        }),
    }),
    { name: "beautynjob-auth" }
  )
);