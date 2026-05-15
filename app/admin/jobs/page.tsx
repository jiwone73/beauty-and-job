"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search, Plus, Download, Trash2, X } from "lucide-react";
import Link from "next/link";

const INIT_JOBS = [
  { id: 1, jobGroup: "기업", company: "올리브영", title: "디지털 마케팅 매니저", category: "마케팅", career: "경력 3-5년", region: "국내", date: "2025.01.20", views: 0, status: "승인대기" },
  { id: 2, jobGroup: "기업", company: "아모레퍼시픽", title: "글로벌 브랜드 마케터 (설화수)", category: "마케팅", career: "경력 5년+", region: "국내·해외", date: "2025.01.20", views: 234, status: "승인완료" },
  { id: 3, jobGroup: "기업", company: "LG생활건강", title: "e커머스 MD (CNP)", category: "MD", career: "경력 2-4년", region: "국내", date: "2025.01.19", views: 187, status: "승인완료" },
  { id: 4, jobGroup: "매장", company: "코스맥스", title: "화장품 연구원 (제형 개발)", category: "연구개발", career: "경력 3년+", region: "경기", date: "2025.01.19", views: 0, status: "반려" },
  { id: 5, jobGroup: "매장", company: "에이피알", title: "퍼포먼스 마케터 (메디큐브)", category: "마케팅", career: "경력 2-5년", region: "국내", date: "2025.01.18", views: 0, status: "승인대기" },
  { id: 6, jobGroup: "기업", company: "달바", title: "유럽 수출 영업 담당자", category: "영업", career: "경력 3년+", region: "유럽", date: "2025.01.18", views: 156, status: "승인완료" },
  { id: 7, jobGroup: "기업", company: "닥터자르트", title: "브랜드 콘텐츠 기획자", category: "마케팅", career: "경력 2-4년", region: "국내", date: "2025.01.17", views: 98, status: "승인완료" },
  { id: 8, jobGroup: "기업", company: "아누아", title: "인플루언서 마케팅 매니저", category: "마케팅", career: "경력 1-3년", region: "국내", date: "2025.01.17", views: 312, status: "승인완료" },
];

const STATUS_OPTIONS = ["전체", "승인대기", "승인완료", "반려"];

type Job = typeof INIT_JOBS[0];

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState(INIT_JOBS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [jobGroupFilter, setJobGroupFilter] = useState("전체");
  const [checked, setChecked] = useState<number[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);

  const filtered = jobs.filter((j) => {
    const matchGroup = jobGroupFilter === "전체" || j.jobGroup === jobGroupFilter;
    const matchSearch = !search || j.title.includes(search) || j.company.includes(search);
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

  const handleApprove = (id: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: "승인완료" } : j));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: "승인완료" } : null);
  };

  const handleReject = (id: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: "반려" } : j));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: "반려" } : null);
  };

  const handleDelete = (id: number) => {
    if (confirm("삭제하시겠습니까?")) {
      setJobs(jobs.filter(j => j.id !== id));
      setSelected(null);
    }
  };

  const counts = {
    전체: jobs.length,
    승인대기: jobs.filter(j => j.status === "승인대기").length,
    승인완료: jobs.filter(j => j.status === "승인완료").length,
    반려: jobs.filter(j => j.status === "반려").length,
  };

  return (
    <AdminLayout activeMenu="jobs">
      {/* 요약 카드 */}
      <div className="admin-mini-stats">
        {Object.entries(counts).map(([label, count]) => (
          <div key={label} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">건</span></span>
          </div>
        ))}
      </div>

      {/* 툴바 */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="공고명, 기업명 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">유형</span>
            <div className="admin-filter-tabs">
              {["전체", "기업", "매장"].map(g => (
                <button key={g} className={`admin-filter-tab ${jobGroupFilter === g ? "active" : ""}`}
                  onClick={() => setJobGroupFilter(g)}>{g}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">승인상태</span>
            <div className="admin-filter-tabs">
              {STATUS_OPTIONS.map((s) => (
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
        <div style={{display:"flex", gap:"8px"}}>
          {checked.length > 0 && (
            <button className="admin-danger-btn" onClick={handleBulkDelete}>
              <Trash2 size={15} /> 선택삭제 ({checked.length})
            </button>
          )}
          <Link href="/admin/jobs/new" className="admin-primary-btn">
            <Plus size={16} /> 공고 직접 등록
          </Link>
        </div>
      </div>

      {/* 테이블 */}
      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{width:"36px"}}>
                <input type="checkbox"
                  checked={checked.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} />
              </th>
              <th>유형</th>
              <th>기업</th>
              <th>공고명</th>
              <th>직군</th>
              <th>경력</th>
              <th>지역</th>
              <th>등록일</th>
              <th>조회수</th>
              <th>상태</th>
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
                  <span className={`jobs-type-badge ${job.jobGroup === "매장" ? "store" : "corp"}`}>
                    {job.jobGroup === "매장" ? "🏪 매장" : "🏢 기업"}
                  </span>
                </td>
                <td className="admin-td-brand">{job.company}</td>
                <td>
                  <span className="admin-td-title"
                    style={{color:"#5f0080", cursor:"pointer", fontWeight:600}}
                    onClick={() => setSelected(job)}>
                    {job.title}
                  </span>
                </td>
                <td className="admin-td-date">{job.category}</td>
                <td className="admin-td-date">{job.career}</td>
                <td className="admin-td-date">{job.region}</td>
                <td className="admin-td-date">{job.date}</td>
                <td className="admin-td-date">{job.views.toLocaleString()}</td>
                <td>
                  <select
                    className={`admin-status-select admin-status-${
                      job.status === "승인완료" ? "success" :
                      job.status === "승인대기" ? "warning" : "danger"
                    }`}
                    value={job.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
                      if (selected?.id === job.id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
                    }}
                  >
                    <option value="승인대기">승인대기</option>
                    <option value="승인완료">승인완료</option>
                    <option value="반려">반려</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>

      {/* 공고 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{maxWidth:"560px"}} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className="admin-badge admin-badge-neutral" style={{marginBottom:"6px", display:"inline-block"}}>{selected.category}</span>
                <h2 className="admin-modal-title">{selected.title}</h2>
                <p style={{fontSize:"13px", color:"#888", margin:"4px 0 0"}}>{selected.company}</p>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                {[
                  ["기업", selected.company],
                  ["직군", selected.category],
                  ["경력", selected.career],
                  ["지역", selected.region],
                  ["등록일", selected.date],
                  ["조회수", selected.views.toLocaleString() + "회"],
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
                      selected.status === "승인완료" ? "success" :
                      selected.status === "승인대기" ? "warning" : "danger"
                    }`}
                    value={selected.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setJobs(jobs.map(j => j.id === selected.id ? { ...j, status: newStatus } : j));
                      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
                    }}
                  >
                    <option value="승인대기">승인대기</option>
                    <option value="승인완료">승인완료</option>
                    <option value="반려">반려</option>
                  </select>
                </div>
              </div>
              <div className="admin-modal-actions">
                <button className="admin-danger-btn" onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
