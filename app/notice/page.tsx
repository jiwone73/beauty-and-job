"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import InfoHeader from "@/components/InfoHeader";

type Notice = {
  id: string; type: "notice" | "event"; title: string;
  is_pinned: boolean; published_at: string | null; created_at: string;
};

const TYPE_TABS = [
  { key: "", label: "전체" },
  { key: "notice", label: "공지" },
  { key: "event", label: "이벤트·혜택" },
];

function fmtDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticePage() {
  const [list, setList] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (query) params.set("q", query);
    fetch(`/api/notices?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setList(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type, query]);

  return (
    <div className="info-page">
      <InfoHeader active="/notice" />
      <main className="info-main">
        <div className="info-main" style={{ maxWidth: 860, margin: "0 auto" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#2b2b2b", margin: "0 0 24px" }}>공지사항</h1>

          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {TYPE_TABS.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)}
                style={{
                  padding: "8px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  border: type === t.key ? "1px solid #5f0080" : "1px solid #e0e0e0",
                  background: type === t.key ? "#5f0080" : "#fff",
                  color: type === t.key ? "#fff" : "#666",
                }}>
                {t.label}
              </button>
            ))}
            <div style={{ flex: 1, minWidth: 12 }} />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setQuery(q.trim()); }}
              placeholder="제목 검색"
              style={{ height: 38, padding: "0 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 14, width: 160 }} />
            <button onClick={() => setQuery(q.trim())}
              style={{ height: 38, padding: "0 14px", border: "1px solid #5f0080", background: "#fff", color: "#5f0080", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              검색
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#999", textAlign: "center", padding: "60px 0" }}>불러오는 중...</p>
          ) : list.length === 0 ? (
            <p style={{ color: "#999", textAlign: "center", padding: "60px 0" }}>등록된 공지사항이 없습니다.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid #eee" }}>
              {list.map((n) => (
                <li key={n.id} style={{ borderBottom: "1px solid #eee" }}>
                  <Link href={`/notice/${n.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 4px", textDecoration: "none", color: "inherit" }}>
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                      background: n.type === "event" ? "#fdeef5" : "#f3eafa", color: n.type === "event" ? "#c2185b" : "#5f0080" }}>
                      {n.type === "event" ? "이벤트" : "공지"}
                    </span>
                    {n.is_pinned && (
                      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#5f0080", border: "1px solid #5f0080", borderRadius: 4, padding: "1px 5px" }}>고정</span>
                    )}
                    <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500, color: "#2b2b2b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 13, color: "#aaa" }}>{fmtDate(n.published_at || n.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}