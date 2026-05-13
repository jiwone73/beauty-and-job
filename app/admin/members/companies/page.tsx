"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import MemberTabs from "@/components/admin/MemberTabs";
import { Search, Download, Trash2, X } from "lucide-react";

const COMPANIES = [
  { id: 1, name: "(주)올리브영", ceo: "이선정", email: "hr@oliveyoung.com", phone: "02-1234-5678", bizNo: "123-45-67890", size: "1000명+", category: "리테일", date: "2025.01.20", status: "정상", jobs: 12, lastLogin: "2025.01.19",
    brand: { intro: "국내 최대 H&B 스토어. 다양한 뷰티 브랜드의 판매 플랫폼.", tags: ["리테일", "오프라인", "온라인"], location: "서울 중구", logo: null } },
  { id: 2, name: "(주)아모레퍼시픽", ceo: "김승환", email: "recruit@amorepacific.com", phone: "02-2345-6789", bizNo: "234-56-78901", size: "1000명+", category: "화장품 브랜드", date: "2025.01.18", status: "정상", jobs: 8, lastLogin: "2025.01.17",
    brand: { intro: "대한민국 대표 뷰티 기업. 설화수, 헤라, 이니스프리 등 다수 브랜드 운영.", tags: ["스킨케어", "색조", "글로벌"], location: "서울 용산구", logo: null } },
  { id: 3, name: "(주)LG생활건강", ceo: "이정애", email: "hr@lgcare.com", phone: "02-3456-7890", bizNo: "345-67-89012", size: "1000명+", category: "화장품 브랜드", date: "2025.01.15", status: "정상", jobs: 5, lastLogin: "2025.01.14",
    brand: { intro: "더후, 숨, 오휘 등 프리미엄 뷰티 브랜드를 보유한 종합 생활용품 기업.", tags: ["스킨케어", "프리미엄", "글로벌"], location: "서울 종로구", logo: null } },
  { id: 4, name: "(주)에이피알", ceo: "김병훈", email: "hr@apr.com", phone: "02-4567-8901", bizNo: "456-78-90123", size: "300명+", category: "화장품 브랜드", date: "2025.01.10", status: "정상", jobs: 9, lastLogin: "2025.01.09",
    brand: { intro: "메디큐브, 에이프릴스킨 등 멀티 브랜드 운영 기업.", tags: ["멀티브랜드", "글로벌", "D2C"], location: "서울 강남구", logo: null } },
  { id: 5, name: "(주)코스맥스", ceo: "이경수", email: "hr@cosmax.com", phone: "02-5678-9012", bizNo: "567-89-01234", size: "1000명+", category: "ODM", date: "2025.01.08", status: "휴면", jobs: 0, lastLogin: "2024.09.01",
    brand: { intro: "글로벌 화장품 ODM 1위 기업.", tags: ["ODM", "제조", "글로벌"], location: "서울 중구", logo: null } },
];

const MOCK_JOBS: Record<number, {title: string; date: string; status: string}[]> = {
  1: [
    { title: "디지털 마케팅 매니저", date: "2025.01.20", status: "진행중" },
    { title: "MD - 색조 카테고리", date: "2025.01.15", status: "진행중" },
    { title: "SCM 물류 담당자", date: "2025.01.10", status: "마감" },
  ],
  2: [
    { title: "글로벌 브랜드 마케터", date: "2025.01.18", status: "진행중" },
    { title: "디지털 콘텐츠 기획자", date: "2025.01.12", status: "마감" },
  ],
};

type Company = typeof COMPANIES[0];

