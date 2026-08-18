"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, RefreshCw, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

type Lead = {
  link: string; title: string; summary: string | null;
  cafe_name: string | null; cafe_url: string | null; keyword: string | null;
  status: "NEW" | "DONE" | "SKIP"; skip_reason: string | null;
  job_id: string | null; first_seen_at: string;
};

const TABS: { key: string; label: string }[] = [
  { key: "NEW", label: "확인 전" },
  { key: "DONE", label: "등록완료" },
  { key: "SKIP", label: "제외" },
  { key: "ALL", label: "전체" },
];

export default function CafeLeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("NEW");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [msg, setMsg] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const load = (status = tab) => {
    setLoading(true);
    fetch(`/api/admin/cafe-leads?status=${status}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) { setItems(res.data.items); setCounts(res.data.counts); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(tab); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  // 지금 바로 한 번 모으기. 정기 수집은 매일 밤 크론이 한다.
  const collectNow = async () => {
    setCollecting(true); setMsg("");
    try {
      const res = await fetch("/api/admin/cafe-leads", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setMsg(d.success ? `조회 ${d.data.found}건 · 새 글 ${d.data.added}건` : (d.error?.message || "수집 실패"));
      load(tab);
    } finally { setCollecting(false); }
  };

  const setStatus = async (link: string, status: string, skip_reason?: string) => {
    await fetch("/api/admin/cafe-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ link, status, skip_reason }),
    });
    setItems((prev) => (tab === "ALL" ? prev.map((p) => (p.link === link ? { ...p, status: status as any } : p)) : prev.filter((p) => p.link !== link)));
    setCounts((c) => ({ ...c }));
  };

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((p) => `${p.title} ${p.summary} ${p.cafe_name}`.toLowerCase().includes(k));
  }, [items, q]);

  const fmt = (s: string) => { try { return new Date(s).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }); } catch { return ""; } };

  return (
    <AdminLayout activeMenu="jobs-cafe">
      <div style={{ padding: "4px 4px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: "#2b2533", margin: 0 }}>카페 구인글</h1>
          <span style={{ fontSize: 14, color: "#9a92a6" }}>
            확인 전 {counts.NEW || 0} · 등록완료 {counts.DONE || 0} · 제외 {counts.SKIP || 0}
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: "#9a92a6", margin: "0 0 14px" }}>
          네이버 카페에서 매일 밤 자동으로 모읍니다. 개인 매장 공고는 채용 사이트가 아니라 지역 카페·직종 커뮤니티에 올라와요.
          <b> 원문</b>을 열어 내용을 확인한 뒤 <b>등록</b>으로 옮기고, 아니면 <b>제외</b>하세요.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "6px 14px", borderRadius: 999, fontSize: 13,
                border: tab === t.key ? "none" : "1px solid #e5e0eb",
                background: tab === t.key ? "#5f0080" : "#fff", color: tab === t.key ? "#fff" : "#6b6473", cursor: "pointer" }}>
              {t.label}{t.key !== "ALL" && counts[t.key] ? ` ${counts[t.key]}` : ""}
            </button>
          ))}
          <div className="admin-search-wrap" style={{ width: 260, marginLeft: 4 }}>
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="제목·카페 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button onClick={collectNow} disabled={collecting}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            <RefreshCw size={14} /> {collecting ? "모으는 중…" : "지금 모으기"}
          </button>
        </div>
        {msg && <div style={{ fontSize: 13, color: "#5f0080", marginBottom: 10 }}>{msg}</div>}

        {loading ? (
          <div style={{ color: "#9a92a6", padding: 30 }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#9a92a6", padding: 30, border: "1px dashed #e5e0eb", borderRadius: 10, textAlign: "center" }}>
            {tab === "NEW" ? "확인할 글이 없어요. 오늘 밤 다시 모입니다." : "해당하는 글이 없어요."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((p) => (
              <div key={p.link} style={{ border: "1px solid #ece7f1", background: p.status === "SKIP" ? "#fafafa" : "#fff", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14.5, color: p.status === "SKIP" ? "#b3adbd" : "#2b2533", minWidth: 0, flex: 1 }}>{p.title}</span>
                  {p.status === "DONE" && <span style={{ fontSize: 12, color: "#0a7d34", flexShrink: 0 }}>등록완료</span>}
                  {p.status === "SKIP" && <span style={{ fontSize: 12, color: "#9a92a6", flexShrink: 0 }}>제외{p.skip_reason ? ` · ${p.skip_reason}` : ""}</span>}
                  <span style={{ fontSize: 12, color: "#b3adbd", flexShrink: 0 }}>{fmt(p.first_seen_at)}</span>
                </div>
                {p.summary && (
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b6473", lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.summary}</p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#9a92a6", background: "#f6f3fa", borderRadius: 6, padding: "2px 8px" }}>{p.cafe_name}</span>
                  <a href={p.link} target="_blank" rel="noreferrer"
                    style={{ fontSize: 13, color: "#5f0080", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    원문 <ExternalLink size={12} />
                  </a>
                  {p.status !== "DONE" && (
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <Link href={`/admin/jobs/new?url=${encodeURIComponent(p.link)}`} target="_blank"
                        style={{ padding: "6px 12px", borderRadius: 6, background: "#5f0080", color: "#fff", fontSize: 13, textDecoration: "none" }}>등록</Link>
                      {p.status !== "SKIP" && (
                        <button onClick={() => setStatus(p.link, "SKIP", "확인 후 제외")}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e0eb", background: "#fff", color: "#6b6473", fontSize: 13, cursor: "pointer" }}>제외</button>
                      )}
                      {p.status === "SKIP" && (
                        <button onClick={() => setStatus(p.link, "NEW")}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e0eb", background: "#fff", color: "#6b6473", fontSize: 13, cursor: "pointer" }}>되돌리기</button>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
