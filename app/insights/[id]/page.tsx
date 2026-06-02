"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Clock, Share2, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";

const EMOJI: Record<string, string> = { "트렌드": "✨", "커리어": "💼", "연봉정보": "📊", "브랜드스토리": "🌿", "취업팁": "🎯" };
const COLOR: Record<string, string> = { "트렌드": "#f3e8f7", "커리어": "#e8f0fe", "연봉정보": "#e8f5e9", "브랜드스토리": "#fff3e0", "취업팁": "#fce4ec" };

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

type Item = { id: string; title: string; category: string; content: string | null; tags: string[]; read_time: number | null; view_count: number; created_at: string; };

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [insight, setInsight] = useState<Item | null>(null);
  const [all, setAll] = useState<Item[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/insights/${id}`)
      .then((r) => r.json())
      .then((res) => { if (res.success && res.data.item) setInsight(res.data.item); else setNotFound(true); })
      .catch(() => setNotFound(true));
    fetch(`/api/insights?limit=100`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setAll(res.data.items); })
      .catch(() => {});
  }, [id]);

  if (notFound) {
    return (
      <div className="insight-detail-page">
        <div style={{ padding: "80px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "18px", marginBottom: "16px" }}>아티클을 찾을 수 없습니다.</p>
          <Link href="/insights" className="insight-aside-banner-btn">인사이트 목록으로</Link>
        </div>
      </div>
    );
  }
  if (!insight) {
    return <div className="insight-detail-page"><div style={{ padding: "80px 20px", textAlign: "center", color: "#999" }}>불러오는 중...</div></div>;
  }

  const content = insight.content || "";
  const lead = content.split("\n").filter((l) => !l.trim().startsWith("#")).join(" ").replace(/[*_>#-]/g, " ").trim().slice(0, 100);
  const related = all.filter((i) => i.id !== insight.id && i.category === insight.category).slice(0, 3);
  const otherRelated = all.filter((i) => i.id !== insight.id && i.category !== insight.category).slice(0, 3 - related.length);
  const relatedArticles = [...related, ...otherRelated].slice(0, 3);
  const latest = all.filter((i) => i.id !== insight.id).slice(0, 5);

  return (
    <div className="insight-detail-page">
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          <button className="job-detail-back" onClick={() => router.push("/insights")}>
            <ChevronLeft size={20} />
            <span>인사이트</span>
          </button>
          <Link href="/" className="job-detail-logo"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority /></Link>
          <div className="job-detail-header-actions">
            <button className={`job-detail-bookmark ${bookmarked ? "active" : ""}`} onClick={() => setBookmarked(!bookmarked)}>
              <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button className="job-detail-share" onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("링크가 복사되었습니다.");
            }}>
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="insight-detail-layout">
        <main className="insight-detail-main">
          <div className="insight-detail-thumb" style={{ background: COLOR[insight.category] || "#f3e8f7" }}>
            <span className="insight-detail-emoji">{EMOJI[insight.category] || "📖"}</span>
          </div>

          <div className="insight-detail-meta-row">
            <span className="insights-category-badge">{insight.category}</span>
            <span className="insight-detail-date">{fmtDate(insight.created_at)}</span>
            <div className="insights-meta">
              <Clock size={13} />
              <span>{insight.read_time ? `${insight.read_time}분` : ""} 읽기</span>
            </div>
          </div>

          <h1 className="insight-detail-title">{insight.title}</h1>
          {lead && <p className="insight-detail-lead">{lead}</p>}

          <div className="insight-detail-divider" />

          <div className="insight-detail-body">
            {content.trim().split("\n").map((line, i) => {
              if (line.startsWith("## ")) {
                return <h2 key={i} className="insight-body-h2">{line.replace("## ", "")}</h2>;
              }
              if (line.startsWith("### ")) {
                return <h3 key={i} className="insight-body-h3">{line.replace("### ", "")}</h3>;
              }
              if (line === "---") {
                return <hr key={i} className="insight-body-hr" />;
              }
              if (line.trim() === "") {
                return <div key={i} className="insight-body-space" />;
              }
              return <p key={i} className="insight-body-p">{line}</p>;
            })}
          </div>

          <div className="insight-detail-tags">
            <span className="insight-detail-tag">#{insight.category}</span>
            {(insight.tags || []).map((t, i) => (
              <span key={i} className="insight-detail-tag">#{t}</span>
            ))}
          </div>

          {relatedArticles.length > 0 && (
            <section className="insight-related">
              <h2 className="insight-related-title">관련 아티클</h2>
              <div className="insight-related-grid">
                {relatedArticles.map((item) => (
                  <Link key={item.id} href={`/insights/${item.id}`} className="insights-card insight-related-card">
                    <div className="insights-card-thumb" style={{ background: COLOR[item.category] || "#f3e8f7" }}>
                      <span className="insights-card-emoji">{EMOJI[item.category] || "📖"}</span>
                    </div>
                    <div className="insights-card-body">
                      <span className="insights-category-badge">{item.category}</span>
                      <h3 className="insights-card-title">{item.title}</h3>
                      <div className="insights-card-footer">
                        <span className="insights-card-date">{fmtDate(item.created_at)}</span>
                        <div className="insights-meta">
                          <Clock size={12} />
                          <span>{item.read_time ? `${item.read_time}분` : ""}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="insight-detail-aside">
          <div className="insight-aside-card">
            <h3 className="insight-aside-title">최신 아티클</h3>
            {latest.map((item) => (
              <Link key={item.id} href={`/insights/${item.id}`} className="insight-aside-item">
                <div className="insight-aside-thumb" style={{ background: COLOR[item.category] || "#f3e8f7" }}>
                  <span>{EMOJI[item.category] || "📖"}</span>
                </div>
                <div className="insight-aside-info">
                  <span className="insights-category-badge">{item.category}</span>
                  <p className="insight-aside-item-title">{item.title}</p>
                  <div className="insights-meta">
                    <Clock size={11} />
                    <span>{item.read_time ? `${item.read_time}분` : ""}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="insight-aside-banner">
            <p className="insight-aside-banner-text">뷰티 커리어,<br />지금 시작해보세요</p>
            <Link href="/jobs" className="insight-aside-banner-btn">채용공고 보러가기</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}