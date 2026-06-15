"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Notice = {
  id: string; type: "notice" | "event"; title: string; body: string;
  is_pinned: boolean; published_at: string | null; created_at: string;
};

function fmtDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/notices/${id}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setNotice(res.data); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
      <Link href="/notice" style={{ fontSize: 14, color: "#888", textDecoration: "none" }}>← 공지사항 목록</Link>

      {loading ? (
        <p style={{ color: "#999", textAlign: "center", padding: "60px 0" }}>불러오는 중...</p>
      ) : notFound || !notice ? (
        <p style={{ color: "#999", textAlign: "center", padding: "60px 0" }}>공지사항을 찾을 수 없습니다.</p>
      ) : (
        <>
          <div style={{ margin: "24px 0 10px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
              background: notice.type === "event" ? "#fdeef5" : "#f3eafa", color: notice.type === "event" ? "#c2185b" : "#5f0080" }}>
              {notice.type === "event" ? "이벤트" : "공지"}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#2b2b2b", margin: "0 0 8px", lineHeight: 1.4 }}>{notice.title}</h1>
          <p style={{ fontSize: 13, color: "#aaa", margin: "0 0 20px", borderBottom: "1px solid #eee", paddingBottom: 20 }}>
            {fmtDate(notice.published_at || notice.created_at)}
          </p>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: "#333", whiteSpace: "pre-wrap" }}>{notice.body}</div>
        </>
      )}
    </div>
  );
}