"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
import Link from "next/link";
import { Search, Trash2, X } from "lucide-react";

const STATUS_TO_LABEL: Record<string, string> = {
  PENDING: "승인대기",
  ACTIVE: "승인완료",
  SUSPENDED: "정지",
  REJECTED: "반려",
};
const TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업",
  STORE: "매장",
  BOTH: "기업+매장",
};
const STATUS_OPTIONS = ["전체", "승인대기", "승인완료", "정지", "반려"];

type Job = { title: string; status: string; created_at: string };
type Company = {
  id: string;
  company_name: string;
  brand_name: string | null;
  business_number: string | null;
  company_type: string;
  cover_images: any;
  email: string;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  address: string | null;
  business_license_url: string | null;
  status: string;
  created_at: string;
  job_count: number;
  jobs: Job[];
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

const isPdf = (u: string) => u.split("?")[0].toLowerCase().endsWith(".pdf");

function AdminCompaniesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") === "pending" ? "승인대기" : "전체";
  // 대시보드 카드에서 넘어온 초기 필터
  const typeParam = searchParams.get("type");
  const initialType =
    typeParam === "STORE" ? "매장" :
    typeParam === "OFFICE" ? "기업" :
    typeParam === "BOTH" ? "기업+매장" : "전체";
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCompanies(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const changeStatus = async (id: string, newStatus: string) => {
    await fetch("/api/admin/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
  };

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개 기업을 삭제하시겠습니까?\n등록된 공고·지원 내역도 함께 삭제됩니다.`)) return;
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/admin/companies?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    setCompanies((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  const isToday = (d: string | null) => {
    if (!d) return false;
    const dt = new Date(d); const now = new Date();
    return dt.getFullYear() === now.getFullYear()
      && dt.getMonth() === now.getMonth()
      && dt.getDate() === now.getDate();
  };

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.company_name?.includes(search) || c.email?.includes(search) || (c.business_number || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[c.status] === statusFilter;
    const matchType = typeFilter === "전체" || TYPE_LABEL[c.company_type] === typeFilter;
    const matchDate = dateFilter === "전체" || isToday(c.created_at);
    return matchSearch && matchStatus && matchType && matchDate;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const allPageSelected = paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id));
  const toggleAllPage = () => {
    const pageIds = paginated.map((c) => c.id);
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const counts = {
    전체: companies.length,
    승인대기: companies.filter((c) => c.status === "PENDING").length,
    승인완료: companies.filter((c) => c.status === "ACTIVE").length,
    정지: companies.filter((c) => c.status === "SUSPENDED").length,
    반려: companies.filter((c) => c.status === "REJECTED").length,
  };

  return (
    <AdminLayout activeMenu="members-companies">
      <MemberTabs />
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
            <span className="admin-filter-label">유형</span>
            <div className="admin-filter-tabs">
              {["전체", "매장", "기업", "기업+매장"].map((t) => (
                <button key={t} className={`admin-filter-tab ${typeFilter === t ? "active" : ""}`}
                  onClick={() => { setTypeFilter(t); setPage(1); }}>{t}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">승인상태</span>
            <div className="admin-filter-tabs">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}>
                  {s}
                  {s === "승인대기" && counts.승인대기 > 0 && (
                    <span className="admin-filter-count">{counts.승인대기}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">가입일</span>
            <div className="admin-filter-tabs">
              {["전체", "오늘"].map((d) => {
                const val = d === "오늘" ? "today" : "전체";
                return (
                  <button key={d} className={`admin-filter-tab ${dateFilter === val ? "active" : ""}`}
                    onClick={() => { setDateFilter(val); setPage(1); }}>{d}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>총 <strong>{filtered.length}</strong>개사</span>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: selectedIds.length ? "#e74c3c" : "#ededed",
              color: selectedIds.length ? "#fff" : "#aaa",
              fontSize: 13, fontWeight: 600,
              cursor: selectedIds.length ? "pointer" : "default",
            }}
          >
            <Trash2 size={15} /> 선택 삭제{selectedIds.length ? ` (${selectedIds.length})` : ""}
          </button>
        </div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} style={{ cursor: "pointer" }} />
                </th>
                <th>가입일</th>
                <th>기업명</th>
                <th>유형</th>
                <th>이메일</th>
                <th>연락처</th>
                <th>사업자번호</th>
                <th>사업자등록증</th>
                <th>공고</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} style={{ background: selectedIds.includes(c.id) ? "#faf5ff" : undefined }}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleOne(c.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                  <td className="admin-td-brand">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "#5f0080", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {(() => {
                          const cover = Array.isArray(c.cover_images) && c.cover_images[0]?.url ? c.cover_images[0].url : null;
                          const img = c.logo_url || (c.company_type === "STORE" ? cover : null);
                          return img ? (
                            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            c.company_name?.[0] || "·"
                          );
                        })()}
                      </div>
                      <Link href={`/admin/jobs?search=${encodeURIComponent(c.company_name || "")}`}
                        style={{ color: "#5f0080", textDecoration: "none", fontWeight: 600 }}>
                        {c.company_name}
                      </Link>
                    </div>
                  </td>
                  <td className="admin-td-date">{TYPE_LABEL[c.company_type] || c.company_type}</td>
                  <td className="admin-td-date">{c.email}</td>
                  <td className="admin-td-date">{c.phone || "-"}</td>
                  <td className="admin-td-date">{c.business_number || "-"}</td>
                  <td>
                    {c.business_license_url ? (
                      <button
                        onClick={() => setPreviewUrl(c.business_license_url)}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        등록증 보기
                      </button>
                    ) : (
                      <span style={{ color: "#bbb", fontSize: 13 }}>미제출</span>
                    )}
                  </td>
                  <td className="admin-td-date">{c.job_count}건</td>
                  <td>
                    <select
                      className={`admin-status-select admin-status-${
                        c.status === "ACTIVE" ? "success" :
                        c.status === "PENDING" ? "warning" : "danger"
                      }`}
                      value={STATUS_TO_LABEL[c.status]}
                      onChange={(e) => {
                        const label = e.target.value;
                        const key = Object.keys(STATUS_TO_LABEL).find((k) => STATUS_TO_LABEL[k] === label);
                        if (key) changeStatus(c.id, key);
                      }}
                    >
                      <option value="승인대기">승인대기</option>
                      <option value="승인완료">승인완료</option>
                      <option value="정지">정지</option>
                      <option value="반려">반려</option>
                    </select>
                  </td>
                </tr>
              ))}
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

      {/* 사업자등록증 미리보기 모달 */}
      {previewUrl && (
        <div className="admin-modal-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="admin-modal" style={{ maxWidth: 760, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">사업자등록증</h2>
              <button className="admin-modal-close" onClick={() => setPreviewUrl(null)}><X size={20} /></button>
            </div>
            <div style={{ maxHeight: "75vh", overflow: "auto", padding: 16, background: "#f3f3f3" }}>
              {isPdf(previewUrl) ? (
                <iframe src={previewUrl} title="사업자등록증" style={{ width: "100%", height: "72vh", border: "none", background: "#fff", borderRadius: 6 }} />
              ) : (
                <img src={previewUrl} alt="사업자등록증" style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }} />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid #ececec" }}>
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#5f0080", fontWeight: 600 }}>
                새 탭에서 열기 ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
export default function AdminCompaniesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#888" }}>불러오는 중...</div>}>
      <AdminCompaniesContent />
    </Suspense>
  );
}