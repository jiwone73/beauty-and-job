"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2 } from "lucide-react";

const SCRAPPED = [
  { id: 1, jobTitle: "디지털 마케팅 매니저", company: "올리브영", member: "김지수", memberId: "jisoo01", date: "2025.01.20", deleted: "N" },
  { id: 2, jobTitle: "글로벌 브랜드 마케터", company: "아모레퍼시픽", member: "박민준", memberId: "minjun02", date: "2025.01.19", deleted: "N" },
  { id: 3, jobTitle: "e커머스 MD", company: "LG생활건강", member: "최유나", memberId: "yuna04", date: "2025.01.18", deleted: "Y" },
  { id: 4, jobTitle: "퍼포먼스 마케터", company: "에이피알", member: "정다은", memberId: "daeun05", date: "2025.01.17", deleted: "N" },
];

export default function AdminJobsScrappedPage() {
  const [search, setSearch] = useState("");
  const [deletedFilter, setDeletedFilter] = useState("전체");
  const [items, setItems] = useState(SCRAPPED);

  const filtered = items.filter(i => {
    const matchSearch = !search || i.jobTitle.includes(search) || i.member.includes(search) || i.company.includes(search);
    const matchDeleted = deletedFilter === "전체" || i.deleted === (deletedFilter === "삭제" ? "Y" : "N");
    return matchSearch && matchDeleted;
  });

  return (
    <AdminLayout activeMenu="jobs-scrapped">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명, 회원명, 기업명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">삭제여부</span>
            <div className="admin-filter-tabs">
              {["전체", "미삭제", "삭제"].map((s) => (
                <button key={s} className={`admin-filter-tab ${deletedFilter === s ? "active" : ""}`}
                  onClick={() => setDeletedFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="admin-table">
          <thead>
            <tr><th>스크랩일</th><th>공고명</th><th>기업</th><th>회원명(ID)</th><th>삭제여부</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-date">{item.date}</td>
                <td className="admin-td-title">{item.jobTitle}</td>
                <td className="admin-td-brand">{item.company}</td>
                <td className="admin-td-date">{item.member}<br/><span style={{fontSize:"11px",color:"#aaa"}}>({item.memberId})</span></td>
                <td><span className={`admin-badge ${item.deleted === "Y" ? "admin-badge-danger" : "admin-badge-success"}`}>{item.deleted === "Y" ? "삭제" : "미삭제"}</span></td>
                <td><button className="admin-action-icon danger" onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
