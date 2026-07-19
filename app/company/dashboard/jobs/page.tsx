"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Users, Plus, Search, Edit, X, Trash2, Copy, Ban
} from "lucide-react";
import { companyJobsApi } from "@/lib/api/company";
import type { CompanyJob, JobStatus } from "@/lib/types/company";

// === 매핑 헬퍼 ===
const STATUS_LABEL: Record<JobStatus, string> = {
  ACTIVE: "진행중",
  CLOSED: "마감",
  DRAFT: "임시저장",
  PAUSED: "일시중지",
};

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "상시";
  const today = new Date();
  const dl = new Date(deadline);
  const dDay = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (dDay < 0) return "마감";
  if (dDay === 0) return "오늘";
  return `D-${dDay}`;
}

export default function CompanyJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [jobGroupFilter, setJobGroupFilter] = useState("전체");
  const [selected, setSelected] = useState<CompanyJob | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await companyJobsApi.list({ limit: 100 });
      setJobs(res.data);
    } catch (e) {
      console.error("[loadJobs]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filtered = jobs.filter(j => {
    const matchGroup = jobGroupFilter === "전체" ||
      (jobGroupFilter === "기업" && j.job_type === "OFFICE") ||
      (jobGroupFilter === "매장" && j.job_type === "STORE");
    const matchSearch = !search || j.title.includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_LABEL[j.status] === statusFilter;
    return matchGroup && matchSearch && matchStatus;
  });

  const toggleCheck = (id: string) => setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map(j => j.id));

  const handleBulkDelete = async () => {
    if (!checked.length) return;
    if (!confirm(`선택한 ${checked.length}건을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(checked.map(id => companyJobsApi.delete(id)));
      setChecked([]);
      await loadJobs();
    } catch (e) {
      alert("삭제 중 오류가 발생했습니다.");
      console.error("[handleBulkDelete]", e);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm("이 공고를 마감하시겠습니까?")) return;
    try {
      await companyJobsApi.close(id);
      await loadJobs();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      alert("마감 처리 중 오류가 발생했습니다.");
      console.error("[handleClose]", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await companyJobsApi.delete(id);
      await loadJobs();
      setSelected(null);
    } catch (e) {
      alert("삭제 중 오류가 발생했습니다.");
      console.error("[handleDelete]", e);
    }
  };

  const counts = {
    전체: jobs.length,
    진행중: jobs.filter(j => j.status === "ACTIVE").length,
    마감: jobs.filter(j => j.status === "CLOSED").length,
    기업: jobs.filter(j => j.job_type === "OFFICE").length,
    매장: jobs.filter(j => j.job_type === "STORE").length,
  };
  const totalApplicants = jobs.reduce((s, j) => s + (j.application_count || 0), 0);

  return (
    <CompanyLayout activePage="jobs">
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
      {/* 요약 카드 */}
      <div className="company-stat-grid">
        {[
          { label: "전체 공고", value: String(counts.전체), unit: "건", color: "#5f0080" },
          { label: "진행중", value: String(counts.진행중), unit: "건", color: "#10b981" },
          { label: "마감", value: String(counts.마감), unit: "건", color: "#888" },
          { label: "총 지원자", value: String(totalApplicants), unit: "명", color: "#0ea5e9" },
          { label: "기업 공고", value: String(counts.기업), unit: "건", color: "#5f0080" },
          { label: "매장 공고", value: String(counts.매장), unit: "건", color: "#e91e8c" },
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
            <span className="admin-filter-label">유형</span>
            <div className="admin-filter-tabs">
              {["전체", "매장", "기업"].map(g => (
                <button key={g} className={`admin-filter-tab ${jobGroupFilter === g ? "active" : ""}`}
                  onClick={() => setJobGroupFilter(g)}>{g}</button>
              ))}
            </div>
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

      {/* 로딩 */}
      {loading && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && filtered.length === 0 && (
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          {jobs.length === 0
            ? "등록된 공고가 없어요. 첫 공고를 등록해보세요!"
            : "조건에 맞는 공고가 없어요."}
        </div>
      )}

      {/* 테이블 */}
      {!loading && filtered.length > 0 && (
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
                <th>등록일</th>
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
                    <span style={{color:"#1a1a1a", fontWeight:400, cursor:"pointer"}}
                      onClick={() => router.push(`/jobs/${job.id}`)}>
                      {job.title}
                    </span>
                  </td>
                  <td className="company-td-sub">
                    {new Date(job.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="company-td-sub">{formatDeadline(job.deadline)}</td>
                  <td>
                    <Link href={`/company/dashboard/applicants?job_id=${job.id}`}
                      style={{display:"inline-flex", alignItems:"center", gap:4, color:"#5f0080", fontSize:14, fontWeight:500, textDecoration:"none"}}>
                      <Users size={13} /> {job.application_count}명
                    </Link>
                  </td>
                  <td className="company-td-sub">{job.view_count}</td>
                  <td style={{ color: job.status === "ACTIVE" ? "#10b981" : job.status === "CLOSED" ? "#888" : "#f59e0b", fontWeight: 500, fontSize: 14 }}>
                    {STATUS_LABEL[job.status]}
                  </td>
                  <td>
                    <div style={{display:"flex", gap:"6px", justifyContent:"center"}}>
                      {job.status === "ACTIVE" && (
                        <button style={{display:"inline-flex", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:"#888", fontSize:14, fontWeight:500, padding:"2px 4px"}}
                          onClick={() => handleClose(job.id)}><Ban size={13} />마감</button>
                      )}
                      <button style={{display:"inline-flex", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:"#5f0080", fontSize:14, fontWeight:500, padding:"2px 4px"}}
                        onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}>
                        <Edit size={13} />수정
                      </button>
                      <button style={{display:"inline-flex", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:"#5f0080", fontSize:14, fontWeight:500, padding:"2px 4px"}}
                        onClick={() => router.push(`/company/dashboard/jobs/new?copy=${job.id}`)}>
                        <Copy size={13} />복사
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{maxWidth:"520px"}} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <span className={`jobs-type-badge ${selected.job_type === "STORE" ? "store" : "corp"}`}>
                  {selected.job_type === "STORE" ? "🏪 매장" : "🏢 기업"}
                </span>
                <h2 className="admin-modal-title">{selected.title}</h2>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={20} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-modal-info-grid">
                <div><label>마감일</label><span>{formatDeadline(selected.deadline)}</span></div>
                <div><label>지원자</label><span>{selected.application_count}명</span></div>
                <div><label>조회수</label><span>{selected.view_count}회</span></div>
                <div><label>상태</label><span>{STATUS_LABEL[selected.status]}</span></div>
                <div><label>등록일</label><span>{new Date(selected.created_at).toLocaleDateString("ko-KR")}</span></div>
              </div>
              <div style={{display:"flex", gap:"8px", marginTop:"20px", flexWrap:"wrap"}}>
                <Link href={`/company/dashboard/applicants?job_id=${selected.id}`} className="company-primary-btn">
                  <Users size={14} /> 지원자 보기
                </Link>
                <button className="company-action-btn"
                  onClick={() => router.push(`/company/dashboard/jobs/new?id=${selected.id}`)}>
                  <Edit size={14} /> 수정
                </button>
                {selected.status === "ACTIVE" && (
                  <button className="company-action-btn secondary"
                    onClick={() => handleClose(selected.id)}>마감</button>
                )}
                <button className="admin-danger-btn"
                  onClick={() => handleDelete(selected.id)}>
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}