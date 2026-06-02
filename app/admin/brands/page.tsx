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
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = { OFFICE: "기업", STORE: "매장", BOTH: "기업·매장" };
const STATUS_LABEL: Record<string, string> = { PENDING: "승인대기", ACTIVE: "정상", SUSPENDED: "정지", REJECTED: "반려" };
const STATUS_BADGE: Record<string, string> = { PENDING: "admin-badge-warning", ACTIVE: "admin-badge-success", SUSPENDED: "admin-badge-danger", REJECTED: "admin-badge-neutral" };

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const handleDelete = async (b: Brand) => {
    if (!confirm(`'${b.brand_name || b.company_name}'을(를) 삭제하면 관련 채용공고·지원 내역도 함께 삭제됩니다. 계속할까요?`)) return;
    await fetch(`/api/admin/companies?id=${b.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBrands((prev) => prev.filter((x) => x.id !== b.id));
  };

  const filtered = brands.filter((b) =>
    !search || (b.brand_name || "").includes(search) || (b.company_name || "").includes(search)
  );

  return (
    <AdminLayout activeMenu="brands">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="브랜드명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <tr><th>브랜드명</th><th>유형</th><th>채용공고</th><th>등록일</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="admin-td-brand">{b.brand_name || b.company_name}</td>
                  <td className="admin-td-date">{TYPE_LABEL[b.company_type] || b.company_type}</td>
                  <td className="admin-td-date">{b.job_count}건</td>
                  <td className="admin-td-date">{fmtDate(b.created_at)}</td>
                  <td><span className={`admin-badge ${STATUS_BADGE[b.status] || "admin-badge-neutral"}`}>{STATUS_LABEL[b.status] || b.status}</span></td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-action-icon danger" onClick={() => handleDelete(b)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">등록된 브랜드가 없습니다.</div>}
      </div>
    </AdminLayout>
  );
}