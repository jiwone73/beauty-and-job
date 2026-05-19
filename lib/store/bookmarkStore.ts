import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BookmarkState {
  bookmarks: number[];
  toggle: (id: number) => void;
  isBookmarked: (id: number) => boolean;
  reset: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      reset: () => set({ bookmarks: [] }),
      bookmarks: [],
      toggle: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),
      isBookmarked: (id) => get().bookmarks.includes(id),
    }),
    { name: "beautynjob-bookmarks" }
  )
);
