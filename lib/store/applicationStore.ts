import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Application {
  id: number;
  brand: string;
  title: string;
  jobId: string;
  date: string;
  status: string;
}

interface ApplicationStore {
  applications: Application[];
  apply: (job: { id: string; brand: string; title: string }) => void;
  reset: () => void;
  isApplied: (jobId: string) => boolean;
}

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set, get) => ({
      reset: () => set({ applications: [] }),
      applications: [],
      apply: (job) => {
        const already = get().applications.find(a => a.jobId === job.id);
        if (already) return;
        const newApp: Application = {
          id: Date.now(),
          brand: job.brand,
          title: job.title,
          jobId: job.id,
          date: new Date().toLocaleDateString("ko-KR").replace(/\. /g, ".").replace(".", "").slice(0, -1),
          status: "서류검토중",
        };
        set(state => ({ applications: [newApp, ...state.applications] }));
      },
      isApplied: (jobId) => get().applications.some(a => a.jobId === jobId),
    }),
    { name: "beautynjob-applications" }
  )
);
