"use client";
import Header from "@/components/Header";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Clock } from "lucide-react";

const CATEGORIES = ["전체", "트렌드", "커리어", "연봉정보", "브랜드스토리", "취업팁"];
const EMOJI: Record<string, string> = { "트렌드": "✨", "커리어": "💼", "연봉정보": "📊", "브랜드스토리": "🌿", "취업팁": "🎯" };
const COLOR: Record<string, string> = { "트렌드": "#f3e8f7", "커리어": "#e8f0fe", "연봉정보": "#e8f5e9", "브랜드스토리": "#fff3e0", "취업팁": "#fce4ec" };

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
function excerpt(content: string | null) {
  if (!content) return "";
  return content.split("\n").filter((l) => !l.trim().startsWith("#")).join(" ").replace(/[*_>#-]/g, " ").trim().slice(0, 80);
}

type Item = { id: string; title: string; category: string; content: string | null; tags: string[]; read_time: number | null; view_count: number; created_at: string; };

export default function InsightsPage() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/insights?limit=100")
      .then((r) => r.json())
      .then((res) => { if (res.success) setItems(res.data.items); })
      .catch(() => {});
  }, []);

  const featured = items.slice(0, 3);
  const filtered = items.filter((item) => {
    const matchCat = activeCategory === "전체" || item.category === activeCategory;
    const matchSearch = !searchQuery || item.title.includes(searchQuery) || excerpt(item.content).includes(searchQuery);
    return matchCat && matchSearch;
  });

  return (
    <div className="insights-page">
      <Header />
      <div className="insights-container">
        <div className="insights-hero">
          <div className="insights-hero-text">
            <span className="insights-hero-badge">✍️ 에디터 픽</span>
            <h1 className="insights-hero-title">뷰티 커리어에 필요한<br />모든 인사이트</h1>
            <p className="insights-hero-desc">트렌드, 연봉, 커리어 팁까지<br />뷰티 업계의 모든 정보를 담았어요</p>
          </div>
          <div className="insights-hero-cards">
            {featured.slice(0, 2).map((item) => (
              <Link key={item.id} href={`/insights/${item.id}`} className="insights-hero-card">
                <div className="insights-hero-card-thumb" style={{ background: COLOR[item.category] || "#f3e8f7" }}>
                  <span className="insights-hero-card-emoji">{EMOJI[item.category] || "📖"}</span>
                </div>
                <div className="insights-hero-card-body">
                  <span className="insights-category-badge">{item.category}</span>
                  <p className="insights-hero-card-title">{item.title}</p>
                  <div className="insights-meta">
                    <Clock size={12} />
                    <span>{item.read_time ? `${item.read_time}분` : ""} 읽기</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="insights-search-wrap">
          <div className="insights-search-box">
            <Search size={18} className="insights-search-icon" />
            <input className="insights-search-input" placeholder="아티클 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="insights-tabs">
          {CATEGORIES.map((cat) => (
            <button key={cat} className={`insights-tab ${activeCategory === cat ? "active" : ""}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="insights-grid">
            {filtered.map((item) => (
              <Link key={item.id} href={`/insights/${item.id}`} className="insights-card">
                <div className="insights-card-thumb" style={{ background: COLOR[item.category] || "#f3e8f7" }}>
                  <span className="insights-card-emoji">{EMOJI[item.category] || "📖"}</span>
                </div>
                <div className="insights-card-body">
                  <span className="insights-category-badge">{item.category}</span>
                  <h3 className="insights-card-title">{item.title}</h3>
                  <p className="insights-card-desc">{excerpt(item.content)}</p>
                  <div className="insights-card-footer">
                    <span className="insights-card-date">{fmtDate(item.created_at)}</span>
                    <div className="insights-meta">
                      <Clock size={12} />
                      <span>{item.read_time ? `${item.read_time}분` : ""} 읽기</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="jobs-empty">
            <div className="jobs-empty-icon">🔍</div>
            <p className="jobs-empty-title">검색 결과가 없어요.</p>
            <button className="jobs-empty-reset" onClick={() => { setSearchQuery(""); setActiveCategory("전체"); }}>초기화</button>
          </div>
        )}
      </div>
    </div>
  );
}