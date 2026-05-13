"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search } from "lucide-react";

const VIEWED = [
  { id: 1, jobTitle: "디지털 마케팅 매니저", company: "올리브영", member: "김지수", memberId: "jisoo01", viewedAt: "2025.01.20 14:32" },
  { id: 2, jobTitle: "글로벌 브랜드 마케터", company: "아모레퍼시픽", member: "박민준", memberId: "minjun02", viewedAt: "2025.01.19 11:15" },
  { id: 3, jobTitle: "퍼포먼스 마케터", company: "에이피알", member: "최유나", memberId: "yuna04", viewedAt: "2025.01.18 16:44" },
  { id: 4, jobTitle: "브랜드 콘텐츠 기획자", company: "닥터자르트", member: "정다은", memberId: "daeun05", viewedAt: "2025.01.17 09:23" },
];

export default function AdminJobsViewedPage() {
  const [search, setSearch] = useState("");
  const filtered = VIEWED.filter(i => !search || i.jobTitle.includes(search) || i.member.includes(search));

  return (
    <AdminLayout activeMenu="jobs-viewed">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명, 회원명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="admin-table">
          <thead>
            <tr><th>열람일시</th><th>공고명</th><th>기업</th><th>회원명(ID)</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-date">{item.viewedAt}</td>
                <td className="admin-td-title">{item.jobTitle}</td>
                <td className="admin-td-brand">{item.company}</td>
                <td className="admin-td-date">{item.member}<br/><span style={{fontSize:"11px",color:"#aaa"}}>({item.memberId})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
