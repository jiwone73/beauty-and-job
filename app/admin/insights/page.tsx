"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Plus, Edit, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

const INSIGHTS_DATA = [
  { id: 1, title: "2025 뷰티 업계를 뒤흔들 10가지 트렌드", category: "트렌드", date: "2025.01.20", views: 1234, status: "게시중" },
  { id: 2, title: "뷰티 MD가 되기 위한 5가지 필수 역량", category: "커리어", date: "2025.01.17", views: 987, status: "게시중" },
  { id: 3, title: "뷰티 업계 직무별 연봉 리포트 2025", category: "연봉정보", date: "2025.01.15", views: 2341, status: "게시중" },
  { id: 4, title: "아누아는 어떻게 틱톡에서 글로벌 브랜드가 됐나", category: "브랜드스토리", date: "2025.01.12", views: 756, status: "게시중" },
  { id: 5, title: "뷰티 회사 면접, 이것만 알면 합격한다", category: "취업팁", date: "2025.01.10", views: 1567, status: "임시저장" },
];

export default function AdminInsightsPage() {
  const router = useRouter();
  const [insights, setInsights] = useState(INSIGHTS_DATA);
  const [selected, setSelected] = useState<typeof INSIGHTS_DATA[0] | null>(null);
  const [checked, setChecked] = useState<number[]>([]);

  const toggleCheck = (id: number) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(i => i.id));
  const handleBulkDelete = () => {
    if (!checked.length) return;
    if (confirm(`선택한 ${checked.length}건을 삭제하시겠습니까?`)) {
      setInsights(insights.filter(i => !checked.includes(i.id)));
      setChecked([]);
    }
  };
  const [search, setSearch] = useState("");

  const filtered = insights.filter(i => !search || i.title.includes(search));

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
          {checked.length > 0 && (
            <button className="admin-danger-btn" onClick={handleBulkDelete}>
              <Trash2 size={15} /> 선택삭제 ({checked.length})
            </button>
          )}
          <button className="admin-primary-btn" onClick={() => router.push("/admin/insights/new")}>
            <Plus size={16} /> 글 작성
          </button>
        </div>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{width:"36px"}}>
                <input type="checkbox"
                  checked={checked.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              <th>제목</th><th>카테고리</th><th>작성일</th><th>조회수</th><th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} style={{background: checked.includes(item.id) ? "#faf5ff" : ""}}>
                <td>
                  <input type="checkbox"
                    checked={checked.includes(item.id)}
                    onChange={() => toggleCheck(item.id)} />
                </td>
                <td>
                  <span className="admin-td-title"
                    style={{color:"#5f0080", cursor:"pointer", fontWeight:600}}
                    onClick={() => setSelected(item)}>
                    {item.title}
                  </span>
                </td>
                <td><span className="admin-badge admin-badge-neutral">{item.category}</span></td>
                <td className="admin-td-date">{item.date}</td>
                <td className="admin-td-date">{item.views.toLocaleString()}</td>
                <td><span className={`admin-badge ${item.status === "게시중" ? "admin-badge-success" : "admin-badge-warning"}`}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"600px"}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="admin-badge admin-badge-neutral" style={{marginBottom:"6px", display:"inline-block"}}>{selected.category}</span>
                <h2 className="admin-modal-title">{selected.title}</h2>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["카테고리", selected.category],
                  ["작성일", selected.date],
                  ["조회수", selected.views.toLocaleString() + "회"],
                  ["상태", selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                <button className="admin-primary-btn" onClick={() => { router.push("/admin/insights/new"); setSelected(null); }}>
                  <Edit size={15} /> 수정하기
                </button>
                <button className="admin-danger-btn" onClick={() => {
                  if (confirm("삭제하시겠습니까?")) {
                    setInsights(insights.filter(i => i.id !== selected.id));
                    setSelected(null);
                  }
                }}><Trash2 size={15} /> 삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
