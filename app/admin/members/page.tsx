"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
import { Search, Download, Trash2 } from "lucide-react";

const INIT_MEMBERS = [
  { id: 1, name: "김지수", type: "개인", joinType: "카카오", email: "jisoo@email.com", phone: "010-1234-5678", job: "마케팅", date: "2025.01.20", status: "정상", lastLogin: "2025.01.20" },
  { id: 2, name: "(주)올리브영", type: "기업", joinType: "SMS", email: "hr@oliveyoung.com", phone: "02-1234-5678", job: "-", date: "2025.01.20", status: "정상", lastLogin: "2025.01.19" },
  { id: 3, name: "박민준", type: "개인", joinType: "카카오", email: "minjun@email.com", phone: "010-2345-6789", job: "MD", date: "2025.01.19", status: "정상", lastLogin: "2025.01.18" },
  { id: 4, name: "이수진", type: "개인", joinType: "SMS", email: "sujin@email.com", phone: "010-3456-7890", job: "영업", date: "2025.01.19", status: "휴면", lastLogin: "2024.10.01" },
  { id: 5, name: "(주)아모레퍼시픽", type: "기업", joinType: "SMS", email: "recruit@amorepacific.com", phone: "02-2345-6789", job: "-", date: "2025.01.18", status: "정상", lastLogin: "2025.01.17" },
  { id: 6, name: "최유나", type: "개인", joinType: "카카오", email: "yuna@email.com", phone: "010-4567-8901", job: "디자인", date: "2025.01.17", status: "정상", lastLogin: "2025.01.17" },
  { id: 7, name: "정다은", type: "개인", joinType: "SMS", email: "daeun@email.com", phone: "010-5678-9012", job: "마케팅", date: "2025.01.16", status: "탈퇴", lastLogin: "2025.01.10" },
  { id: 8, name: "(주)LG생활건강", type: "기업", joinType: "SMS", email: "hr@lgcare.com", phone: "02-3456-7890", job: "-", date: "2025.01.15", status: "정상", lastLogin: "2025.01.14" },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState(INIT_MEMBERS);
  const pathname = usePathname();
  const isCompanyTab = pathname.includes("companies");
  const [search, setSearch] = useState("");
  const [joinFilter, setJoinFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [checked, setChecked] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const filtered = members.filter((m) => {
    const matchSearch = !search || m.name.includes(search) || m.email.includes(search) || m.phone.includes(search);
    const matchJoin = joinFilter === "전체" || m.joinType === joinFilter;
    const matchStatus = statusFilter === "전체" || m.status === statusFilter;
    const matchType = isCompanyTab ? m.type === "기업" : m.type === "개인";
    return matchSearch && matchJoin && matchStatus && matchType;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleCheck = (id: number) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(m => m.id));

  const handleBulkDelete = () => {
    if (checked.length === 0) return;
    if (confirm(`선택한 ${checked.length}명을 삭제하시겠습니까?`)) {
      setMembers(members.filter(m => !checked.includes(m.id)));
      setChecked([]);
    }
  };

  const toggleStatus = (id: number) => {
    setMembers(members.map(m => {
      if (m.id !== id) return m;
      if (m.status === "정상") return { ...m, status: "휴면" };
      if (m.status === "휴면") return { ...m, status: "정상" };
      return m;
    }));
  };

  const tabMembers = members.filter(m => isCompanyTab ? m.type === "기업" : m.type === "개인");
  const counts = {
    전체: tabMembers.length,
    정상: tabMembers.filter(m => m.status === "정상").length,
    휴면: tabMembers.filter(m => m.status === "휴면").length,
    탈퇴: tabMembers.filter(m => m.status === "탈퇴").length,
  };

  return (
    <AdminLayout activeMenu="members">
      <MemberTabs />

      {/* 요약 카드 */}
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">명</span></span>
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
              {["전체", "카카오", "SMS"].map((j) => (
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
        <div style={{display:"flex", gap:"8px"}}>
          {checked.length > 0 && (
            <button className="admin-danger-btn" onClick={handleBulkDelete}>
              <Trash2 size={15} /> 선택삭제 ({checked.length})
            </button>
          )}
          <button className="admin-secondary-btn"><Download size={16} /> 엑셀 다운로드</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length.toLocaleString()}</strong>명</div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{width:"36px"}}>
                <input type="checkbox"
                  checked={checked.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              <th>가입일</th>
              <th>이름</th>
              <th>유형</th>
              <th>가입방법</th>
              <th>이메일</th>
              <th>연락처</th>
              <th>직군</th>
              <th>최근 로그인</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((m) => (
              <tr key={m.id} style={{background: checked.includes(m.id) ? "#faf5ff" : ""}}>
                <td>
                  <input type="checkbox"
                    checked={checked.includes(m.id)}
                    onChange={() => toggleCheck(m.id)} />
                </td>
                <td className="admin-td-date">{m.date}</td>
                <td className="admin-td-brand">{m.name}</td>
                <td>
                  <span className={`admin-badge ${m.type === "기업" ? "admin-badge-info" : "admin-badge-neutral"}`}>
                    {m.type}
                  </span>
                </td>
                <td>
                  {m.joinType === "카카오" ? (
                    <span className="admin-badge" style={{background:"#FEE500", color:"#3A1D1D"}}>카카오</span>
                  ) : (
                    <span className="admin-badge admin-badge-neutral">SMS</span>
                  )}
                </td>
                <td className="admin-td-date">{m.email}</td>
                <td className="admin-td-date">{m.phone}</td>
                <td className="admin-td-date">{m.job}</td>
                <td className="admin-td-date">{m.lastLogin}</td>
                <td>
                  {m.status === "탈퇴" ? (
                    <span className="admin-badge admin-badge-danger">탈퇴</span>
                  ) : (
                    <div className="admin-toggle-wrap">
                      <label className="admin-toggle">
                        <input
                          type="checkbox"
                          checked={m.status === "정상"}
                          onChange={() => toggleStatus(m.id)}
                        />
                        <span className="admin-toggle-slider" />
                      </label>
                      <span className={`admin-toggle-label ${m.status === "정상" ? "on" : "off"}`}>
                        {m.status}
                      </span>
                    </div>
                  )}
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
    </AdminLayout>
  );
}
