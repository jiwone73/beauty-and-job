"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Users, BookmarkCheck, TrendingUp,
  Search, FileText, Bell, LogOut, Settings, Plus, X
} from "lucide-react";
import Link from "next/link";

function CompanyLayout({ children, activePage }: { children: React.ReactNode; activePage: string }) {
  const router = useRouter();
  const NAV = [
    { id: "dashboard", label: "대시보드", icon: Briefcase, href: "/company/dashboard" },
    { id: "jobs", label: "채용공고 관리", icon: FileText, href: "/company/dashboard/jobs" },
    { id: "applicants", label: "지원자 관리", icon: Users, href: "/company/dashboard/applicants" },
    { id: "settings", label: "기업 정보", icon: Settings, href: "/company/dashboard/settings" },
  ];
  const PAGE_TITLES: Record<string, string> = {
    dashboard: "대시보드", jobs: "채용공고 관리",
    applicants: "지원자 관리", settings: "기업 정보",
  };
  return (
    <div className="company-layout">
      <aside className="company-sidebar">
        <div className="company-sidebar-logo">
          <Link href="/company/dashboard" className="company-logo-link">
            <div className="company-logo-avatar">{COMPANY.name.slice(0,1)}</div>
            <div className="company-logo-info">
              <span className="company-logo-name">{COMPANY.name}</span>
              <span className="company-logo-category">{COMPANY.category}</span>
            </div>
          </Link>
        </div>
        <nav className="company-nav">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href}
              className={`company-nav-item ${activePage === item.id ? "active" : ""}`}>
              <item.icon size={20} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="company-sidebar-bottom">
          <button className="company-nav-item" onClick={() => router.push("/")}>
            <LogOut size={20} /><span>사이트로 이동</span>
          </button>
        </div>
      </aside>
      <div className="company-main">
        <header className="company-header">
          <h1 className="company-page-title">{PAGE_TITLES[activePage]}</h1>
          <div className="company-header-right">
            <button className="company-header-btn"><Bell size={18} /><span className="company-notif-dot" /></button>
            <div className="company-profile">
              <div className="company-avatar">{COMPANY.name.slice(0,1)}</div>
              <span className="company-name">{COMPANY.name}</span>
            </div>
          </div>
        </header>
        <main className="company-content">{children}</main>
      </div>
    </div>
  );
}

const APPLICANTS = [
  { id: 1, name: "김지수", age: 28, gender: "여", job: "디지털 마케팅 매니저", career: "경력 3년", location: "서울 강남구", date: "2025.01.20", viewed: false, scrapped: false, status: "검토중" },
  { id: 2, name: "박민준", age: 31, gender: "남", job: "MD - 색조 카테고리", career: "경력 5년", location: "서울 종로구", date: "2025.01.20", viewed: true, scrapped: true, status: "면접예정" },
  { id: 3, name: "최유나", age: 29, gender: "여", job: "디지털 마케팅 매니저", career: "경력 4년", location: "서울 마포구", date: "2025.01.19", viewed: false, scrapped: false, status: "검토중" },
  { id: 4, name: "이수진", age: 26, gender: "여", job: "SCM 물류 담당자", career: "신입", location: "경기 성남시", date: "2025.01.19", viewed: true, scrapped: false, status: "불합격" },
  { id: 5, name: "정다은", age: 27, gender: "여", job: "MD - 색조 카테고리", career: "경력 2년", location: "서울 성동구", date: "2025.01.18", viewed: false, scrapped: true, status: "검토중" },
];

const STATUS_COLOR: Record<string, string> = {
  "검토중": "company-badge-warning",
  "면접예정": "company-badge-info",
  "합격": "company-badge-success",
  "불합격": "company-badge-danger",
};

export default function CompanyApplicantsPage() {
  const [applicants, setApplicants] = useState(APPLICANTS);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [selected, setSelected] = useState<typeof APPLICANTS[0] | null>(null);

  const jobs = ["전체", ...Array.from(new Set(APPLICANTS.map(a => a.job)))];

  const filtered = applicants.filter(a => {
    const matchSearch = !search || a.name.includes(search);
    const matchJob = jobFilter === "전체" || a.job === jobFilter;
    const matchStatus = statusFilter === "전체" || a.status === statusFilter;
    return matchSearch && matchJob && matchStatus;
  });

  const toggleScrap = (id: number) => {
    setApplicants(applicants.map(a => a.id === id ? { ...a, scrapped: !a.scrapped } : a));
  };

  return (
    <CompanyLayout activePage="applicants">
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="지원자 이름 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">공고</span>
            <select className="admin-form-select" style={{fontSize:"13px", padding:"8px 12px"}}
              value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
              {jobs.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">상태</span>
            <div className="admin-filter-tabs">
              {["전체", "검토중", "면접예정", "합격", "불합격"].map(s => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="company-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>명</div>
        <table className="company-table">
          <thead>
            <tr><th>지원일</th><th>이름</th><th>지원공고</th><th>경력</th><th>지역</th><th>열람</th><th>상태</th><th>관리</th></tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="company-td-sub">{a.date}</td>
                <td>
                  <span className="company-td-name" style={{cursor:"pointer", color:"#5f0080"}}
                    onClick={() => setSelected(a)}>{a.name}</span>
                  <div style={{fontSize:"11px", color:"#aaa"}}>{a.gender} · {a.age}세</div>
                </td>
                <td className="company-td-sub">{a.job}</td>
                <td className="company-td-sub">{a.career}</td>
                <td className="company-td-sub">{a.location}</td>
                <td>
                  <span className={`company-badge ${a.viewed ? "viewed" : "new"}`}>
                    {a.viewed ? "열람" : "미열람"}
                  </span>
                </td>
                <td>
                  <select className={`admin-status-select admin-status-${
                    a.status === "합격" ? "success" :
                    a.status === "검토중" ? "warning" :
                    a.status === "면접예정" ? "info" : "danger"
                  }`}
                    value={a.status}
                    onChange={(e) => setApplicants(applicants.map(x => x.id === a.id ? {...x, status: e.target.value} : x))}>
                    {["검토중", "면접예정", "합격", "불합격"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <div style={{display:"flex", gap:"6px"}}>
                    <button className="company-action-btn" onClick={() => setSelected(a)}>
                      <FileText size={14} /> 이력서
                    </button>
                    <button className={`company-action-btn ${a.scrapped ? "scrapped" : "secondary"}`}
                      onClick={() => toggleScrap(a.id)}>
                      {a.scrapped ? "★" : "☆"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 지원자 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"500px"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">{selected.name}</h2>
                <p style={{fontSize:"13px", color:"#888", margin:"4px 0 0"}}>{selected.job}</p>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["성별/나이", `${selected.gender} · ${selected.age}세`],
                  ["경력", selected.career],
                  ["지역", selected.location],
                  ["지원일", selected.date],
                  ["상태", selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                <button className="company-primary-btn">
                  <FileText size={15} /> 이력서 보기
                </button>
                <button className={`company-action-btn ${selected.scrapped ? "scrapped" : "secondary"}`}
                  onClick={() => toggleScrap(selected.id)}>
                  {selected.scrapped ? "★ 스크랩 해제" : "☆ 스크랩"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
