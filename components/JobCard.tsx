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
 * 카드 둘째 줄에 무엇을 놓을지 — 모집분야다.
 *
 * 예전에는 매장 공고에만 모집분야를 놓고 오피스 공고에는 회사명을 놓았다.
 * 「매장 공고는 제목에 지점명이 들어 있으니 회사명을 또 놓을 필요가 없다」는
 * 이유였는데, 실제 제목은 「★90일 디자이너 전환 시스템★」·「이직 할 미용실을
 * 찾으세요?」처럼 가게 이름이 없는 것이 더 많았다. 그래서 어느 매장인지 알
 * 길이 카드에 아예 없었다.
 *
 * 이제 회사명은 사진 위에 얹는다(아래 jobcard-cover-badge). 글줄을 하나도
 * 뺏지 않으니 카드 높이가 그대로고, 이 줄은 양쪽 다 모집분야를 쓴다.
 *
 * 모집분야가 없는 옛 공고는 회사명으로 되돌아간다 — 줄을 비우면 그 카드만
 * 한 줄 낮아져 줄이 어긋난다.
 */
function 둘째줄(data: JobCardData): string {
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
          <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.title}</p>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>{data.company}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>{meta}</p>
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
          <>
            <BannerImg src={data.image} alt={data.company} fill />
            {/* 사진 위에 얹는다 — 본문 줄을 안 뺏으니 카드가 높아지지 않는다.
                사진이 없을 때 표지가 회사명을 크게 쓰던 것과 같은 자리다. */}
            {data.company && <span className="jobcard-cover-badge">{data.company}</span>}
          </>
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