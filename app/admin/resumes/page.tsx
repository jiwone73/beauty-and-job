"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeTabs from "@/components/admin/ResumeTabs";
import { Search, Trash2 } from "lucide-react";

const DEGREE_LABEL: Record<string, string> = {
  HIGH_SCHOOL: "고등학교",
  COLLEGE: "전문대(2·3년제)",
  UNIVERSITY: "대학교(4년제)",
  MASTER: "대학원(석사)",
  DOCTOR: "대학원(박사)",
  ETC: "기타",
};
const GRAD_LABEL: Record<string, string> = {
  GRADUATED: "졸업",
  ENROLLED: "재학",
  DROPPED: "중퇴",
  EXPECTED: "졸업예정",
};
const CAREER_LABEL: Record<string, string> = {
  NEW: "신입",
  EXPERIENCED: "경력",
};

type Resume = {
  id: string;
  title: string | null;
  is_public: boolean;
  status: string;
  desired_location: string | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  desired_salary_type: string | null;
  career_type: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  birth_date: string | null;
  job_category: string | null;
  skills: string[];
  school_name: string | null;
  degree: string | null;
  graduation_status: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function calcAge(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function genderLabel(g: string | null) {
  if (g === "MALE" || g === "남" || g === "M") return "남";
  if (g === "FEMALE" || g === "여" || g === "F") return "여";
  return g || "-";
}

function salaryLabel(r: Resume) {
  if (r.desired_salary_type === "NEGOTIABLE" || (!r.desired_salary_min && !r.desired_salary_max)) return "회사내규";
  const fmt = (n: number | null) => (n == null ? "" : n.toLocaleString());
  if (r.desired_salary_min && r.desired_salary_max) return `${fmt(r.desired_salary_min)}~${fmt(r.desired_salary_max)}만원`;
  if (r.desired_salary_min) return `${fmt(r.desired_salary_min)}만원~`;
  return "회사내규";
}

function eduLabel(r: Resume) {
  if (!r.school_name) return "-";
  const deg = DEGREE_LABEL[r.degree || ""] || "";
  const grad = GRAD_LABEL[r.graduation_status || ""] || "";
  return `${deg} ${grad}`.trim() || r.school_name;
}

function isComplete(r: Resume) {
  return r.status === "PUBLISHED";
}

export default function AdminResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [completeFilter, setCompleteFilter] = useState("전체");
  const [publicFilter, setPublicFilter] = useState("전체");
  const [selected, setSelected] = useState<Resume | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resumes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResumes(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const togglePublic = async (r: Resume) => {
    const next = !r.is_public;
    await fetch("/api/admin/resumes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: r.id, is_public: next }),
    });
    setResumes((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_public: next } : x)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 이력서를 삭제하시겠습니까?")) return;
    await fetch(`/api/admin/resumes?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setResumes((prev) => prev.filter((x) => x.id !== id));
    setSelected(null);
  };

  const filtered = resumes.filter((r) => {
    const matchSearch = !search || (r.name || "").includes(search) || (r.title || "").includes(search) || (r.job_category || "").includes(search);
    const matchComplete = completeFilter === "전체" || (completeFilter === "완성" ? isComplete(r) : !isComplete(r));
    const matchPublic = publicFilter === "전체" || (publicFilter === "공개" ? r.is_public : !r.is_public);
    return matchSearch && matchComplete && matchPublic;
  });

  const total = resumes.length;
  const completeCnt = resumes.filter(isComplete).length;
  const publicCnt = resumes.filter((r) => r.is_public).length;
  const femaleCnt = resumes.filter((r) => genderLabel(r.gender) === "여").length;
  const maleCnt = resumes.filter((r) => genderLabel(r.gender) === "남").length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <AdminLayout activeMenu="resumes">
      <ResumeTabs />

      <div className="admin-resume-stat-grid">
        <div className="admin-resume-stat-card main">
          <div className="admin-rsc-label">전체 이력서</div>
          <div className="admin-rsc-value">{total.toLocaleString()}<span className="admin-mini-unit">건</span></div>
          <div className="admin-rsc-subs">
            <span className="admin-rsc-sub green">완성 {completeCnt}</span>
            <span className="admin-rsc-sub blue">공개 {publicCnt}</span>
          </div>
        </div>
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">완성여부</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">완성</span>
              <span className="admin-rsc-split-value green">{completeCnt}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">미완성</span>
              <span className="admin-rsc-split-value orange">{total - completeCnt}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill green" style={{width: `${pct(completeCnt)}%`}} />
          </div>
        </div>
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">공개여부</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">공개</span>
              <span className="admin-rsc-split-value blue">{publicCnt}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">비공개</span>
              <span className="admin-rsc-split-value gray">{total - publicCnt}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill blue" style={{width: `${pct(publicCnt)}%`}} />
          </div>
        </div>
        <div className="admin-resume-stat-card">
          <div className="admin-rsc-label">성별</div>
          <div className="admin-rsc-split">
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">여성</span>
              <span className="admin-rsc-split-value purple">{femaleCnt}</span>
            </div>
            <div className="admin-rsc-divider" />
            <div className="admin-rsc-split-item">
              <span className="admin-rsc-split-label">남성</span>
              <span className="admin-rsc-split-value gray">{maleCnt}</span>
            </div>
          </div>
          <div className="admin-rsc-bar">
            <div className="admin-rsc-bar-fill purple" style={{width: `${pct(femaleCnt)}%`}} />
          </div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="이름, 직군, 이력서 제목 검색"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">완성여부</span>
            <div className="admin-filter-tabs">
              {["전체", "완성", "미완성"].map((f) => (
                <button key={f} className={`admin-filter-tab ${completeFilter === f ? "active" : ""}`}
                  onClick={() => setCompleteFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="admin-filter-group">
            <span className="admin-filter-label">공개여부</span>
            <div className="admin-filter-tabs">
              {["전체", "공개", "비공개"].map((f) => (
                <button key={f} className={`admin-filter-tab ${publicFilter === f ? "active" : ""}`}
                  onClick={() => setPublicFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta">총 <strong>{filtered.length}</strong>건</div>
        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>이력서 정보</th>
                <th>경력</th>
                <th>희망지역</th>
                <th>완성</th>
                <th>공개</th>
                <th>연봉</th>
                <th>학력</th>
                <th>연락처</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const age = calcAge(r.birth_date);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="admin-resume-member">
                        <div className="admin-resume-photo">
                          <span>{(r.name || "?").slice(0, 1)}</span>
                        </div>
                        <div className="admin-resume-member-info">
                          <strong>{r.name}</strong>
                          <span>{genderLabel(r.gender)}{age ? ` · ${age}세` : ""}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{cursor:"pointer"}} onClick={() => setSelected(r)}>
                      <div className="admin-resume-info">
                        <p className="admin-resume-title" style={{color:"#5f0080"}}>{r.title || "(제목 없음)"}</p>
                        <div className="admin-resume-tags">
                          {(r.skills || []).slice(0, 4).map((sk, i) => (
                            <span key={i} className="admin-resume-tag">{sk}</span>
                          ))}
                        </div>
                        <span className="admin-resume-job">{r.job_category || "-"}</span>
                      </div>
                    </td>
                    <td className="admin-td-date">{CAREER_LABEL[r.career_type || ""] || "-"}</td>
                    <td className="admin-td-date">{r.desired_location || "-"}</td>
                    <td>
                      <span className={`admin-badge ${isComplete(r) ? "admin-badge-success" : "admin-badge-warning"}`}>
                        {isComplete(r) ? "완성" : "미완성"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="admin-toggle-wrap">
                        <label className="admin-toggle">
                          <input type="checkbox" checked={r.is_public} onChange={() => togglePublic(r)} />
                          <span className="admin-toggle-slider" />
                        </label>
                        <span className={`admin-toggle-label ${r.is_public ? "on" : "off"}`}>
                          {r.is_public ? "공개" : "비공개"}
                        </span>
                      </div>
                    </td>
                    <td className="admin-td-date">{salaryLabel(r)}</td>
                    <td className="admin-td-date" style={{fontSize:"11px"}}>{eduLabel(r)}</td>
                    <td className="admin-td-date">
                      <div>{r.email}</div>
                      <div>{r.phone || "-"}</div>
                    </td>
                    <td>
                      <button title="삭제" onClick={() => handleDelete(r.id)}
                        style={{color:"#ef4444", background:"none", border:"none", cursor:"pointer"}}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-empty">검색 결과가 없습니다.</div>}
      </div>

      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">이력서 상세</h2>
              <button className="admin-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-resume-modal-profile">
                <div className="admin-resume-photo large">
                  <span>{(selected.name || "?").slice(0, 1)}</span>
                </div>
                <div>
                  <h3>{selected.name} · {genderLabel(selected.gender)}{calcAge(selected.birth_date) ? ` · ${calcAge(selected.birth_date)}세` : ""}</h3>
                  <p>{selected.job_category || "-"} · {CAREER_LABEL[selected.career_type || ""] || "-"}</p>
                </div>
              </div>
              <div className="admin-detail-grid">
                {[
                  ["이력서 제목", selected.title || "-"],
                  ["희망지역", selected.desired_location || "-"],
                  ["희망연봉", salaryLabel(selected)],
                  ["학력", eduLabel(selected)],
                  ["이메일", selected.email],
                  ["연락처", selected.phone || "-"],
                  ["등록일", fmtDate(selected.created_at)],
                  ["완성여부", isComplete(selected) ? "완성" : "미완성"],
                  ["공개여부", selected.is_public ? "공개" : "비공개"],
                ].map(([label, value]) => (
                  <div key={label} className="admin-detail-row">
                    <span className="admin-detail-label">{label}</span>
                    <span className="admin-detail-value">{value}</span>
                  </div>
                ))}
                <div className="admin-detail-row">
                  <span className="admin-detail-label">스킬</span>
                  <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                    {(selected.skills || []).length === 0 ? "-" : selected.skills.map((sk, i) => (
                      <span key={i} className="admin-resume-tag">{sk}</span>
                    ))}
                  </div>
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