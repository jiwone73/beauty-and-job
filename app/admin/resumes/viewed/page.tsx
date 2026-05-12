"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeTabs from "@/components/admin/ResumeTabs";
import { Search } from "lucide-react";

const VIEWED = [
  { id: 1, resumeName: "김지수", resumeTitle: "뷰티 브랜드 마케터", company: "(주)올리브영", viewer: "hr@oliveyoung.com", date: "2025.01.20", viewedAt: "2025.01.20 14:32" },
  { id: 2, resumeName: "박민준", resumeTitle: "글로벌 뷰티 MD 전문가", company: "아모레퍼시픽", viewer: "recruit@amore.com", date: "2025.01.19", viewedAt: "2025.01.19 11:15" },
  { id: 3, resumeName: "최유나", resumeTitle: "뷰티 패키지 디자이너", company: "에이피알", viewer: "hr@apr.com", date: "2025.01.18", viewedAt: "2025.01.18 16:44" },
  { id: 4, resumeName: "정다은", resumeTitle: "디지털 마케터 정다은", company: "닥터자르트", viewer: "hr@drjart.com", date: "2025.01.17", viewedAt: "2025.01.17 09:23" },
];

export default function AdminViewedPage() {
  const [search, setSearch] = useState("");
  const filtered = VIEWED.filter(i => !search || i.resumeName.includes(search) || i.company.includes(search));

  return (
    <AdminLayout activeMenu="resumes">
      <ResumeTabs />
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 기업명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="admin-table">
          <thead>
            <tr><th>열람일시</th><th>이력서</th><th>열람 기업</th><th>담당자</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-date">{item.viewedAt}</td>
                <td>
                  <div>
                    <strong>{item.resumeName}</strong>
                    <p style={{fontSize:"12px",color:"#888",margin:"2px 0 0"}}>{item.resumeTitle}</p>
                  </div>
                </td>
                <td className="admin-td-brand">{item.company}</td>
                <td className="admin-td-date">{item.viewer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
