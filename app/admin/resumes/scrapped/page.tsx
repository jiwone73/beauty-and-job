"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeTabs from "@/components/admin/ResumeTabs";
import { Search, Trash2 } from "lucide-react";

const SCRAPPED = [
  { id: 1, resumeName: "김지수", resumeTitle: "뷰티 브랜드 마케터", company: "(주)올리브영", scrapper: "hr@oliveyoung.com", date: "2025.01.20", deleted: "N" },
  { id: 2, resumeName: "박민준", resumeTitle: "글로벌 뷰티 MD 전문가", company: "아모레퍼시픽", scrapper: "recruit@amore.com", date: "2025.01.19", deleted: "N" },
  { id: 3, resumeName: "최유나", resumeTitle: "뷰티 패키지 디자이너", company: "LG생활건강", scrapper: "hr@lgcare.com", date: "2025.01.18", deleted: "Y" },
  { id: 4, resumeName: "한소희", resumeTitle: "뷰티 SCM 물류 전문가", company: "코스맥스", scrapper: "hr@cosmax.com", date: "2025.01.17", deleted: "N" },
];

export default function AdminScrappedPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState(SCRAPPED);

  const filtered = items.filter(i => !search || i.resumeName.includes(search) || i.company.includes(search));

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
            <tr><th>스크랩일</th><th>이력서</th><th>스크랩 기업</th><th>담당자</th><th>삭제여부</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="admin-td-date">{item.date}</td>
                <td>
                  <div>
                    <strong>{item.resumeName}</strong>
                    <p style={{fontSize:"12px",color:"#888",margin:"2px 0 0"}}>{item.resumeTitle}</p>
                  </div>
                </td>
                <td className="admin-td-brand">{item.company}</td>
                <td className="admin-td-date">{item.scrapper}</td>
                <td>
                  <span className={`admin-badge ${item.deleted === "Y" ? "admin-badge-danger" : "admin-badge-success"}`}>
                    {item.deleted === "Y" ? "삭제" : "미삭제"}
                  </span>
                </td>
                <td>
                  <button className="admin-action-icon danger"
                    onClick={() => setItems(items.filter(i => i.id !== item.id))}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
