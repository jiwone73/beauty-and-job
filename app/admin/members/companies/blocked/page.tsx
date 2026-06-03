"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
import { Search, Trash2 } from "lucide-react";

const BLOCKED = [
  { id: 1, company: "(주)뷰티코리아", companyId: "beautykorea", member: "김지수", memberId: "jisoo01", date: "2025.01.15", deleted: "N" },
  { id: 2, company: "글로벌코스메틱", companyId: "globalcos", member: "박민준", memberId: "minjun02", date: "2025.01.14", deleted: "N" },
  { id: 3, company: "(주)스킨랩", companyId: "skinlab", member: "이수진", memberId: "sujin03", date: "2025.01.13", deleted: "N" },
  { id: 4, company: "뷰티트렌드", companyId: "beautytrend", member: "최유나", memberId: "yuna04", date: "2025.01.12", deleted: "Y" },
  { id: 5, company: "(주)코스메존", companyId: "cosmezone", member: "정다은", memberId: "daeun05", date: "2025.01.10", deleted: "N" },
];

export default function AdminBlockedCompaniesPage() {
  const [search, setSearch] = useState("");
  const [deletedFilter, setDeletedFilter] = useState("전체");
  const [items, setItems] = useState(BLOCKED);

  const filtered = items.filter((i) => {
    const matchSearch = !search || i.company.includes(search) || i.member.includes(search) || i.companyId.includes(search) || i.memberId.includes(search);
    const matchDeleted = deletedFilter === "전체" || i.deleted === (deletedFilter === "삭제" ? "Y" : "N");
    return matchSearch && matchDeleted;
  });

  return (
    <AdminLayout activeMenu="members-companies">
      <MemberTabs />

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="기업명, 회원명, ID 검색"
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
        <div className="admin-table-meta">총 <strong>{filtered.length.toLocaleString()}</strong>건</div>
        <table className="admin-table">
          <thead>
            <tr><th>수정일</th><th>기업명(ID)</th><th>회원명(ID)</th><th>삭제여부</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-date">{item.date}</td>
                <td className="admin-td-brand">
                  {item.company}<br />
                  <span style={{fontSize:"11px", color:"#aaa"}}>({item.companyId})</span>
                </td>
                <td className="admin-td-date">
                  {item.member}<br />
                  <span style={{fontSize:"11px", color:"#aaa"}}>({item.memberId})</span>
                </td>
                <td>
                  <span className={`admin-badge ${item.deleted === "Y" ? "admin-badge-danger" : "admin-badge-success"}`}>
                    {item.deleted === "Y" ? "삭제" : "미삭제"}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon danger"
                      onClick={() => setItems(items.filter(i => i.id !== item.id))}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="admin-empty">데이터가 없습니다.</div>}
      </div>
    </AdminLayout>
  );
}
