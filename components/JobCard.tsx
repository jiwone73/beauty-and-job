"use client";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { shortRegion } from "@/lib/regionShort";
import { BannerImg } from "@/components/BannerImg";

const PURPLE = "#582681";

export type JobCardData = {
  id: string | number;
  title: string;
  company: string;
  region: string;
  career: string;
  employment: string | null;
  deadline: string;
  image?: string | null;
  /** 모집분야. 매장 공고는 회사명 대신 이걸 보여 준다. */
  categories?: string[] | null;
  /** STORE | OFFICE — 둘째 줄에 무엇을 놓을지 가른다. */
  jobType?: string | null;
};

/**
 * 카드 둘째 줄에 무엇을 놓을지.
 *
 * 매장 공고는 제목에 지점명이 대부분 들어 있다("준오헤어 홍대1호점과 함께…").
 * 그 아래 회사명을 또 놓으면 같은 말을 두 번 하는 셈이라, 정작 궁금한
 * '무슨 자리를 뽑는지'가 안 보인다. 그래서 모집분야를 놓는다.
 *
 * 본사 공고는 반대다. 제목이 직군으로 시작해서("브랜드 마케터") 어느 회사인지가
 * 빠진다. 그쪽은 회사명을 그대로 둔다.
 *
 * 모집분야가 없으면(옛 공고 등) 회사명으로 되돌아간다 — 빈 줄을 남기지 않는다.
 */
function 둘째줄(data: JobCardData): string {
  if (data.jobType === "OFFICE") return data.company;
  const c = (data.categories || []).filter(Boolean);
  if (!c.length) return data.company;
  // 칸이 한 줄뿐이라 다 늘어놓으면 뒤가 잘려 몇 개인지도 모르게 된다.
  return c.length > 2 ? `${c[0]} · ${c[1]} 외 ${c.length - 2}` : c.join(" · ");
}

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
  const meta = [data.region ? shortRegion(data.region) : data.region, data.career, showEmp ? data.employment : null].filter(Boolean).join(" · ");

  if (variant === "list") {
    return (
      <div onClick={go} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "13px 15px", cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, background: PURPLE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, overflow: "hidden" }}>
          {data.image ? <img src={data.image} alt={data.company} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (data.company?.[0] || "·")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.title}</p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>{data.company}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>{meta}</p>
          <span style={{ display: "inline-block", marginTop: 5, fontSize: 13, fontWeight: 600, color: deadlineColor(deadlineLabel) }}>{deadlineLabel}</span>
        </div>
        <button onClick={onMark} aria-label="스크랩" style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: marked ? PURPLE : "#ccc" }}>
          <Bookmark size={18} fill={marked ? "currentColor" : "none"} />
        </button>
      </div>
    );
  }

  // ===== grid (메인·채용공고 공용) =====
  // 카드 썸네일 칸은 3:2 고정. 목록에서는 칸 높이가 일정한 게 우선이라 사진을 꽉 채워 자른다.
  // (사진 전체는 공고 상세의 배너에서 자르지 않고 보여 준다.)
  return (
    <div className={`jobcard${data.image ? " jobcard-photo" : ""}`} onClick={go}>
      <div className={`jobcard-cover${data.image ? "" : " jobcard-cover-empty"}`}>
        {data.image ? (
          <BannerImg src={data.image} alt={data.company} fill />
        ) : (
          <span className="jobcard-cover-name">{data.company || "·"}</span>
        )}
        <button onClick={onMark} aria-label="스크랩" className={`jobcard-bookmark ${marked ? "on" : ""}`}>
          <Bookmark size={16} fill={marked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="jobcard-body">
        <p className="jobcard-title">{data.title}</p>
        <p className="jobcard-company">{둘째줄(data)}</p>
        <div className="jobcard-metarow">
          <p className="jobcard-meta">{meta}</p>
          <span className="jobcard-deadline" style={{ color: deadlineColor(deadlineLabel) }}>{deadlineLabel}</span>
        </div>
      </div>
    </div>
  );
}