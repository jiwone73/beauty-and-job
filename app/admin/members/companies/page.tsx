"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
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
const JOB_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "진행중",
  DRAFT: "승인대기",
  HIDDEN: "반려",
  CLOSED: "마감",
  EXPIRED: "만료",
};
const STATUS_OPTIONS = ["전체", "승인대기", "승인완료", "정지", "반려"];

type Job = { title: string; status: string; created_at: string };
type Company = {
  id: string;
  company_name: string;
  brand_name: string | null;
  business_number: string | null;
  company_type: string;
  email: string;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  address: string | null;
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

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [selected, setSelected] = useState<Company | null>(null);
  const [detailTab, setDetailTab] = useState<"account" | "brand" | "jobs">("account");
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
    if (selected?.id === id) setSelected((p) => (p ? { ...p, status: newStatus } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 기업을 삭제하시겠습니까? 등록된 공고·지원 내역도 함께 삭제됩니다.")) return;
    await fetch(`/api/admin/companies?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
  };

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.company_name?.includes(search) || c.email?.includes(search) || (c.business_number || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[c.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

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
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>개사</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>가입일</th>
                <th>기업명</th>
                <th>유형</th>
                <th>이메일</th>
                <th>연락처</th>
                <th>사업자번호</th>
                <th>공고</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} style={{cursor:"pointer"}}
                  onClick={() => { setSelected(c); setDetailTab("account"); }}>
                  <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                  <td className="admin-td-brand">{c.company_name}</td>
                  <td className="admin-td-date">{TYPE_LABEL[c.company_type] || c.company_type}</td>
                  <td className="admin-td-date">{c.email}</td>
                  <td className="admin-td-date">{c.phone || "-"}</td>
                  <td className="admin-td-date">{c.business_number || "-"}</td>
                  <td className="admin-td-date">{c.job_count}건</td>
                  <td onClick={(e) => e.stopPropagation()}>
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

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"600px"}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">{selected.company_name}</h2>
                <span className="admin-td-date" style={{fontSize:"12px"}}>{TYPE_LABEL[selected.company_type] || selected.company_type}</span>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>

            <div className="admin-modal-tabs">
              {(["account", "brand", "jobs"] as const).map((tab) => (
                <button key={tab}
                  className={`admin-modal-tab ${detailTab === tab ? "active" : ""}`}
                  onClick={() => setDetailTab(tab)}>
                  {tab === "account" ? "계정 정보" : tab === "brand" ? "브랜드 정보" : `채용공고 ${selected.job_count}건`}
                </button>
              ))}
            </div>

            <div className="admin-modal-body">
              {detailTab === "account" && (
                <>
                  <div className="admin-detail-grid">
                    {[
                      ["기업명", selected.company_name],
                      ["브랜드명", selected.brand_name || "-"],
                      ["이메일", selected.email],
                      ["연락처", selected.phone || "-"],
                      ["사업자번호", selected.business_number || "-"],
                      ["유형", TYPE_LABEL[selected.company_type] || selected.company_type],
                      ["가입일", fmtDate(selected.created_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="admin-detail-row">
                        <span className="admin-detail-label">{label}</span>
                        <span className="admin-detail-value">{value}</span>
                      </div>
                    ))}
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">상태</span>
                      <select
                        className={`admin-status-select admin-status-${
                          selected.status === "ACTIVE" ? "success" :
                          selected.status === "PENDING" ? "warning" : "danger"
                        }`}
                        value={STATUS_TO_LABEL[selected.status]}
                        onChange={(e) => {
                          const label = e.target.value;
                          const key = Object.keys(STATUS_TO_LABEL).find((k) => STATUS_TO_LABEL[k] === label);
                          if (key) changeStatus(selected.id, key);
                        }}
                      >
                        <option value="승인대기">승인대기</option>
                        <option value="승인완료">승인완료</option>
                        <option value="정지">정지</option>
                        <option value="반려">반려</option>
                      </select>
                    </div>
                  </div>
                  <div className="admin-modal-actions">
                    <button className="admin-danger-btn" onClick={() => handleDelete(selected.id)}>
                      <Trash2 size={15} /> 삭제
                    </button>
                  </div>
                </>
              )}

              {detailTab === "brand" && (
                <div>
                  <div className="admin-brand-logo-row">
                    <div className="admin-brand-logo">
                      {selected.logo_url
                        ? <img src={selected.logo_url} alt="" style={{width:"100%", height:"100%", objectFit:"cover", borderRadius:"8px"}} />
                        : selected.company_name.slice(0, 2)}
                    </div>
                    <div>
                      <strong style={{fontSize:"15px"}}>{selected.brand_name || selected.company_name}</strong>
                      <p style={{fontSize:"12px", color:"#888", margin:"2px 0 0"}}>{selected.address || "주소 미등록"}</p>
                    </div>
                  </div>
                  <div className="admin-detail-grid" style={{marginTop:"16px"}}>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">소개</span>
                      <span className="admin-detail-value" style={{fontSize:"13px", lineHeight:"1.6"}}>{selected.description || "등록된 소개가 없습니다."}</span>
                    </div>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">웹사이트</span>
                      <span className="admin-detail-value">
                        {selected.website_url
                          ? <a href={selected.website_url} target="_blank" rel="noreferrer" style={{color:"#5f0080"}}>{selected.website_url}</a>
                          : "-"}
                      </span>
                    </div>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">주소</span>
                      <span className="admin-detail-value">{selected.address || "-"}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === "jobs" && (
                <div>
                  {(!selected.jobs || selected.jobs.length === 0) ? (
                    <div className="admin-empty">등록된 채용공고가 없습니다.</div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr><th>공고명</th><th>등록일</th><th>상태</th></tr>
                      </thead>
                      <tbody>
                        {selected.jobs.map((job, i) => (
                          <tr key={i}>
                            <td className="admin-td-title">{job.title}</td>
                            <td className="admin-td-date">{fmtDate(job.created_at)}</td>
                            <td>
                              <span className={`admin-badge ${job.status === "ACTIVE" ? "admin-badge-success" : "admin-badge-neutral"}`}>
                                {JOB_STATUS_LABEL[job.status] || job.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}