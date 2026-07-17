"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import { ThumbsUp } from "lucide-react";

const CATEGORIES = ["전체", "공감", "꿀팁", "질문", "정보"];

const CAT_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  공감: { bg: "#f3e5f5", color: "#5f0080", emoji: "💬" },
  꿀팁: { bg: "#e8f5e9", color: "#2e7d32", emoji: "💡" },
  질문: { bg: "#fff3e0", color: "#e65100", emoji: "❓" },
  정보: { bg: "#e3f2fd", color: "#1565c0", emoji: "📌" },
};

export default function StoriesPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("전체");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = cat === "전체"
      ? "/api/community/posts?limit=50"
      : `/api/community/posts?category=${encodeURIComponent(cat)}&limit=50`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => { if (res.success) setPosts(res.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cat]);

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    const diff = Math.floor((Date.now() - dt.getTime()) / 60000);
    if (diff < 1) return "방금 전";
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}일 전`;
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };

  return (
    <main>
      <Header />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>

      {/* 인트로 배너 */}
      <div style={{
        background: "#f3edfa", borderRadius: 16, padding: "22px 24px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#5f0080", marginBottom: 8, whiteSpace: "nowrap" }}>현장이야기</h1>
          <p style={{ fontSize: 14, color: "#8a6aa8", lineHeight: 1.6 }}>
            진상 손님부터 독립 고민까지,<br />
            공감·꿀팁·정보가 모이는 뷰티 현장 이야기.
          </p>
        </div>
        <svg width="140" height="108" viewBox="0 0 140 108" fill="none" style={{ flexShrink: 0 }}>
          <rect x="62" y="12" width="62" height="70" rx="8" fill="#fff" />
          <rect x="67" y="17" width="52" height="60" rx="5" fill="#faf7fd" />
          <circle cx="76" cy="30" r="5" fill="#2e7d32" />
          <path d="M73.5 30 l2 2 l3.5 -3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="85" y="28" width="26" height="4" rx="2" fill="#d8c4ec" />
          <circle cx="76" cy="45" r="5" fill="#2e7d32" />
          <path d="M73.5 45 l2 2 l3.5 -3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="85" y="43" width="22" height="4" rx="2" fill="#d8c4ec" />
          <circle cx="76" cy="60" r="5" fill="#2e7d32" />
          <path d="M73.5 60 l2 2 l3.5 -3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="85" y="58" width="28" height="4" rx="2" fill="#d8c4ec" />
          <ellipse cx="30" cy="22" rx="18" ry="10" fill="#fff" />
          <path d="M22 30 L19 37 L31 31 Z" fill="#fff" />
          <circle cx="22" cy="22" r="2" fill="#b794d4" />
          <circle cx="30" cy="22" r="2" fill="#b794d4" />
          <circle cx="38" cy="22" r="2" fill="#b794d4" />
          <circle cx="38" cy="66" r="18" fill="#f7d9bf" />
          <path d="M21 64 Q38 42 55 64 Q51 52 38 51 Q25 52 21 64 Z" fill="#5f0080" />
          <circle cx="33" cy="66" r="1.8" fill="#4a3a3a" />
          <circle cx="44" cy="66" r="1.8" fill="#4a3a3a" />
          <path d="M34 73 Q38 77 43 73" stroke="#4a3a3a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <rect x="18" y="90" width="40" height="6" rx="3" fill="#d8c4ec" />
        </svg>
      </div>

      {/* 검색 + 카테고리 필터 바 */}
      <div className="stories-filter-bar">
        <div className="stories-search-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목·내용 검색"
            style={{
              width: "100%", padding: "11px 40px 11px 16px", borderRadius: 100,
              border: "1px solid #e0d4f0", fontSize: 14, boxSizing: "border-box",
              outline: "none", background: "#fff",
            }}
          />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="7" stroke="#b9a3d6" strokeWidth="2" />
            <path d="M21 21l-4.3-4.3" stroke="#b9a3d6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="stories-cat-tabs">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className="stories-cat-btn"
              style={{
                border: cat === c ? "1.5px solid #5f0080" : "1px solid #e0e0e0",
                background: cat === c ? "#5f0080" : "#fff",
                color: cat === c ? "#fff" : "#666",
                fontWeight: cat === c ? 600 : 400,
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .stories-filter-bar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 18px;
        }
        .stories-search-wrap {
          position: relative;
          flex: 1;
        }
        .stories-cat-tabs {
          display: flex;
          gap: 6px;
        }
        .stories-cat-btn {
          flex: 1;
          padding: 8px 4px;
          border-radius: 100px;
          font-size: 13px;
          white-space: nowrap;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .stories-filter-bar {
            flex-direction: row;
            align-items: center;
          }
          .stories-search-wrap {
            flex: 1 1 auto;
          }
          .stories-cat-tabs {
            flex: 0 0 auto;
          }
          .stories-cat-btn {
            flex: 0 0 auto;
            padding: 8px 16px;
          }
        }
      `}</style>

      {(() => {
        const q = search.trim().toLowerCase();
        const filtered = q
          ? posts.filter((p) =>
              (p.title || "").toLowerCase().includes(q) ||
              (p.body || "").toLowerCase().includes(q)
            )
          : posts;
        return loading ? (
          <p style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>불러오는 중...</p>
        ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <p>{q ? "검색 결과가 없어요" : "아직 글이 없어요"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((p) => {
            const cs = CAT_STYLE[p.category] || { bg: "#f0f0f0", color: "#666", emoji: "💬" };
            return (
              <Link key={p.id} href={`/stories/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{
                  background: "#fff", border: "1px solid #f0e8f8", borderRadius: 14,
                  padding: 18, cursor: "pointer",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: cs.bg, color: cs.color, marginBottom: 7 }}>
                      {p.category}
                    </span>
                    {p.title && <h2 style={{ fontSize: 16.5, fontWeight: 700, color: "#1a1a1a", marginBottom: 5, lineHeight: 1.4 }}>{p.title}</h2>}
                    <p style={{ fontSize: 14.5, color: "#666", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 10 }}>
                      {p.body}
                    </p>
                    <div style={{ display: "flex", gap: 12, fontSize: 12.5, color: "#aaa" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><ThumbsUp size={13} strokeWidth={2} /> {p.like_count}</span>
                      <span>💬 {p.comment_count}</span>
                      <span>조회 {p.view_count ?? 0}</span>
                      <span style={{ marginLeft: "auto" }}>{fmtDate(p.published_at || p.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        );
      })()}
    </div>
    </main>
  );
}
