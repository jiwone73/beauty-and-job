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
};

function deadlineColor(d: string) {
  if (d === "마감") return "#bbb";
  if (d === "상시" || d === "채용중") return "#0f6e56";
  return PURPLE;
}

export default function JobCard({ data, variant = "grid" }: { data: JobCardData; variant?: "grid" | "list" }) {
  const router = useRouter();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const toggle = useBookmarkStore((s) => s.toggle);
  const marked = bookmarks.includes(String(data.id));
  const showEmp = data.employment && !/정규/.test(data.employment);
  const go = () => router.push(`/jobs/${data.id}`);
  const onMark = (e: React.MouseEvent) => { e.stopPropagation(); toggle(data.id); };
  const meta = [data.region, data.career].filter(Boolean).join(" · ");

  if (variant === "list") {
    return (
      <div onClick={go} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "13px 15px", cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, background: PURPLE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>{data.company?.[0] || "·"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.title}</p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>{data.company}</p>
          <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
            {meta}{showEmp ? <> · <span style={{ color: "#b45309" }}>{data.employment}</span></> : ""}
          </p>
          <span style={{ display: "inline-block", marginTop: 5, fontSize: 12, fontWeight: 600, color: deadlineColor(data.deadline) }}>{data.deadline}</span>
        </div>
        <button onClick={onMark} aria-label="북마크" style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: marked ? PURPLE : "#ccc" }}>
          <Bookmark size={18} fill={marked ? "currentColor" : "none"} />
        </button>
      </div>
    );
  }

  return (
    <div onClick={go} style={{ position: "relative", background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 18px", cursor: "pointer", display: "flex", flexDirection: "column" }}>
      <button onClick={onMark} aria-label="북마크" style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: marked ? PURPLE : "#ccc" }}>
        <Bookmark size={18} fill={marked ? "currentColor" : "none"} />
      </button>
      <p style={{ margin: "0 32px 6px 0", fontSize: 15, fontWeight: 600, color: "#222", lineHeight: 1.4 }}>{data.title}</p>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#555" }}>{data.company}</p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#999" }}>
        {meta}{showEmp ? <> · <span style={{ color: "#b45309" }}>{data.employment}</span></> : ""}
      </p>
      <span style={{ fontSize: 12, fontWeight: 600, color: deadlineColor(data.deadline) }}>{data.deadline}</span>
    </div>
  );
}
