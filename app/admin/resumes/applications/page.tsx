"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeTabs from "@/components/admin/ResumeTabs";
import { Search } from "lucide-react";

const APPLICATIONS = [
  { id: 1, applicant: "김지수", job: "마케팅", company: "(주)올리브영", position: "디지털 마케팅 매니저", date: "2025.01.20", status: "서류검토중" },
  { id: 2, applicant: "박민준", job: "MD", company: "아모레퍼시픽", position: "글로벌 브랜드 마케터", date: "2025.01.19", status: "면접예정" },
  { id: 3, applicant: "최유나", job: "디자인", company: "에이피알", position: "퍼포먼스 마케터", date: "2025.01.18", status: "합격" },
  { id: 4, applicant: "정다은", job: "마케팅", company: "닥터자르트", position: "브랜드 콘텐츠 기획자", date: "2025.01.17", status: "불합격" },
  { id: 5, applicant: "한소희", job: "SCM", company: "코스맥스", position: "화장품 연구원", date: "2025.01.16", status: "서류검토중" },
];

const STATUS_COLOR: Record<string, string> = {
  "서류검토중": "admin-badge-warning",
  "면접예정": "admin-badge-info",
  "합격": "admin-badge-success",
  "불합격": "admin-badge-danger",
};

export default function AdminApplicationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const filtered = APPLICATIONS.filter(a => {
    const matchSearch = !search || a.applicant.includes(search) || a.company.includes(search) || a.position.includes(search);
    const matchStatus = statusFilter === "전체" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout activeMenu="resumes">
      <ResumeTabs />
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="지원자, 기업명, 포지션 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">지원상태</span>
            <div className="admin-filter-tabs">
              {["전체", "서류검토중", "면접예정", "합격", "불합격"].map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="admin-table">
          <thead>
            <tr><th>지원일</th><th>지원자</th><th>직군</th><th>기업</th><th>포지션</th><th>상태</th></tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="admin-td-date">{a.date}</td>
                <td className="admin-td-brand">{a.applicant}</td>
                <td className="admin-td-date">{a.job}</td>
                <td className="admin-td-brand">{a.company}</td>
                <td className="admin-td-title">{a.position}</td>
                <td><span className={`admin-badge ${STATUS_COLOR[a.status]}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
