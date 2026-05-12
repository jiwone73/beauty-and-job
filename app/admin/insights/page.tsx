"use client";
import { useState } from "react";
import { AdminLayout } from "../page";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
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
        <button className="admin-primary-btn" onClick={() => router.push("/admin/insights/new")}>
          <Plus size={16} /> 글 작성
        </button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr><th>제목</th><th>카테고리</th><th>작성일</th><th>조회수</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-title">{item.title}</td>
                <td><span className="admin-badge admin-badge-neutral">{item.category}</span></td>
                <td className="admin-td-date">{item.date}</td>
                <td className="admin-td-date">{item.views.toLocaleString()}</td>
                <td><span className={`admin-badge ${item.status === "게시중" ? "admin-badge-success" : "admin-badge-warning"}`}>{item.status}</span></td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon"><Edit size={15} /></button>
                    <button className="admin-action-icon danger" onClick={() => setInsights(insights.filter(i => i.id !== item.id))}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
