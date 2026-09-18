"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import InfoShell from "@/components/InfoShell";

/**
 * 공지·이벤트 글 하나.
 *
 * 목록과 같은 판(머리줄 · 탭 · 옆줄)을 쓴다. 글을 읽는 동안에도 고객센터
 * 안에 서 있다는 것이 보여야 하고, 다 읽고 옆 항목으로 바로 건너갈 수 있다.
 */
type 공지 = {
  id: string; type: "notice" | "event"; title: string; body: string;
  is_pinned: boolean; published_at: string | null; created_at: string;
};

function 날짜(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticeDetailPage() {
  const id = useParams()?.id as string;
  const [글, set글] = useState<공지 | null>(null);
  const [부르는중, set부르는중] = useState(true);
  const [없음, set없음] = useState(false);

  useEffect(() => {
    if (!id) return;
    set부르는중(true);
    fetch(`/api/notices/${id}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) set글(res.data); else set없음(true); })
      .catch(() => set없음(true))
      .finally(() => set부르는중(false));
  }, [id]);

  return (
    <InfoShell active="/notice" title="공지사항">
      {부르는중 ? (
        <p className="nb-board-msg">불러오는 중...</p>
      ) : 없음 || !글 ? (
        <p className="nb-board-msg">글을 찾을 수 없습니다.</p>
      ) : (
        <>
          <span className={`nb-view-tag${글.type === "event" ? " evt" : ""}`}>
            {글.type === "event" ? "이벤트" : "공지"}
          </span>
          <h2 className="nb-view-h">{글.title}</h2>
          <p className="nb-view-d">{날짜(글.published_at || 글.created_at)}</p>
          <div className="nb-view-body">{글.body}</div>
        </>
      )}
      <Link href="/notice" className="nb-view-back"><ChevronLeft size={15} />목록으로</Link>
    </InfoShell>
  );
}
