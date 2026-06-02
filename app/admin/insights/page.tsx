"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Insight = {
  id: string;
  title: string;
  category: string | null;
  content: string | null;
  tags: string[];
  read_time: number | null;
  status: string;
  view_count: number;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "게시중",
  DRAFT: "임시저장",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function AdminInsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Insight | null>(null);
  const [search, setSearch] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/insights", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInsights(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/insights?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setInsights((prev) => prev.filter((i) => i.id !== id));
    setSelected(null);
  };

  const toggleStatus = async (item: Insight) => {
    const next = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch("/api/admin/insights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: item.id, status: next }),
    });
    setInsights((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    if (selected?.id === item.id) setSelected((p) => (p ? { ...p, status: next } : p));
  };

  const filtered = insights.filter((i) => !search || (i.title || "").includes(search));

  return (
    <AdminLayout activeMenu="insights">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="제목 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{display:"flex", gap:"8px"}}>
          <button className="admin-primary-btn" onClick={() => router.push("/admin/insights/new")}>
            <Plus size={16} /> 글 작성
          </button>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>제목</th><th>카테고리</th><th>작성일</th><th>조회수</th><th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="admin-td-title"
                      style={{color:"#5f0080", cursor:"pointer", fontWeight:600}}
                      onClick={() => setSelected(item)}>
                      {item.title}
                    </span>
                  </td>
                  <td><span className="admin-badge admin-badge-neutral">{item.category || "-"}</span></td>
                  <td className="admin-td-date">{fmtDate(item.created_at)}</td>
                  <td className="admin-td-date">{(item.view_count || 0).toLocaleString()}</td>
                  <td>
                    <span
                      className={`admin-badge ${item.status === "PUBLISHED" ? "admin-badge-success" : "admin-badge-warning"}`}
                      style={{cursor:"pointer"}}
                      onClick={() => toggleStatus(item)}
                      title="클릭하여 상태 전환"
                    >
                      {STATUS_LABEL[item.status] || item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">작성된 글이 없습니다.</div>}
      </div>
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"600px"}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="admin-badge admin-badge-neutral" style={{marginBottom:"6px", display:"inline-block"}}>{selected.category || "-"}</span>
                <h2 className="admin-modal-title">{selected.title}</h2>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["카테고리", selected.category || "-"],
                  ["작성일", fmtDate(selected.created_at)],
                  ["조회수", (selected.view_count || 0).toLocaleString() + "회"],
                  ["읽기시간", selected.read_time ? selected.read_time + "분" : "-"],
                  ["상태", STATUS_LABEL[selected.status] || selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
                {(selected.tags || []).length > 0 && (
                  <div className="admin-detail-row">
                    <span className="admin-detail-label">태그</span>
                    <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                      {selected.tags.map((t, i) => <span key={i} className="admin-resume-tag">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
              {selected.content && (
                <div style={{marginTop:"12px", padding:"12px", background:"#faf8fc", borderRadius:"8px", fontSize:"13px", lineHeight:"1.7", whiteSpace:"pre-wrap", maxHeight:"200px", overflow:"auto"}}>
                  {selected.content}
                </div>
              )}
              <div className="admin-modal-actions">
                <button className="admin-danger-btn" onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}