"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Eye, Trash2, Download, X } from "lucide-react";

const MEMBERS = [
  { id: 1, name: "김지수", type: "개인", joinType: "카카오", email: "jisoo@email.com", phone: "010-1234-5678", job: "마케팅", date: "2025.01.20", status: "정상", lastLogin: "2025.01.20" },
  { id: 2, name: "(주)올리브영", type: "기업", joinType: "일반", email: "hr@oliveyoung.com", phone: "02-1234-5678", job: "-", date: "2025.01.20", status: "정상", lastLogin: "2025.01.19" },
  { id: 3, name: "박민준", type: "개인", joinType: "카카오", email: "minjun@email.com", phone: "010-2345-6789", job: "MD", date: "2025.01.19", status: "정상", lastLogin: "2025.01.18" },
  { id: 4, name: "이수진", type: "개인", joinType: "일반", email: "sujin@email.com", phone: "010-3456-7890", job: "영업", date: "2025.01.19", status: "휴면", lastLogin: "2024.10.01" },
  { id: 5, name: "(주)아모레퍼시픽", type: "기업", joinType: "일반", email: "recruit@amorepacific.com", phone: "02-2345-6789", job: "-", date: "2025.01.18", status: "정상", lastLogin: "2025.01.17" },
  { id: 6, name: "최유나", type: "개인", joinType: "카카오", email: "yuna@email.com", phone: "010-4567-8901", job: "디자인", date: "2025.01.17", status: "정상", lastLogin: "2025.01.17" },
  { id: 7, name: "정다은", type: "개인", joinType: "일반", email: "daeun@email.com", phone: "010-5678-9012", job: "마케팅", date: "2025.01.16", status: "탈퇴", lastLogin: "2025.01.10" },
  { id: 8, name: "(주)LG생활건강", type: "기업", joinType: "일반", email: "hr@lgcare.com", phone: "02-3456-7890", job: "-", date: "2025.01.15", status: "정상", lastLogin: "2025.01.14" },
];

type Member = typeof MEMBERS[0];

export default function AdminMembersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [joinFilter, setJoinFilter] = useState("전체");
  const [members, setMembers] = useState(MEMBERS);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = members.filter((m) => {
    const matchSearch = !search || m.name.includes(search) || m.email.includes(search) || m.phone.includes(search);
    const matchType = true; // 탭으로 구분
    const matchJoin = joinFilter === "전체" || m.joinType === joinFilter;
    const matchStatus = statusFilter === "전체" || m.status === statusFilter;
    return matchSearch && matchType && matchStatus && matchJoin;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const handleStatusChange = (id: number, newStatus: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, status: newStatus } : m));
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      setMembers(members.filter(m => m.id !== id));
      setSelectedMember(null);
    }
  };

  const counts = {
    전체: members.length,
    정상: members.filter(m => m.status === "정상").length,
    휴면: members.filter(m => m.status === "휴면").length,
    탈퇴: members.filter(m => m.status === "탈퇴").length,
  };

  return (
    <AdminLayout activeMenu="members">
      {/* 탭 */}
      <div className="admin-subtabs">
        <a href="/admin/members" className="admin-subtab active">개인회원</a>
        <a href="/admin/members/companies" className="admin-subtab">기업회원</a>
      </div>
      {/* 요약 카드 */}
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count.toLocaleString()}명</span>
          </div>
        ))}
      </div>

      {/* 툴바 */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 이메일, 연락처 검색"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">가입방법</span>
            <div className="admin-filter-tabs">
              {["전체", "카카오", "일반"].map((j) => (
                <button key={j} className={`admin-filter-tab ${joinFilter === j ? "active" : ""}`}
                  onClick={() => { setJoinFilter(j); setPage(1); }}>{j}</button>
              ))}
            </div>
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
        <button className="admin-secondary-btn">
          <Download size={16} /> 엑셀 다운로드
        </button>
      </div>

      {/* 테이블 */}
      <div className="admin-card">
        <div className="admin-table-meta">
          총 <strong>{filtered.length.toLocaleString()}</strong>명
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>가입일</th>
              <th>이름</th>
              <th>유형</th>
              <th>가입방법</th>
              <th>이메일</th>
              <th>연락처</th>
              <th>직군</th>
              <th>최근 로그인</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((m) => (
              <tr key={m.id}>
                <td className="admin-td-date">{m.date}</td>
                <td className="admin-td-brand">{m.name}</td>
                <td>
                  <span className={`admin-badge ${m.type === "기업" ? "admin-badge-info" : "admin-badge-neutral"}`}>
                    {m.type}
                  </span>
                </td>
                <td>
                  {m.joinType === "카카오" ? (
                    <span className="admin-badge" style={{ background: "#FEE500", color: "#3A1D1D" }}>카카오</span>
                  ) : (
                    <span className="admin-badge admin-badge-neutral">일반</span>
                  )}
                </td>
                <td className="admin-td-date">{m.email}</td>
                <td className="admin-td-date">{m.phone}</td>
                <td className="admin-td-date">{m.job}</td>
                <td className="admin-td-date">{m.lastLogin}</td>
                <td>
                  <span className={`admin-badge admin-badge-${
                    m.status === "정상" ? "success" :
                    m.status === "휴면" ? "warning" : "danger"
                  }`}>{m.status}</span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-action-icon" onClick={() => setSelectedMember(m)}>
                      <Eye size={15} />
                    </button>
                    {m.status === "정상" && (
                      <button className="admin-action-btn" style={{ background: "#fef3c7", color: "#92400e" }}
                        onClick={() => handleStatusChange(m.id, "휴면")}>휴면</button>
                    )}
                    {m.status === "휴면" && (
                      <button className="admin-action-btn approve"
                        onClick={() => handleStatusChange(m.id, "정상")}>복구</button>
                    )}
                    <button className="admin-action-icon danger" onClick={() => handleDelete(m.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 페이지네이션 */}
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

      {/* 회원 상세 모달 */}
      {selectedMember && (
        <div className="admin-modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">회원 상세 정보</h2>
              <button className="admin-modal-close" onClick={() => setSelectedMember(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["이름", selectedMember.name],
                  ["유형", selectedMember.type],
                  ["가입방법", selectedMember.joinType],
                  ["이메일", selectedMember.email],
                  ["연락처", selectedMember.phone],
                  ["직군", selectedMember.job],
                  ["가입일", selectedMember.date],
                  ["최근 로그인", selectedMember.lastLogin],
                  ["상태", selectedMember.status],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                {selectedMember.status === "정상" && (
                  <button className="admin-secondary-btn" onClick={() => {
                    handleStatusChange(selectedMember.id, "휴면");
                    setSelectedMember({ ...selectedMember, status: "휴면" });
                  }}>휴면 처리</button>
                )}
                {selectedMember.status === "휴면" && (
                  <button className="admin-primary-btn" onClick={() => {
                    handleStatusChange(selectedMember.id, "정상");
                    setSelectedMember({ ...selectedMember, status: "정상" });
                  }}>계정 복구</button>
                )}
                <button className="admin-danger-btn" onClick={() => handleDelete(selectedMember.id)}>
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
