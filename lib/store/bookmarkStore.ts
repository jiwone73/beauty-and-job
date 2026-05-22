import { create } from "zustand";

interface BookmarkState {
  bookmarks: string[]; // UUID 배열
  loaded: boolean;
  loadFromServer: () => Promise<void>;
  toggle: (id: number | string) => Promise<void>;
  isBookmarked: (id: number | string) => boolean;
  reset: () => void;
}

export const useBookmarkStore = create<BookmarkState>()((set, get) => ({
  bookmarks: [],
  loaded: false,

  loadFromServer: async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      set({ loaded: true });
      return;
    }
    try {
      const res = await fetch("/api/users/me/bookmarks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        set({
          bookmarks: data.data.map((b: any) => b.job_posting_id),
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch (e) {
      console.error("[bookmark loadFromServer]", e);
      set({ loaded: true });
    }
  },

  toggle: async (id) => {
    const strId = String(id);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    const isCurrentlyBookmarked = get().bookmarks.includes(strId);

    // 옵티미스틱 업데이트
    set((s) => ({
      bookmarks: isCurrentlyBookmarked
        ? s.bookmarks.filter((b) => b !== strId)
        : [...s.bookmarks, strId],
    }));

    try {
      if (isCurrentlyBookmarked) {
        await fetch(`/api/users/me/bookmarks?job_posting_id=${strId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch("/api/users/me/bookmarks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ job_posting_id: strId }),
        });
      }
    } catch (e) {
      console.error("[bookmark toggle]", e);
      // 실패 시 롤백
      set((s) => ({
        bookmarks: isCurrentlyBookmarked
          ? [...s.bookmarks, strId]
          : s.bookmarks.filter((b) => b !== strId),
      }));
    }
  },

  isBookmarked: (id) => get().bookmarks.includes(String(id)),

  reset: () => set({ bookmarks: [], loaded: false }),
}));