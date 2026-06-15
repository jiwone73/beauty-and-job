"use client";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";

const PURPLE = "#5f0080";

export type JobCardData = {
  id: string | number;
  title: string;
  company: string;
  region: string;
  career: string;
  employment: string | null;
  deadline: string;
  image?: string | null;
};

function deadlineColor(d: string) {
  if (d === "마감") return "#bbb";
  if (d === "상시채용" || d === "상시" || d === "채용중") return "#0f6e56";
  return PURPLE;
}

export default function JobCard({ data, variant = "grid" }: { data: JobCardData; variant?: "grid" | "list" }) {
  const router = useRouter();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const toggle = useBookmarkStore((s) => s.toggle);
  const marked = bookmarks.includes(String(data.id));
  const showEmp = !!data.employment && !/정규/.test(data.employment);
  const deadlineLabel = data.deadline === "상시" ? "상시채용" : data.deadline;
  const go = () => router.push(`/jobs/${data.id}`);
  const onMark = (e: React.MouseEvent) => { e.stopPropagation(); toggle(data.id); };
  const meta = [data.region, data.career].filter(Boolean).join(" · ");

  if (variant === "list") {
    return (
      <div onClick={go} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "13px 15px", cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, background: PURPLE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, overflow: "hidden" }}>
          {data.image ? <img src={data.image} alt={data.company} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (data.company?.[0] || "·")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.title}</p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>{data.company}</p>
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
            {meta}{showEmp ? <> · <span style={{ color: "#b45309" }}>{data.employment}</span></> : ""}
          </p>
          <span style={{ display: "inline-block", marginTop: 5, fontSize: 12, fontWeight: 600, color: deadlineColor(deadlineLabel) }}>{deadlineLabel}</span>
        </div>
        <button onClick={onMark} aria-label="북마크" style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: marked ? PURPLE : "#ccc" }}>
          <Bookmark size={18} fill={marked ? "currentColor" : "none"} />
        </button>
      </div>
    );
  }

  // ===== grid (메인·채용공고 공용) =====
  return (
    <div className="jobcard" onClick={go}>
      <div className="jobcard-cover">
        {data.image ? (
          <img src={data.image} alt={data.company} className="jobcard-cover-img" />
        ) : (
          <span className="jobcard-cover-initial">{data.company?.[0] || "·"}</span>
        )}
        {showEmp && <span className="jobcard-emp">{data.employment}</span>}
        <button onClick={onMark} aria-label="북마크" className={`jobcard-bookmark ${marked ? "on" : ""}`}>
          <Bookmark size={16} fill={marked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="jobcard-body">
        <p className="jobcard-title">{data.title}</p>
        <p className="jobcard-company">{data.company}</p>
        <p className="jobcard-meta">{meta}</p>
        <span className="jobcard-deadline" style={{ color: deadlineColor(deadlineLabel) }}>{deadlineLabel}</span>
      </div>
    </div>
  );
}