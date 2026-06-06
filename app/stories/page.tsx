"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const CATEGORIES = ["전체", "공감", "꿀팁", "질문"];

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  공감: { bg: "#f3e5f5", color: "#5f0080" },
  꿀팁: { bg: "#e8f5e9", color: "#2e7d32" },
  질문: { bg: "#fff3e0", color: "#e65100" },
};

export default function StoriesPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("전체");

  useEffect(() => {
    setLoading(true);
    const url = cat === "전체"
      ? "/api/community/posts"
      : `/api/community/posts?category=${encodeURIComponent(cat)}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => { if (res.success) setPosts(res.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cat]);

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
        <Link href="/"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority /></Link>
      </header>

      <div style={{ padding: "8px 0 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>이야기</h1>
        <p style={{ fontSize: 14, color: "#888" }}>뷰티 현장 사람들의 공감과 꿀팁</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            style={{
              padding: "8px 16px", borderRadius: 100, fontSize: 14, whiteSpace: "nowrap", cursor: "pointer",
              border: cat === c ? "1.5px solid #5f0080" : "1px solid #e0e0e0",
              background: cat === c ? "#5f0080" : "#fff",
              color: cat === c ? "#fff" : "#666",
              fontWeight: cat === c ? 600 : 400,
            }}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>불러오는 중...</p>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <p>아직 글이 없어요</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map((p) => {
            const cs = CAT_STYLE[p.category] || { bg: "#f0f0f0", color: "#666" };
            return (
              <Link key={p.id} href={`/stories/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#fff", border: "1px solid #f0e8f8", borderRadius: 14, padding: 16, cursor: "pointer" }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: cs.bg, color: cs.color, marginBottom: 10 }}>
                    {p.category}
                  </span>
                  {p.title && <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>{p.title}</h2>}
                  <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.body}
                  </p>
                  <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 13, color: "#999" }}>
                    <span>❤ {p.like_count}</span>
                    <span>💬 {p.comment_count}</span>
                    <span style={{ marginLeft: "auto" }}>{fmtDate(p.published_at || p.created_at)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
