import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  userPhone: string;

  login: (data: { userName?: string; userPhone?: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userName: "",
      userPhone: "",

      login: (data) =>
        set({
          isLoggedIn: true,
          userName: data.userName || "",
          userPhone: data.userPhone || "",
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          userName: "",
          userPhone: "",
        }),
    }),
    { name: "beautynjob-auth" }
  )
);
