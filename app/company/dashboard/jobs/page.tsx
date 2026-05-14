"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Briefcase, Users, FileText, Settings,
  Bell, LogOut, Plus, Search, Eye, Edit, X, Trash2
} from "lucide-react";

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

const INIT_JOBS = [
  { id: 1, title: "디지털 마케팅 매니저", category: "마케팅", career: "경력 3-5년", region: "서울", type: "정규직", deadline: "2025.02.28", applicants: 34, views: 412, status: "진행중", date: "2025.01.10" },
  { id: 2, title: "MD - 색조 카테고리", category: "MD", career: "경력 2-4년", region: "서울", type: "정규직", deadline: "2025.02.15", applicants: 28, views: 287, status: "진행중", date: "2025.01.08" },
  { id: 3, title: "SCM 물류 담당자", category: "SCM", career: "경력 3년+", region: "경기", type: "정규직", deadline: "2025.01.31", applicants: 19, views: 198, status: "진행중", date: "2025.01.05" },
  { id: 4, title: "HR 채용 담당자", category: "HR", career: "경력 2-4년", region: "서울", type: "정규직", deadline: "2025.01.20", applicants: 47, views: 523, status: "마감", date: "2024.12.20" },
  { id: 5, title: "콘텐츠 마케터 (SNS)", category: "마케팅", career: "경력 1-3년", region: "서울", type: "계약직", deadline: "2024.12.31", applicants: 62, views: 891, status: "마감", date: "2024.12.01" },
];

type Job = typeof INIT_JOBS[0];

export default function CompanyJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState(INIT_JOBS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [selected, setSelected] = useState<Job | null>(null);
  const [checked, setChecked] = useState<number[]>([]);

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.includes(search);
    const matchStatus = statusFilter === "전체" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleCheck = (id: number) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(j => j.id));

  const handleBulkDelete = () => {
    if (!checked.length) return;
    if (confirm(`선택한 ${checked.length}건을 삭제하시겠습니까?`)) {
      setJobs(jobs.filter(j => !checked.includes(j.id)));
      setChecked([]);
    }
  };

  const handleClose = (id: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: "마감" } : j));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: "마감" } : null);
  };

  const handleDelete = (id: number) => {
    if (confirm("삭제하시겠습니까?")) {
      setJobs(jobs.filter(j => j.id !== id));
      setSelected(null);
    }
  };

  const counts = {
    전체: jobs.length,
    진행중: jobs.filter(j => j.status === "진행중").length,
    마감: jobs.filter(j => j.status === "마감").length,
  };

  return (
    <CompanyLayout activePage="jobs">
      {/* 요약 카드 */}
      <div className="company-stat-grid">
        {[
          { label: "전체 공고", value: String(counts.전체), unit: "건", color: "#5f0080" },
          { label: "진행중", value: String(counts.진행중), unit: "건", color: "#10b981" },
          { label: "마감", value: String(counts.마감), unit: "건", color: "#888" },
          { label: "총 지원자", value: String(jobs.reduce((s, j) => s + j.applicants, 0)), unit: "명", color: "#0ea5e9" },
        ].map((s) => (
          <div key={s.label} className="company-stat-card">
            <div className="company-stat-value" style={{color: s.color}}>
              {s.value}<span className="company-stat-unit">{s.unit}</span>
            </div>
            <div className="company-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 툴바 */}
      <div className="company-toolbar">
        <div className="company-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">상태</span>
            <div className="admin-filter-tabs">
              {["전체", "진행중", "마감"].map(s => (
                <button key={s} className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}>{s}</button>
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
          <Link href="/company/dashboard/jobs/new" className="company-primary-btn">
            <Plus size={15} /> 공고 등록
          </Link>
        </div>
      </div>

      {/* 테이블 */}
      <div className="company-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="company-table">
          <thead>
            <tr>
              <th style={{width:"36px"}}>
                <input type="checkbox"
                  checked={checked.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              <th>공고명</th>
              <th>직군</th>
              <th>경력</th>
              <th>지역</th>
              <th>고용형태</th>
              <th>마감일</th>
              <th>지원자</th>
              <th>조회수</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id} style={{background: checked.includes(job.id) ? "#faf5ff" : ""}}>
                <td>
                  <input type="checkbox"
                    checked={checked.includes(job.id)}
                    onChange={() => toggleCheck(job.id)} />
                </td>
                <td>
                  <span style={{color:"#5f0080", fontWeight:600, cursor:"pointer"}}
                    onClick={() => setSelected(job)}>
                    {job.title}
                  </span>
                </td>
                <td className="company-td-sub">{job.category}</td>
                <td className="company-td-sub">{job.career}</td>
                <td className="company-td-sub">{job.region}</td>
                <td className="company-td-sub">{job.type}</td>
                <td className="company-td-sub">{job.deadline}</td>
                <td>
                  <Link href="/company/dashboard/applicants"
                    className="company-action-btn" style={{fontSize:"12px"}}>
                    <Users size={13} /> {job.applicants}명
                  </Link>
                </td>
                <td className="company-td-sub">{job.views.toLocaleString()}</td>
                <td>
                  <span className={`company-badge ${job.status === "진행중" ? "active" : "closed"}`}>
                    {job.status}
                  </span>
                </td>
                <td>
                  <div style={{display:"flex", gap:"6px"}}>
                    {job.status === "진행중" && (
                      <button className="company-action-btn secondary"
                        onClick={() => handleClose(job.id)}>마감</button>
                    )}
                    <button className="company-action-btn"
                      onClick={() => router.push("/company/dashboard/jobs/new")}>
                      <Edit size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="admin-empty">등록된 공고가 없습니다.</div>}
      </div>

      {/* 공고 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"520px"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="admin-badge admin-badge-neutral" style={{marginBottom:"6px", display:"inline-block"}}>
                  {selected.category}
                </span>
                <h2 className="admin-modal-title">{selected.title}</h2>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["직군", selected.category],
                  ["경력", selected.career],
                  ["지역", selected.region],
                  ["고용형태", selected.type],
                  ["마감일", selected.deadline],
                  ["등록일", selected.date],
                  ["지원자", `${selected.applicants}명`],
                  ["조회수", `${selected.views.toLocaleString()}회`],
                  ["상태", selected.status],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
              </div>
              <div className="admin-modal-actions">
                <Link href="/company/dashboard/applicants" className="company-primary-btn">
                  <Users size={15} /> 지원자 보기
                </Link>
                <button className="company-action-btn"
                  onClick={() => router.push("/company/dashboard/jobs/new")}>
                  <Edit size={15} /> 수정
                </button>
                {selected.status === "진행중" && (
                  <button className="company-action-btn secondary"
                    onClick={() => handleClose(selected.id)}>마감 처리</button>
                )}
                <button className="admin-danger-btn" onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
