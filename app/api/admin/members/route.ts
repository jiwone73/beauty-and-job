"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
import { Search, Trash2 } from "lucide-react";

const STATUS_TO_LABEL: Record<string, string> = {
  ACTIVE: "정상",
  INACTIVE: "휴면",
  SUSPENDED: "정지",
};
const JOB_TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업직",
  STORE: "매장직",
};

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  job_type: string | null;
  status: string;
  kakao_id: string | null;
  naver_id: string | null;
  last_login_at: string | null;
  created_at: string;
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function joinMethod(m: Member) {
  if (m.kakao_id) return "카카오";
  if (m.naver_id) return "네이버";
  return "이메일";
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [joinFilter, setJoinFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMembers(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const changeStatus = async (id: string, newStatus: string) => {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)));
  };

  const toggleStatus = (m: Member) => {
    const next = m.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    changeStatus(m.id, next);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 회원을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/members?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const filtered = members.filter((m) => {
    const matchSearch = !search || m.name?.includes(search) || m.email?.includes(search) || (m.phone || "").includes(search);
    const matchJoin = joinFilter === "전체" || joinMethod(m) === joinFilter;
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[m.status] === statusFilter;
    return matchSearch && matchJoin && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const counts = {
    전체: members.length,
    정상: members.filter((m) => m.status === "ACTIVE").length,
    휴면: members.filter((m) => m.status === "INACTIVE").length,
    정지: members.filter((m) => m.status === "SUSPENDED").length,
  };

  return (
    <AdminLayout activeMenu="members">
      <MemberTabs />

      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">명</span></span>
          </div>
        ))}
      </div>

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
              {["전체", "카카오", "네이버", "이메일"].map((j) => (
                <button key={j} className={`admin-filter-tab ${joinFilter === j ? "active" : ""}`}
                  onClick={() => { setJoinFilter(j); setPage(1); }}>{j}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">계정상태</span>
            <div className="admin-filter-tabs">
              {["전체", "정상", "휴면", "정지"].map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length.toLocaleString()}</strong>명</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>가입일</th>
                <th>이름</th>
                <th>직군</th>
                <th>가입방법</th>
                <th>이메일</th>
                <th>연락처</th>
                <th>최근 로그인</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => {
                const jm = joinMethod(m);
                return (
                  <tr key={m.id}>
                    <td className="admin-td-date">{fmtDate(m.created_at)}</td>
                    <td className="admin-td-brand">{m.name}</td>
                    <td className="admin-td-date">{JOB_TYPE_LABEL[m.job_type || ""] || "-"}</td>
                    <td>
                      {jm === "카카오" ? (
                        <span className="admin-badge" style={{background:"#FEE500", color:"#3A1D1D"}}>카카오</span>
                      ) : jm === "네이버" ? (
                        <span className="admin-badge" style={{background:"#03C75A", color:"#fff"}}>네이버</span>
                      ) : (
                        <span className="admin-badge admin-badge-neutral">이메일</span>
                      )}
                    </td>
                    <td className="admin-td-date">{m.email}</td>
                    <td className="admin-td-date">{m.phone || "-"}</td>
                    <td className="admin-td-date">{fmtDate(m.last_login_at)}</td>
                    <td>
                      {m.status === "SUSPENDED" ? (
                        <span className="admin-badge admin-badge-danger">정지</span>
                      ) : (
                        <div className="admin-toggle-wrap">
                          <label className="admin-toggle">
                            <input type="checkbox" checked={m.status === "ACTIVE"} onChange={() => toggleStatus(m)} />
                            <span className="admin-toggle-slider" />
                          </label>
                          <span className={`admin-toggle-label ${m.status === "ACTIVE" ? "on" : "off"}`}>
                            {STATUS_TO_LABEL[m.status]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <button className="admin-icon-btn" title="삭제" onClick={() => handleDelete(m.id)}
                        style={{color:"#ef4444", background:"none", border:"none", cursor:"pointer"}}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}

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