export default function AdminCompaniesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [companies, setCompanies] = useState(COMPANIES);
  const [selected, setSelected] = useState<Company | null>(null);
  const [detailTab, setDetailTab] = useState<"account" | "brand" | "jobs">("account");
  const [checked, setChecked] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [editBrand, setEditBrand] = useState(false);
  const PER_PAGE = 10;

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.includes(search) || c.email.includes(search) || c.bizNo.includes(search);
    const matchStatus = statusFilter === "전체" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleCheck = (id: number) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(c => c.id));
  const handleBulkDelete = () => {
    if (!checked.length) return;
    if (confirm(`${checked.length}개사를 삭제하시겠습니까?`)) {
      setCompanies(companies.filter(c => !checked.includes(c.id)));
      setChecked([]);
    }
  };
  const toggleStatus = (id: number) => {
    setCompanies(companies.map(c => {
      if (c.id !== id) return c;
      return { ...c, status: c.status === "정상" ? "휴면" : "정상" };
    }));
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: prev.status === "정상" ? "휴면" : "정상" } : null);
    }
  };

  const counts = {
    전체: companies.length,
    정상: companies.filter(c => c.status === "정상").length,
    휴면: companies.filter(c => c.status === "휴면").length,
  };

  return (
    <AdminLayout activeMenu="members">
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
            <span className="admin-filter-label">계정상태</span>
            <div className="admin-filter-tabs">
              {["전체", "정상", "휴면"].map((s) => (
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

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>개사</div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{width:"36px"}}>
                <input type="checkbox"
                  checked={checked.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              <th>가입일</th>
              <th>기업명</th>
              <th>카테고리</th>
              <th>이메일</th>
              <th>연락처</th>
              <th>사업자번호</th>
              <th>규모</th>
              <th>공고</th>
              <th>최근 로그인</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((c) => (
              <tr key={c.id} style={{background: checked.includes(c.id) ? "#faf5ff" : "", cursor:"pointer"}}
                onClick={() => { setSelected(c); setDetailTab("account"); setEditBrand(false); }}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={checked.includes(c.id)} onChange={() => toggleCheck(c.id)} />
                </td>
                <td className="admin-td-date">{c.date}</td>
                <td className="admin-td-brand">{c.name}</td>
                <td className="admin-td-date">{c.category}</td>
                <td className="admin-td-date">{c.email}</td>
                <td className="admin-td-date">{c.phone}</td>
                <td className="admin-td-date">{c.bizNo}</td>
                <td className="admin-td-date">{c.size}</td>
                <td className="admin-td-date">{c.jobs}건</td>
                <td className="admin-td-date">{c.lastLogin}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {c.status === "탈퇴" ? (
                    <span className="admin-badge admin-badge-danger">탈퇴</span>
                  ) : (
                    <div className="admin-toggle-wrap">
                      <label className="admin-toggle">
                        <input type="checkbox" checked={c.status === "정상"} onChange={() => toggleStatus(c.id)} />
                        <span className="admin-toggle-slider" />
                      </label>
                      <span className={`admin-toggle-label ${c.status === "정상" ? "on" : "off"}`}>{c.status}</span>
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

      {/* 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"600px"}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">{selected.name}</h2>
                <span className="admin-td-date" style={{fontSize:"12px"}}>{selected.category}</span>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>

            {/* 모달 내 탭 */}
            <div className="admin-modal-tabs">
              {(["account", "brand", "jobs"] as const).map((tab) => (
                <button key={tab}
                  className={`admin-modal-tab ${detailTab === tab ? "active" : ""}`}
                  onClick={() => setDetailTab(tab)}>
                  {tab === "account" ? "계정 정보" : tab === "brand" ? "브랜드 정보" : `채용공고 ${selected.jobs}건`}
                </button>
              ))}
            </div>

            <div className="admin-modal-body">
              {/* 계정 정보 */}
              {detailTab === "account" && (
                <>
                  <div className="admin-detail-grid">
                    {[
                      ["기업명", selected.name], ["대표자", selected.ceo],
                      ["이메일", selected.email], ["연락처", selected.phone],
                      ["사업자번호", selected.bizNo], ["기업규모", selected.size],
                      ["가입일", selected.date], ["최근 로그인", selected.lastLogin],
                    ].map(([label, value]) => (
                      <div key={label} className="admin-detail-row">
                        <span className="admin-detail-label">{label}</span>
                        <span className="admin-detail-value">{value}</span>
                      </div>
                    ))}
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">상태</span>
                      <div className="admin-toggle-wrap">
                        <label className="admin-toggle">
                          <input type="checkbox" checked={selected.status === "정상"}
                            onChange={() => toggleStatus(selected.id)} />
                          <span className="admin-toggle-slider" />
                        </label>
                        <span className={`admin-toggle-label ${selected.status === "정상" ? "on" : "off"}`}>
                          {selected.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="admin-modal-actions">
                    <button className="admin-danger-btn" onClick={() => {
                      if (confirm("삭제하시겠습니까?")) {
                        setCompanies(companies.filter(c => c.id !== selected.id));
                        setSelected(null);
                      }
                    }}><Trash2 size={15} /> 삭제</button>
                  </div>
                </>
              )}

              {/* 브랜드 정보 */}
              {detailTab === "brand" && (
                <div>
                  <div className="admin-brand-logo-row">
                    <div className="admin-brand-logo">
                      {selected.name.slice(0, 2)}
                    </div>
                    <div>
                      <strong style={{fontSize:"15px"}}>{selected.name}</strong>
                      <p style={{fontSize:"12px", color:"#888", margin:"2px 0 0"}}>{selected.brand.location}</p>
                    </div>
                  </div>
                  <div className="admin-detail-grid" style={{marginTop:"16px"}}>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">소개</span>
                      <span className="admin-detail-value" style={{fontSize:"13px", lineHeight:"1.6"}}>{selected.brand.intro}</span>
                    </div>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">태그</span>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {selected.brand.tags.map(t => (
                          <span key={t} className="admin-badge admin-badge-neutral">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="admin-detail-row">
                      <span className="admin-detail-label">위치</span>
                      <span className="admin-detail-value">{selected.brand.location}</span>
                    </div>
                  </div>
                  <div className="admin-modal-actions">
                    <button className="admin-primary-btn" onClick={() => alert("브랜드 정보 수정은 다음 업데이트에서 구현됩니다.")}>
                      브랜드 정보 수정
                    </button>
                  </div>
                </div>
              )}

              {/* 채용공고 */}
              {detailTab === "jobs" && (
                <div>
                  {(MOCK_JOBS[selected.id] || []).length === 0 ? (
                    <div className="admin-empty">등록된 채용공고가 없습니다.</div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr><th>공고명</th><th>등록일</th><th>상태</th></tr>
                      </thead>
                      <tbody>
                        {(MOCK_JOBS[selected.id] || []).map((job, i) => (
                          <tr key={i}>
                            <td className="admin-td-title">{job.title}</td>
                            <td className="admin-td-date">{job.date}</td>
                            <td>
                              <span className={`admin-badge ${job.status === "진행중" ? "admin-badge-success" : "admin-badge-neutral"}`}>
                                {job.status}
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
