"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
import { Search, Trash2 } from "lucide-react";

const JOB_TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업사무직",
  STORE: "매장기술직",
};

const STATUS_TO_LABEL: Record<string, string> = {
  ACTIVE: "정상",
  INACTIVE: "휴면",
  SUSPENDED: "정지",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

type Member = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_type: string | null;
  status: string;
  kakao_id: string | null;
  last_login_at: string | null;
  created_at: string;
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [checked, setChecked] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMembers(data.success ? data.data.items : []);
    } catch (e) {
      console.error("[fetchMembers]", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const changeStatus = async (id: string, status: string) => {
    await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 회원을 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/members?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setChecked((prev) => prev.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}명을 삭제하시겠습니까?`)) return;
    await Promise.all(checked.map((id) =>
      fetch(`/api/admin/members?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    ));
    setMembers((prev) => prev.filter((m) => !checked.includes(m.id)));
    setChecked([]);
  };

  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.name?.includes(search) ||
      (m.email || "").includes(search) ||
      (m.phone || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[m.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleCheck = (id: string) =>
    setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  const toggleAll = () =>
    setChecked(checked.length === filtered.length ? [] : filtered.map((m) => m.id));

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
            <span className="admin-filter-label">계정상태</span>
            <div className="admin-filter-tabs">
              {["전체", "정상", "휴면", "정지"].map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {checked.length > 0 && (
            <button className="admin-danger-btn" onClick={handleBulkDelete}>
              <Trash2 size={15} /> 선택삭제 ({checked.length})
            </button>
          )}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length.toLocaleString()}</strong>명</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">검색 결과가 없습니다.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}>
                  <input type="checkbox"
                    checked={checked.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll} />
                </th>
                <th>가입일</th>
                <th>이름</th>
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
                <tr key={m.id} style={{ background: checked.includes(m.id) ? "#faf5ff" : "" }}>
                  <td>
                    <input type="checkbox"
                      checked={checked.includes(m.id)}
                      onChange={() => toggleCheck(m.id)} />
                  </td>
                  <td className="admin-td-date">{fmtDate(m.created_at)}</td>
                  <td className="admin-td-brand">{m.name}</td>
                  <td>
                    {m.kakao_id ? (
                      <span className="admin-badge" style={{ background: "#FEE500", color: "#3A1D1D" }}>카카오</span>
                    ) : (
                      <span className="admin-badge admin-badge-neutral">이메일</span>
                    )}
                  </td>
                  <td className="admin-td-date">{m.email || "-"}</td>
                  <td className="admin-td-date">{m.phone || "-"}</td>
                  <td className="admin-td-date">{JOB_TYPE_LABEL[m.job_type || ""] || "-"}</td>
                  <td className="admin-td-date">{fmtDate(m.last_login_at)}</td>
                  <td>
                    <select
                      className={`admin-status-select admin-status-${
                        m.status === "ACTIVE" ? "success" :
                        m.status === "SUSPENDED" ? "danger" : "warning"
                      }`}
                      value={m.status}
                      onChange={(e) => changeStatus(m.id, e.target.value)}
                    >
                      <option value="ACTIVE">정상</option>
                      <option value="INACTIVE">휴면</option>
                      <option value="SUSPENDED">정지</option>
                    </select>
                  </td>
                  <td>
                    <button className="admin-danger-btn" style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => handleDelete(m.id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`admin-page-btn ${page === p ? "active" : ""}`}
                onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="admin-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>다음</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}