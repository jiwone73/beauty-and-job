"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Trash2 } from "lucide-react";

type Brand = {
  id: string;
  company_name: string;
  brand_name: string | null;
  company_type: string;
  status: string;
  job_count: number;
  business_license_url: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = { OFFICE: "기업", STORE: "매장", BOTH: "기업·매장" };
const STATUS_LABEL: Record<string, string> = { PENDING: "승인대기", ACTIVE: "정상", SUSPENDED: "정지", REJECTED: "반려" };
const STATUS_BADGE: Record<string, string> = { PENDING: "admin-badge-warning", ACTIVE: "admin-badge-success", SUSPENDED: "admin-badge-danger", REJECTED: "admin-badge-neutral" };
const STATUS_FILTERS = ["전체", "승인대기", "정상", "정지", "반려"];

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBrands(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const changeStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (data.success) {
      setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } else {
      alert(data.error?.message || "상태 변경에 실패했습니다.");
    }
  };

  const approve = (b: Brand) => {
    if (confirm(`'${b.brand_name || b.company_name}'을(를) 승인할까요?\n승인 후 로그인·공고 등록이 가능해집니다.`)) {
      changeStatus(b.id, "ACTIVE");
    }
  };
  const reject = (b: Brand) => {
    if (confirm(`'${b.brand_name || b.company_name}'을(를) 반려할까요?`)) {
      changeStatus(b.id, "REJECTED");
    }
  };

  const handleDelete = async (b: Brand) => {
    if (!confirm(`'${b.brand_name || b.company_name}'을(를) 삭제하면 관련 채용공고·지원 내역도 함께 삭제됩니다. 계속할까요?`)) return;
    await fetch(`/api/admin/companies?id=${b.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBrands((prev) => prev.filter((x) => x.id !== b.id));
  };

  const filtered = brands.filter((b) => {
    const matchSearch = !search || (b.brand_name || "").includes(search) || (b.company_name || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_LABEL[b.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    전체: brands.length,
    승인대기: brands.filter((b) => b.status === "PENDING").length,
    정상: brands.filter((b) => b.status === "ACTIVE").length,
    정지: brands.filter((b) => b.status === "SUSPENDED").length,
    반려: brands.filter((b) => b.status === "REJECTED").length,
  };

  return (
    <AdminLayout activeMenu="brands">
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">개</span></span>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="브랜드명, 회사명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">상태</span>
            <div className="admin-filter-tabs">
              {STATUS_FILTERS.map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>
                  {s}
                  {s === "승인대기" && counts.승인대기 > 0 && (
                    <span className="admin-filter-count">{counts.승인대기}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>개</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>브랜드명</th><th>유형</th><th>채용공고</th><th>등록일</th><th>사업자등록증</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ background: b.status === "PENDING" ? "#fffbeb" : "" }}>
                  <td className="admin-td-brand">{b.brand_name || b.company_name}</td>
                  <td className="admin-td-date">{TYPE_LABEL[b.company_type] || b.company_type}</td>
                  <td className="admin-td-date">{b.job_count}건</td>
                  <td className="admin-td-date">{fmtDate(b.created_at)}</td>
                  <td>
                    {b.business_license_url ? (
                      <button
                        onClick={() => window.open(b.business_license_url!, "_blank")}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        등록증 보기
                      </button>
                    ) : (
                      <span style={{ color: "#bbb", fontSize: 14 }}>없음</span>
                    )}
                  </td>
                  <td><span className={`admin-badge ${STATUS_BADGE[b.status] || "admin-badge-neutral"}`}>{STATUS_LABEL[b.status] || b.status}</span></td>
                  <td>
                    <div className="admin-actions" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {b.status === "PENDING" ? (
                        <>
                          <button onClick={() => approve(b)}
                            style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            승인
                          </button>
                          <button onClick={() => reject(b)}
                            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #d6d6d6", background: "#fff", color: "#666", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                            반려
                          </button>
                        </>
                      ) : (
                        <select
                          className={`admin-status-select admin-status-${
                            b.status === "ACTIVE" ? "success" : b.status === "SUSPENDED" ? "danger" : "warning"
                          }`}
                          value={b.status}
                          onChange={(e) => changeStatus(b.id, e.target.value)}
                        >
                          <option value="ACTIVE">정상</option>
                          <option value="SUSPENDED">정지</option>
                          <option value="REJECTED">반려</option>
                        </select>
                      )}
                      <button className="admin-action-icon danger" onClick={() => handleDelete(b)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">조건에 맞는 기업이 없습니다.</div>}
      </div>
    </AdminLayout>
  );
}