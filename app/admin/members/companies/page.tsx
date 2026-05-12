"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Eye, Trash2, Download, X } from "lucide-react";

const COMPANIES = [
  { id: 1, name: "(주)올리브영", ceo: "이선정", email: "hr@oliveyoung.com", phone: "02-1234-5678", bizNo: "123-45-67890", size: "1000명+", category: "리테일", date: "2025.01.20", status: "정상", jobs: 12, lastLogin: "2025.01.19" },
  { id: 2, name: "(주)아모레퍼시픽", ceo: "김승환", email: "recruit@amorepacific.com", phone: "02-2345-6789", bizNo: "234-56-78901", size: "1000명+", category: "화장품 브랜드", date: "2025.01.18", status: "정상", jobs: 8, lastLogin: "2025.01.17" },
  { id: 3, name: "(주)LG생활건강", ceo: "이정애", email: "hr@lgcare.com", phone: "02-3456-7890", bizNo: "345-67-89012", size: "1000명+", category: "화장품 브랜드", date: "2025.01.15", status: "정상", jobs: 5, lastLogin: "2025.01.14" },
  { id: 4, name: "(주)에이피알", ceo: "김병훈", email: "hr@apr.com", phone: "02-4567-8901", bizNo: "456-78-90123", size: "300명+", category: "화장품 브랜드", date: "2025.01.10", status: "정상", jobs: 9, lastLogin: "2025.01.09" },
  { id: 5, name: "(주)코스맥스", ceo: "이경수", email: "hr@cosmax.com", phone: "02-5678-9012", bizNo: "567-89-01234", size: "1000명+", category: "ODM", date: "2025.01.08", status: "휴면", jobs: 0, lastLogin: "2024.09.01" },
];

type Company = typeof COMPANIES[0];

export default function AdminCompaniesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [companies, setCompanies] = useState(COMPANIES);
  const [selected, setSelected] = useState<Company | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.includes(search) || c.email.includes(search) || c.bizNo.includes(search);
    const matchStatus = statusFilter === "전체" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleStatusChange = (id: number, newStatus: string) => {
    setCompanies(companies.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      setCompanies(companies.filter(c => c.id !== id));
      setSelected(null);
    }
  };

  const counts = {
    전체: companies.length,
    정상: companies.filter(c => c.status === "정상").length,
    휴면: companies.filter(c => c.status === "휴면").length,
    탈퇴: companies.filter(c => c.status === "탈퇴").length,
  };

  return (
    <AdminLayout activeMenu="members">
      <div className="admin-subtabs">
        <a href="/admin/members" className="admin-subtab">개인회원</a>
        <a href="/admin/members/companies" className="admin-subtab active">기업회원</a>
        <a href="/admin/members/companies/blocked" className="admin-subtab">열람제한기업</a>
        <a href="/admin/members/companies/favorites" className="admin-subtab">관심기업</a>
      </div>
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">개사</span></span>
          </div>
        ))}
      </div>
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="기업명, 이메일, 사업자번호 검색"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">계정상태</span>
            <div className="admin-filter-tabs">
              {["전체", "정상", "휴면", "탈퇴"].map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <button className="admin-secondary-btn"><Download size={16} /> 엑셀 다운로드</button>
      </div>
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>개사</div>
        <table className="admin-table">
          <thead>
            <tr><th>가입일</th><th>기업명</th><th>카테고리</th><th>이메일</th><th>연락처</th><th>사업자번호</th><th>규모</th><th>등록공고</th><th>최근 로그인</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {paginated.map((c) => (
              <tr key={c.id}>
                <td className="admin-td-date">{c.date}</td>
                <td className="admin-td-brand">{c.name}</td>
                <td className="admin-td-date">{c.category}</td>
                <td className="admin-td-date">{c.email}</td>
                <td className="admin-td-date">{c.phone}</td>
                <td className="admin-td-date">{c.bizNo}</td>
                <td className="admin-td-date">{c.size}</td>
                <td className="admin-td-date">{c.jobs}건</td>
                <td className="admin-td-date">{c.lastLogin}</td>
                <td>
                  <span className={`admin-badge admin-badge-${c.status === "정상" ? "success" : c.status === "휴면" ? "warning" : "danger"}`}>
                    {c.status}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon" onClick={() => setSelected(c)}><Eye size={15} /></button>
                    {c.status === "정상" && (
                      <button className="admin-action-btn" style={{ background: "#fef3c7", color: "#92400e" }}
                        onClick={() => handleStatusChange(c.id, "휴면")}>휴면</button>
                    )}
                    {c.status === "휴면" && (
                      <button className="admin-action-btn approve" onClick={() => handleStatusChange(c.id, "정상")}>복구</button>
                    )}
                    <button className="admin-action-icon danger" onClick={() => handleDelete(c.id)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`admin-page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="admin-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>다음</button>
          </div>
        )}
      </div>
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">기업회원 상세 정보</h2>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["기업명", selected.name], ["대표자", selected.ceo],
                  ["카테고리", selected.category], ["이메일", selected.email],
                  ["연락처", selected.phone], ["사업자번호", selected.bizNo],
                  ["기업규모", selected.size], ["등록 공고수", selected.jobs + "건"],
                  ["가입일", selected.date], ["최근 로그인", selected.lastLogin],
                  ["상태", selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                {selected.status === "정상" && (
                  <button className="admin-secondary-btn" onClick={() => { handleStatusChange(selected.id, "휴면"); setSelected({...selected, status:"휴면"}); }}>휴면 처리</button>
                )}
                {selected.status === "휴면" && (
                  <button className="admin-primary-btn" onClick={() => { handleStatusChange(selected.id, "정상"); setSelected({...selected, status:"정상"}); }}>계정 복구</button>
                )}
                <button className="admin-danger-btn" onClick={() => handleDelete(selected.id)}><Trash2 size={15} /> 삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
